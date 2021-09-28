const util = require('util');
const redis = require('redis');
const redisClient = redis.createClient();
const moment = require('moment')

redisClient.get = util.promisify(redisClient.get);
redisClient.set = util.promisify(redisClient.set);
redisClient.expire = util.promisify(redisClient.expire);

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
        if(counterObj.count > MAX_REQUEST_COUNT-1) {
        //Throttle request
        res.status(429).send({"error": 1000, "message": "throttled limit exceeded..."});
        } else {
        //Update the counter
        counterObj.count++
        await redisClient.set(cache_key,JSON.stringify(counterObj));
        await redisClient.expire(cache_key, DURATION_IN_MIN*60);
        next();             
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
    redisClient.set(cache_key, JSON.stringify(counterObj));
    redisClient.expire(cache_key, DURATION_IN_MIN*60);
    next();
}
