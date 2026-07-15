/**
 * Institutional AI Screener — cache layer (Sprint 9D.R1).
 * Reuses platform cache key conventions; stores run results by screen + version.
 */

import { CACHE_TTL, cacheKey } from "@/lib/cache";
import type { ScreenRunResults } from "./ScreenResult";

const SCREEN_CACHE_PREFIX = "ai-screener";
const DEFAULT_TTL_MS = CACHE_TTL.DASHBOARD;

interface ScreenCacheEntry {
  results: ScreenRunResults;
  storedAt: number;
  expiresAt: number;
}

function cloneResults(results: ScreenRunResults): ScreenRunResults {
  return {
    ...results,
    results: results.results.map((row) => ({
      ...row,
      matchedRules: [...row.matchedRules],
    })),
  };
}

export class ScreenCache {
  private readonly store = new Map<string, ScreenCacheEntry>();
  private hits = 0;
  private misses = 0;
  private writes = 0;

  buildKey(...parts: (string | number)[]): string {
    return cacheKey(SCREEN_CACHE_PREFIX, ...parts);
  }

  get(screenId: string, version: string): ScreenRunResults | null {
    const key = this.buildKey(screenId, version);
    const entry = this.store.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      this.hits += 1;
      return cloneResults(entry.results);
    }
    if (entry) this.store.delete(key);
    this.misses += 1;
    return null;
  }

  set(
    screenId: string,
    version: string,
    results: ScreenRunResults,
    options?: { ttlMs?: number }
  ): void {
    const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
    const now = Date.now();
    this.store.set(this.buildKey(screenId, version), {
      results: cloneResults({ ...results, fromCache: false }),
      storedAt: now,
      expiresAt: now + ttlMs,
    });
    this.writes += 1;
  }

  invalidate(screenId: string, version?: string): void {
    if (version) {
      this.store.delete(this.buildKey(screenId, version));
      return;
    }
    for (const key of this.store.keys()) {
      if (key.includes(screenId)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    this.writes = 0;
  }

  getStats(): {
    hits: number;
    misses: number;
    writes: number;
    size: number;
    ttlMs: number;
  } {
    return {
      hits: this.hits,
      misses: this.misses,
      writes: this.writes,
      size: this.store.size,
      ttlMs: DEFAULT_TTL_MS,
    };
  }
}
