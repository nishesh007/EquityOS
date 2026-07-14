/**
 * In-memory dashboard cache with TTL and incremental refresh support.
 */

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface DashboardCacheStats {
  hits: number;
  misses: number;
  hitPercent: number;
  missPercent: number;
  size: number;
}

export class DashboardCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;
  private ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  setTtl(ttlMs: number): void {
    this.ttlMs = ttlMs;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }
    entry.hitCount += 1;
    this.hits += 1;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.ttlMs;
    const now = Date.now();
    this.store.set(key, {
      key,
      value,
      createdAt: now,
      expiresAt: now + ttl,
      hitCount: 0,
    });
  }

  /** Return cached value if fresh; otherwise compute, store, and return. */
  getOrCompute<T>(key: string, compute: () => T, ttlMs?: number): T {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = compute();
    this.set(key, value, ttlMs);
    return value;
  }

  invalidate(key?: string): void {
    if (key) {
      this.store.delete(key);
      return;
    }
    this.store.clear();
  }

  /** Refresh only if expired or missing; keep fresh entries. */
  incrementalRefresh<T>(
    key: string,
    compute: () => T,
    ttlMs?: number
  ): { value: T; refreshed: boolean } {
    const entry = this.store.get(key);
    if (entry && Date.now() <= entry.expiresAt) {
      this.hits += 1;
      entry.hitCount += 1;
      return { value: entry.value as T, refreshed: false };
    }
    this.misses += 1;
    const value = compute();
    this.set(key, value, ttlMs);
    return { value, refreshed: true };
  }

  getStats(): DashboardCacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitPercent: total === 0 ? 0 : round2((this.hits / total) * 100),
      missPercent: total === 0 ? 0 : round2((this.misses / total) * 100),
      size: this.store.size,
    };
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  clear(): void {
    this.store.clear();
    this.resetStats();
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
