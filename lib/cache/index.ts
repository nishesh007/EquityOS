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

export function clearCache(): void {
  store.clear();
  inFlight.clear();
}

export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(":");
}
