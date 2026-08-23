import IoRedis from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";

/**
 * Cache backend abstraction.
 *
 * Two backends, one interface:
 *  - **Upstash REST** (serverless/Vercel): a stateless HTTP client. No
 *    persistent TCP socket, so there's no per-cold-start TLS handshake and no
 *    dead-socket reconnect stall on the request's critical path — the failure
 *    mode that makes `ioredis` slow on Vercel.
 *  - **ioredis** (local dev): a single long-lived TCP connection to the local
 *    Redis from docker-compose. Reused across hot reloads via `globalThis`.
 *
 * When neither is configured we return `null` and the cache layer degrades to
 * a pass-through, so the app boots without any cache.
 *
 * Both backends operate on RAW STRING values (Upstash's automatic JSON
 * (de)serialization is disabled) so behaviour is identical regardless of which
 * one is active — `cache.ts` owns all JSON encoding.
 */
export interface CacheStore {
  readonly backend: "upstash" | "ioredis";
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(keys: string[]): Promise<void>;
}

const globalForRedis = globalThis as unknown as { cacheStore?: CacheStore | null };

/** Upstash REST — preferred on Vercel. Supports both the native Upstash and
 * the Vercel-integration (`KV_*`) env var names. */
function createUpstashStore(): CacheStore | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  // automaticDeserialization:false → get/set pass raw strings through untouched,
  // matching ioredis and preventing double JSON encode/parse against cache.ts.
  const client = new UpstashRedis({ url, token, automaticDeserialization: false });

  return {
    backend: "upstash",
    async get(key) {
      return (await client.get<string>(key)) ?? null;
    },
    async set(key, value, ttlSeconds) {
      await client.set(key, value, { ex: ttlSeconds });
    },
    async del(keys) {
      if (keys.length) await client.del(...keys);
    },
  };
}

/** ioredis over TCP — used locally (docker-compose Redis). */
function createIoRedisStore(): CacheStore | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const client = new IoRedis(url, {
    maxRetriesPerRequest: 2,
    lazyConnect: false,
    // Don't crash the process if Redis is briefly unavailable.
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
  });
  client.on("error", (err) => {
    // Cache layer already tolerates failures; log so a misconfig is visible.
    console.warn("[redis] connection error:", err.message);
  });

  return {
    backend: "ioredis",
    async get(key) {
      return client.get(key);
    },
    async set(key, value, ttlSeconds) {
      await client.set(key, value, "EX", ttlSeconds);
    },
    async del(keys) {
      if (keys.length) await client.del(...keys);
    },
  };
}

function createStore(): CacheStore | null {
  // Prefer Upstash REST wherever it's configured (production/Vercel).
  const store = createUpstashStore() ?? createIoRedisStore();
  if (store) {
    console.log(`[cache] backend: ${store.backend}`);
  } else {
    console.log("[cache] no backend configured — caching disabled (pass-through)");
  }
  return store;
}

export const cacheStore: CacheStore | null = globalForRedis.cacheStore ?? createStore();

if (process.env.NODE_ENV !== "production") globalForRedis.cacheStore = cacheStore;
