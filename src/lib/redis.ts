import Redis from "ioredis";

// Redis is optional. When REDIS_URL is unset we return null and the cache
// layer degrades to a pass-through, so the app boots without Redis.
const globalForRedis = globalThis as unknown as { redis?: Redis | null };

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    lazyConnect: false,
    // Don't crash the process if Redis is briefly unavailable.
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
  });
  client.on("error", (err) => {
    // Log once-ish; cache layer already tolerates failures.
    if (process.env.NODE_ENV === "development") {
      console.warn("[redis] connection error:", err.message);
    }
  });
  return client;
}

export const redis: Redis | null = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
