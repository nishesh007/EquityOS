/**
 * In-memory cache with TTL tiers and request deduplication.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export interface CacheOptions {
  key: string;
  ttlMs?: number;
}

export const CACHE_TTL = {
  /** Live quotes — 5 seconds during market hours (see getQuoteCacheTtlMs) */
  QUOTE: 5_000,
  /** Sprint 8A — full market data snapshot */
  MARKET_DATA: 300_000,
  /** Sprint 8A explicit tiers */
  FIVE_MINUTES: 300_000,
  FIFTEEN_MINUTES: 900_000,
  ONE_HOUR: 3_600_000,
  DAILY: 86_400_000,
  FUNDAMENTALS: 300_000,
  QUARTERLY: 600_000,
  CORPORATE_ACTIONS: 1_800_000,
  CANDLES: 3_600_000,
  RESEARCH: 120_000,
  DASHBOARD: 60_000,
  DEFAULT: 60_000,
} as const;

const DEFAULT_TTL_MS = CACHE_TTL.DEFAULT;

export async function getCached<T>(
  options: CacheOptions,
  fetcher: () => Promise<T>
): Promise<T> {
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
  const existing = store.get(options.key);

  if (existing && existing.expiresAt > Date.now()) {
    return existing.value as T;
  }

  const pending = inFlight.get(options.key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = fetcher()
    .then((value) => {
      store.set(options.key, {
        value,
        expiresAt: Date.now() + ttl,
      });
      inFlight.delete(options.key);
      return value;
    })
    .catch((error: unknown) => {
      inFlight.delete(options.key);
      throw error;
    });

  inFlight.set(options.key, promise);
  return promise;
}

/**
 * Prefer fresh cache; if expired (or only seed), return immediately and
 * refresh in the background. Awaits the fetcher only when nothing usable
 * is in memory yet.
 */
export async function getCachedStaleWhileRevalidate<T>(
  options: CacheOptions,
  fetcher: () => Promise<T>,
  isUsable: (value: T) => boolean = () => true
): Promise<T> {
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
  const existing = store.get(options.key) as CacheEntry<T> | undefined;
  const fresh =
    existing && existing.expiresAt > Date.now() ? existing.value : null;
  if (fresh != null && isUsable(fresh)) {
    return fresh;
  }

  const pending = inFlight.get(options.key) as Promise<T> | undefined;
  const stale =
    existing && isUsable(existing.value) ? existing.value : null;

  const startRefresh = (): Promise<T> => {
    if (pending) return pending;
    const promise = fetcher()
      .then((value) => {
        store.set(options.key, {
          value,
          expiresAt: Date.now() + ttl,
        });
        inFlight.delete(options.key);
        return value;
      })
      .catch((error: unknown) => {
        inFlight.delete(options.key);
        throw error;
      });
    inFlight.set(options.key, promise);
    return promise;
  };

  if (stale != null) {
    void startRefresh().catch(() => {
      /* keep serving stale */
    });
    return stale;
  }

  return startRefresh();
}

/** Seed the in-memory cache (e.g. from a previous-session disk snapshot). */
export function seedCache<T>(
  key: string,
  value: T,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function getCachedSync<T>(key: string): T | null {
  const existing = store.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return existing.value as T;
  }
  return null;
}

/** Returns cached value even if TTL expired — used for graceful degradation. */
export function getStaleCachedSync<T>(key: string): T | null {
  const existing = store.get(key);
  if (existing) {
    return existing.value as T;
  }
  return null;
}

export function invalidateCache(key: string): void {
  store.delete(key);
  inFlight.delete(key);
}

/** Remove all entries whose key starts with `prefix`. */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  for (const key of [...inFlight.keys()]) {
    if (key.startsWith(prefix)) inFlight.delete(key);
  }
}

export function clearCache(): void {
  store.clear();
  inFlight.clear();
}

export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(":");
}
