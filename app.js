const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router()
const {rateLimitChecker,rateLimitInitializer} = require('./rateLimiter')
const {rate_limit_attribute,max_request_count,duration_in_min} = require('./Constants');

const app = express()
app.use(bodyParser.json());

app.get('/',(req,res) => {
  res.send("Hi")
})

rateLimitInitializer(rate_limit_attribute,max_request_count,duration_in_min);
app.use(rateLimitChecker)
app.get('/create-zippr',(req,res) => {
    res.send({"status":"success", "result":{"zippr":"ABCD1234"}});
})  

app.listen(3000)