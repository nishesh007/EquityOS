/**
 * In-memory orchestrator cache with TTL and statistics.
 */

export interface OrchestratorCacheStats {
  hits: number;
  misses: number;
  hitRatio: number;
  missRatio: number;
  size: number;
  invalidations: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ValidationCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;
  private invalidations = 0;
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
    this.hits += 1;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.ttlMs),
    });
  }

  invalidate(key?: string): void {
    if (key) {
      if (this.store.delete(key)) this.invalidations += 1;
      return;
    }
    this.invalidations += this.store.size;
    this.store.clear();
  }

  /** Invalidate keys matching a prefix (incremental invalidation). */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count += 1;
      }
    }
    this.invalidations += count;
    return count;
  }

  getStats(): OrchestratorCacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRatio: total === 0 ? 0 : round2((this.hits / total) * 100),
      missRatio: total === 0 ? 0 : round2((this.misses / total) * 100),
      size: this.store.size,
      invalidations: this.invalidations,
    };
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    this.invalidations = 0;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
