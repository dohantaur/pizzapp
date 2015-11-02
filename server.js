var express = require('express');
var app = express();
var request = require('request');
var bodyParser = require('body-parser');
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', (req, res) => {
  request('http://pizzapi.herokuapp.com', (err, result, body ) => {
    if(err) return res.send(err);
    console.log(body);
    res.render('index');
  });
});

app.get('/pizzas', (req, res) => {
  request('http://pizzapi.herokuapp.com/pizzas', (err, result, body ) => {
    if(err) return res.send(err);
    console.log(JSON.parse(body));
    res.render('pizzas-get', {data: JSON.parse(body)});
  });
});

app.get('/orders/:id', (req, res) => {
  request(`http://pizzapi.herokuapp.com/orders/${req.params.id}`, (err, result, body ) => {
    if(err) return res.send(err);
    console.log(body);
    res.send(body)
  });
});

app.post('/orders', (req, res) => {
  console.log('TA MERE');
  console.log(req.body);
  console.log('--------');
  request.post('http://pizzapi.herokuapp.com/orders', req.body ,(err, result, body ) => {
    if(err) return res.send(err);
    console.log(body);
    res.send(body)
  });
});

app.listen(3000, () => {
  console.log('Listening on port 3000...')
})
