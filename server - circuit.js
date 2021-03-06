"use strics";
var express = require('express');
var app = express();
var request = require('request');
var bodyParser = require('body-parser');
var redis = require('redis');
var favicon = require('serve-favicon');
var path = require('path');
var cbreak = require('circuit-breaker-js');
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(favicon(__dirname + '/public/favicon.ico'));

var client = redis.createClient();
var breaker = new cbreak({
    windowDuration: 300000,
    numBuckets: 3,
    timeoutDuration: 5000
});

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/pizzas', (req, res) => {
	// var timeout = setTimeout( () => {
 //  		client.end();
    // }, 4000);
    client.get("pizzas", (err, reply) => {
        if(err) {
            failed(err);
            return;
        }
  		console.log('PIZZAS FROM REDIS:');
        var pizzas = JSON.parse(reply);
  		console.log(pizzas);
        // if(timeout) {
        //     clearTimeout(timeout);
        // }
        res.render('pizzas-get', {pizzas: pizzas});
    });
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
    function doReq(success,failed){
        request.post({url: 'http://pizzapi.herokuapp.com/orders', timeout: 4000, body: JSON.stringify({id: parseInt(req.body.id)})}, (err, result, body ) => {
          if(err || JSON.parse(body).id === "maintenance"){
              client.get("pizzas", (err, reply) => {
                  if(err) {
                      failed(err);
                      return;
                  }
            	  console.log('PIZZAS FROM REDIS:');
                  var pizzas = JSON.parse(reply);
            	  console.log(pizzas);
                  res.render('pizzas-get', {pizzas: pizzas, isMaint: true});
              });
              return;
          }

          console.log(body);
          success(res.render('order-get', {order: JSON.parse(body)}));
        });
    }

    function fallback(){
        console.log('truc')
        res.render('404');
    }
    breaker.run(doReq,fallback);
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
