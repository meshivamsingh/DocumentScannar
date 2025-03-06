import Redis from "ioredis";

let redis = null;

// Initialize Redis connection
const initRedis = () => {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      connectTimeout: 10000, // 10 seconds
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 500, 2000);
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    redis.on("error", (error) => {
      console.error("Redis connection error:", error);
      redis = null; // Reset connection on error
    });

    redis.on("connect", () => {
      console.log("Redis connected successfully");
    });
  }
  return redis;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.REDIS_URL) {
      throw new Error("Redis URL is not configured");
    }

    const { key, value } = req.body;

    // Initialize Redis connection
    const redisClient = initRedis();

    // Set timeout for Redis operations
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis operation timed out")), 5000)
    );

    // Perform Redis operations with timeout
    const result = await Promise.race([
      (async () => {
        const pingResult = await redisClient.ping();
        if (pingResult !== "PONG") {
          throw new Error("Redis ping failed");
        }
        await redisClient.set(key, value);
        return await redisClient.get(key);
      })(),
      timeout,
    ]);

    res.status(200).json({
      message: "Redis test successful",
      result,
    });
  } catch (error) {
    console.error("Redis test error:", error);

    if (error.message.includes("timed out")) {
      return res.status(504).json({
        error: "Redis connection timed out",
        details:
          "The Redis operation took too long to complete. Please try again.",
      });
    }

    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("connection")
    ) {
      return res.status(503).json({
        error: "Redis connection failed",
        details:
          "Could not establish connection to Redis server. Please check the Redis URL configuration.",
      });
    }

    res.status(500).json({
      error: "Failed to test Redis",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
