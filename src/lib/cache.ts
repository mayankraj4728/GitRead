import { cacheStore } from "./redis";

/** Namespaced, versioned cache keys. Bump VERSION to invalidate everything. */
const VERSION = "v1";

export const cacheKeys = {
  repoList: (userId: string) => `${VERSION}:repos:${userId}`,
  starredList: (userId: string) => `${VERSION}:starred:${userId}`,
  repoMeta: (fullName: string) => `${VERSION}:repo:${fullName}`,
  repoHead: (fullName: string, ref: string) => `${VERSION}:head:${fullName}:${ref}`,
  // Content keys are pinned to a commit sha so a push naturally invalidates them.
  tree: (fullName: string, sha: string) => `${VERSION}:tree:${fullName}:${sha}`,
  file: (fullName: string, sha: string, path: string) =>
    `${VERSION}:file:${fullName}:${sha}:${path}`,
  searchIndex: (fullName: string, sha: string) => `${VERSION}:sindex:${fullName}:${sha}`,
} as const;

/** Default TTLs (seconds). Content pinned to a sha can live long; head is short. */
export const TTL = {
  repoList: 60 * 5, // 5 min — cheap to refresh, keeps stars/pushes current
  head: 30, // 30 s — the freshness dial; short so pushes appear quickly
  content: 60 * 60 * 24, // 24 h — safe: key includes the commit sha
} as const;

// Cache instrumentation: logs HIT / MISS / ERR per key so you can see whether
// the cache is working (in Vercel logs). On by default; set CACHE_DEBUG=false
// to silence it.
const CACHE_DEBUG = process.env.CACHE_DEBUG !== "false";
function logCache(event: "HIT" | "MISS" | "ERR", key: string, detail?: string): void {
  if (CACHE_DEBUG) console.log(`[cache] ${event} ${key}${detail ? ` — ${detail}` : ""}`);
}

/**
 * Get a JSON value from the cache, or compute + store it. Degrades to calling
 * `fn` directly when no backend is configured or the store errors — caching is
 * best-effort and never blocks a response.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  if (!cacheStore) return fn();

  try {
    const hit = await cacheStore.get(key);
    if (hit !== null) {
      logCache("HIT", key);
      return JSON.parse(hit) as T;
    }
    logCache("MISS", key);
  } catch (err) {
    logCache("ERR", key, err instanceof Error ? err.message : String(err));
    // fall through to compute
  }

  const value = await fn();

  try {
    await cacheStore.set(key, JSON.stringify(value), ttlSeconds);
  } catch (err) {
    logCache("ERR", key, err instanceof Error ? err.message : String(err));
    // best-effort write
  }
  return value;
}

/** Invalidate one or more keys (best-effort). */
export async function invalidate(...keys: string[]): Promise<void> {
  if (!cacheStore || keys.length === 0) return;
  try {
    await cacheStore.del(keys);
  } catch {
    // best-effort
  }
}
