"use strics";
var express = require('express');
var app = express();
var request = require('request');
var bodyParser = require('body-parser');
var redis = require('redis');
var favicon = require('serve-favicon');
var path = require('path');
var CircuitBreaker = require('circuit-breaker-js');
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(favicon(__dirname + '/public/favicon.ico'));

var client = redis.createClient();

var isEnMaintenance = false;
var breaker = new CircuitBreaker({
    windowDuration: 100000,
    numBuckets: 10,
    timeoutDuration: 5000,
    errorThreshold: 20,
    volumeThreshold: 2
});

breaker.onCircuitOpen = function(metrics) {
  console.log('CircuitBreaker: Ouvert ! ', metrics);
  isEnMaintenance = true;
};

breaker.onCircuitClose = function(metrics) {
  console.warn('CircuitBreaker: Fermé ! ', metrics);
  isEnMaintenance = false;
};

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/pizzas', (req, res) => {
	getPizzasFromCache(res);
});

app.get('/orders/:id', (req, res) => {
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
    function command(success,failed){
        request.post({url: 'http://pizzapi.herokuapp.com/orders', timeout: 4000, body: JSON.stringify({id: parseInt(req.body.id)})}, (err, result, body ) => {
          if(err || result.statusCode == 503){
              console.log('CircuitBreaker: failed');
              failed();
              res.render('503');
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
    res.render('404', { url: req.url });
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

app.listen(3000, () => {
  console.log('Listening on port 3000...')
})

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
        res.render('pizzas-get', {pizzas: pizzas, isEnMaintenance: isEnMaintenance});
    });
}
