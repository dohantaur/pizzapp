var express = require('express');
var app = express();

app.use(function(req, res, next){
  res.status(503);
  // respond with html page
  res.send({id: "maintenance", message: "API is temporaly unavailable"});
});

app.listen(process.env.PORT || 3001, () => {
  console.log('Listening on port 3001...')
})
