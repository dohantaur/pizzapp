"use strics";
var express = require('express');
var app = express();
var request = require('request');
var bodyParser = require('body-parser');
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/pizzas', (req, res) => {
  request.get({url: 'http://pizzapi.herokuapp.com/pizzas', timeout: 4000}, (err, result, body ) => {
    if(err) {
      if(err.code === 'ETIMEDOUT') {
        return res.render('timeout');
      } else {
        return res.send(err);
      }
    }
    console.log(JSON.parse(body));
    res.render('pizzas-get', {data: JSON.parse(body)});
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
  request.post({url: 'http://pizzapi.herokuapp.com/orders', timeout: 4000, body: JSON.stringify({id: parseInt(req.body.id)})}, (err, result, body ) => {
    if(err.code === 'ETIMEDOUT') {
      return res.render('timeout');
    }
    return res.send(err);
    console.log(body);
    res.render('order-get', {order: JSON.parse(body)});
  });
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
