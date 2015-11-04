"use strict";
var express = require('express');
var app = express();
var request = require('request');
var bodyParser = require('body-parser');
var redis = require('redis');
var favicon = require('serve-favicon');
var path = require('path');
var librato = require('librato-node');
var CircuitBreaker = require('circuit-breaker-js');

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(librato.middleware());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(favicon(__dirname + '/public/favicon.ico'));

var client = redis.createClient(process.env.REDIS_URL);

var isEnMaintenance = false;
var breaker = new CircuitBreaker({
    windowDuration: 10000,
    numBuckets: 3,
    volumeThreshold: 2
});

librato.configure({email: 'julian.licette@gmail.com', token: '0956806394fdc9b6a1314500b6d64a15c3623747de80ef21ade0a91a3d599c5d'});
librato.start();

/***************************************************************/

app.get('/', (req, res) => {
    librato.increment('GET /');
    checkBreaker();
    res.render('index');
});

app.get('/pizzas', (req, res) => {
  librato.increment('GET /pizzas');
  checkBreaker();
  getPizzasFromCache(res);
});

app.get('/orders/:id', (req, res) => {
    librato.increment('GET /orders/:id');
    checkBreaker();
    request.get({url: `http://pizzapi.herokuapp.com/orders/${req.params.id}`, timeout: 4000}, (err, result, body ) => {
        if(err) {
          if(err.code === 'ETIMEDOUT') {
            return res.render('timeout');
          }
          return res.send(err);
        }
        console.log(body);
        res.render('order-get', {order: JSON.parse(body)});
    });
});

app.post('/orders', (req, res) => {
    librato.increment('POST /orders');
    checkBreaker();
    function command(success,failed){
        request.post({url: 'http://pizzapi.herokuapp.com/orders', timeout: 4000, body: JSON.stringify({id: parseInt(req.body.id)})}, (err, result, body ) => {
          if(err || result.statusCode == 503){
              console.log('CircuitBreaker: failed');
              failed();
              redirect503(req,res);
              return;
          }
          console.log('CircuitBreaker: success');
          success();
          res.render('order-get', {order: JSON.parse(body)})
        });
    }

    function fallback(){
        console.log('CircuitBreaker: Dans le fallback')
        getPizzasFromCache(res);
    }
    breaker.run(command,fallback);
});

app.use(function(req, res, next){
  res.status(404);
  // respond with html page
  if (req.accepts('html')) {
    redirect404(req,res);
    return;
  }
  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }
  // default to plain-text. send()
  res.type('txt').send('Not found');
});

function redirect404(req,res){
    librato.increment('statusCode.404');
    checkBreaker();
    res.render('404', { url: req.url });
}

function redirect503(req,res){
    librato.increment('statusCode.503');
    checkBreaker();
    res.render('503');
}
function getPizzasFromCache(res) {
    // var timeout = setTimeout( () => {
    // }, 1000);
    client.get("pizzas", (err, reply) => {
        if(err) {
            return;
        }
  		console.log('Redis: Liste des Pizzas récupérées');
        var pizzas = JSON.parse(reply);
        // if(timeout) {
        //     clearTimeout(timeout);
        // }
        res.render('pizzas-get', {pizzas: pizzas, isEnMaintenance: breaker.isOpen()});
    });
}

/*******************************************************************/
app.listen(process.env.PORT || 3000, () => {
  console.log('Listening on port 3000...')
})

var openCount = 0, closedCount = 0;
breaker.onCircuitOpen = function(metrics) {
  console.log('CircuitBreaker: Ouvert ! ', metrics);
  isEnMaintenance = true;
  librato.increment('circuitBreakerIsOpen');
};

breaker.onCircuitClose = function(metrics) {
  console.log('CircuitBreaker: Fermé ! ', metrics);
  isEnMaintenance = false;
  librato.increment('circuitBreakerIsClosed');
};

function checkBreaker(){
    if(breaker.isOpen()){
        librato.measure('circuitBreaker', 0);
    } else {
        librato.measure('circuitBreaker', 1);
    }
}

process.once('SIGINT', function() {
  librato.stop(); // stop optionally takes a callback
});
