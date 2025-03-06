const Redis = require("ioredis");
const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");

const redis = new Redis(process.env.REDIS_URL);

// Constants for rate limiting and security
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION = 30 * 60; // 30 minutes in seconds
const SUSPICIOUS_COUNTRIES = ["", "unknown"]; // Add high-risk countries if needed

// Helper function to get client IP
const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress
  );
};

// Helper function to parse user agent
const parseUserAgent = (userAgent) => {
  const parser = new UAParser(userAgent);
  return {
    browser: parser.getBrowser(),
    os: parser.getOS(),
    device: parser.getDevice(),
  };
};

const ipSecurity = {
  // Middleware to track and block suspicious IPs
  trackIP: async (req, res, next) => {
    const ip = getClientIp(req);
    const key = `ip:${ip}`;

    try {
      // Get IP info
      const geoData = geoip.lookup(ip);
      const userAgentInfo = parseUserAgent(req.headers["user-agent"]);

      // Store IP info in request for later use
      req.ipInfo = {
        ip,
        geo: geoData,
        userAgent: userAgentInfo,
      };

      // Check if IP is blocked
      const isBlocked = await redis.get(`blocked:${ip}`);
      if (isBlocked) {
        return res.status(403).json({
          msg: "Your IP has been blocked due to suspicious activity. Please try again later.",
        });
      }

      // Check for suspicious activity
      if (geoData && SUSPICIOUS_COUNTRIES.includes(geoData.country)) {
        await redis.incr(`suspicious:${ip}`);
        await redis.expire(`suspicious:${ip}`, BLOCK_DURATION);
      }

      next();
    } catch (err) {
      console.error("IP Security Error:", err);
      next();
    }
  },

  // Middleware to handle failed login attempts
  handleFailedLogin: async (ip) => {
    const key = `failed:${ip}`;

    try {
      const attempts = await redis.incr(key);
      await redis.expire(key, BLOCK_DURATION);

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await redis.setex(`blocked:${ip}`, BLOCK_DURATION, "1");
        return true; // IP is now blocked
      }
      return false; // IP is not blocked
    } catch (err) {
      console.error("Failed Login Handling Error:", err);
      return false;
    }
  },

  // Middleware to reset failed attempts after successful login
  handleSuccessfulLogin: async (ip) => {
    try {
      await redis.del(`failed:${ip}`);
    } catch (err) {
      console.error("Success Login Handling Error:", err);
    }
  },

  // Middleware to check for suspicious patterns
  checkSuspiciousPatterns: async (req, res, next) => {
    const ip = getClientIp(req);

    try {
      // Check request rate
      const requestCount = await redis.incr(`requests:${ip}`);
      await redis.expire(`requests:${ip}`, 60); // Reset after 1 minute

      if (requestCount > 100) {
        // More than 100 requests per minute
        await redis.setex(`blocked:${ip}`, BLOCK_DURATION, "1");
        return res.status(429).json({
          msg: "Too many requests. Your IP has been temporarily blocked.",
        });
      }

      // Check for suspicious patterns
      const patterns = [
        req.headers["user-agent"]?.length > 500,
        !req.headers["accept-language"],
        req.headers["accept"]?.includes("*/*"),
        req.method === "POST" && !req.headers["content-type"],
      ];

      const suspiciousCount = patterns.filter(Boolean).length;
      if (suspiciousCount >= 2) {
        await redis.incr(`suspicious:${ip}`);
        const suspiciousScore = await redis.get(`suspicious:${ip}`);

        if (parseInt(suspiciousScore) > 5) {
          await redis.setex(`blocked:${ip}`, BLOCK_DURATION, "1");
          return res.status(403).json({
            msg: "Access denied due to suspicious activity.",
          });
        }
      }

      next();
    } catch (err) {
      console.error("Suspicious Pattern Check Error:", err);
      next();
    }
  },
};

module.exports = ipSecurity;
