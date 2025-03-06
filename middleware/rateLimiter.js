const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const Redis = require("ioredis");

// Create Redis client
const redis = new Redis(process.env.REDIS_URL);

// General API rate limiter
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:api:",
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});

// Auth endpoints rate limiter (login, register, forgot password)
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:auth:",
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many authentication attempts, please try again later",
});

// Email verification rate limiter
const emailVerificationLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:email:",
  }),
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many email verification attempts, please try again tomorrow",
});

module.exports = {
  apiLimiter,
  authLimiter,
  emailVerificationLimiter,
};
