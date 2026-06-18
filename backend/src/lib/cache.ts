import redis from "./redis.js";

/**
 * Get a cached value or compute it.
 * @param key   Cache key
 * @param ttl   Time-to-live in seconds
 * @param fn    Function to compute the value if not cached
 */
export async function cacheable<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch {
    // Redis unavailable — fall through to compute
  }

  const result = await fn();

  try {
    await redis.set(key, JSON.stringify(result), "EX", ttl);
  } catch {
    // Redis unavailable — ignore
  }

  return result;
}

/** Invalidate one or more cache keys */
export async function invalidateCache(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Redis unavailable — ignore
  }
}

/** Invalidate all keys matching a pattern */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Redis unavailable — ignore
  }
}
