var request = require('request');
var redis = require("redis");
var client = redis.createClient(process.env.REDIS_URL);

client.on("error", function (err) {
    console.log("Error " + err);
});

function refreshPizzaList() {
	request('http://pizzapi.herokuapp.com/pizzas', (err, result, body ) => {
        if(result !== 'undefined' && result.statusCode !== 'undefined') {
            console.log("STATUS CODE:" + result.statusCode);
            if(err) return;
            if (!err && result.statusCode == 200) {
                var pizzas = body;
                console.log(pizzas);

            	client.set("pizzas", pizzas, function (err, res) {
            		console.log("PIZZA ENREGISTRÉE");
            	});
            }
        }
	});
}

setInterval(refreshPizzaList,30000);
