var request = require('request');
var redis = require("redis");
var client = redis.createClient();

client.on("error", function (err) {
    console.log("Error " + err);
});

function refreshPizzaList() {
	request('http://pizzapi.herokuapp.com/pizzas', (err, result, body ) => {
	  if(err) return;
	  var pizzas = JSON.parse(body);
	  console.log(pizzas);

	  for(pizza in pizzas) {
		client.hmset(pizza.id, ["id", pizza.id, "name", pizza.name, "price", pizza.price], function (err, res) {
			console.log("PIZZA ENREGISTRÉE");
		});
	  }
	});
}

setInterval(refreshPizzaList,60000);
