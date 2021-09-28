const redis = require('async-redis')
const redisClient = redis.createClient();
const moment = require('moment')

redisClient.on("error", function(error) {
    console.error("redis connection not working..." ,error);
});

let RATE_LIMIT_ATTRIBUTE;
let MAX_REQUEST_COUNT;    
let DURATION_IN_MIN;

const rateLimitInitializer = (rate_limit_attribute,max_request_count,duration_in_min) => {
    RATE_LIMIT_ATTRIBUTE = rate_limit_attribute,
    MAX_REQUEST_COUNT = max_request_count;
    DURATION_IN_MIN = duration_in_min;
};

const rateLimitChecker = async(req,res,next) => {
    let cache_key = req.headers[RATE_LIMIT_ATTRIBUTE];
    let counterObj = await redisClient.get(cache_key);
    counterObj = JSON.parse(counterObj);
    if(counterObj) {
        let currentTime = moment().unix()
        let difference = (currentTime - counterObj.startTime)/60
        if(difference >= DURATION_IN_MIN) {
            //Reset counter
            upsertCounter(cache_key, next);
        } else {        
          if(counterObj.count > MAX_REQUEST_COUNT-1) {
            //Throttle request
            res.status(429).send({"error": 1000, "message": "throttled limit exceeded..."});
          } else {
            //Update the counter
            counterObj.count++
            redisClient.set(cache_key,JSON.stringify(counterObj))
            next()
          }
        }
    } else {
        //Add new user
        upsertCounter(cache_key, next);
    }
}

module.exports = {
    "rateLimitChecker":rateLimitChecker,
    "rateLimitInitializer":rateLimitInitializer
}

function upsertCounter(cache_key, next) {
    let counterObj = {
        'count': 1,
        'startTime': moment().unix()
    };
    redisClient.set(cache_key, JSON.stringify(counterObj)); //TODO check why to stringify
    next();
}
