import { redis } from "./redis";

/** Namespaced, versioned cache keys. Bump VERSION to invalidate everything. */
const VERSION = "v1";

export const cacheKeys = {
  repoList: (userId: string) => `${VERSION}:repos:${userId}`,
  repoMeta: (fullName: string) => `${VERSION}:repo:${fullName}`,
  repoHead: (fullName: string, ref: string) => `${VERSION}:head:${fullName}:${ref}`,
  // Content keys are pinned to a commit sha so a push naturally invalidates them.
  tree: (fullName: string, sha: string) => `${VERSION}:tree:${fullName}:${sha}`,
  file: (fullName: string, sha: string, path: string) =>
    `${VERSION}:file:${fullName}:${sha}:${path}`,
} as const;

/** Default TTLs (seconds). Content pinned to a sha can live long; head is short. */
export const TTL = {
  repoList: 60 * 5, // 5 min — cheap to refresh, keeps stars/pushes current
  head: 30, // 30 s — the freshness dial; short so pushes appear quickly
  content: 60 * 60 * 24, // 24 h — safe: key includes the commit sha
} as const;

/**
 * Get a JSON value from Redis, or compute + store it. Degrades to calling
 * `fn` directly when Redis is unavailable or errors — caching is best-effort.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  if (!redis) return fn();

  try {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch {
    // fall through to compute
  }

  const value = await fn();

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // best-effort write
  }
  return value;
}

/** Invalidate one or more keys (best-effort). */
export async function invalidate(...keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // best-effort
  }
}
