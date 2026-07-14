/**
 * Advanced Rule Engine — deterministic validation cache with TTL.
 */

import type { RuleValidationOutcome } from "../IntegrityTypes";
import { DEFAULT_CACHE_TTL_MS } from "./RuleTypes";

interface CacheEntry {
  outcome: RuleValidationOutcome;
  expiresAt: number;
  ruleId: string;
  version: string;
}

export class RuleCache {
  private readonly store = new Map<string, CacheEntry>();
  private ttlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(ttlMs: number = DEFAULT_CACHE_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  setTtl(ttlMs: number): void {
    this.ttlMs = Math.max(0, ttlMs);
  }

  getTtl(): number {
    return this.ttlMs;
  }

  buildKey(ruleId: string, version: string, cacheKey: string): string {
    return `${ruleId}::${version}::${cacheKey}`;
  }

  get(
    ruleId: string,
    version: string,
    cacheKey: string
  ): RuleValidationOutcome | undefined {
    const key = this.buildKey(ruleId, version, cacheKey);
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
    return entry.outcome;
  }

  set(
    ruleId: string,
    version: string,
    cacheKey: string,
    outcome: RuleValidationOutcome
  ): void {
    if (this.ttlMs <= 0) return;
    const key = this.buildKey(ruleId, version, cacheKey);
    this.store.set(key, {
      outcome,
      expiresAt: Date.now() + this.ttlMs,
      ruleId,
      version,
    });
  }

  invalidate(ruleId?: string): void {
    if (!ruleId) {
      this.store.clear();
      return;
    }
    for (const [key, entry] of this.store.entries()) {
      if (entry.ruleId === ruleId) {
        this.store.delete(key);
      }
    }
  }

  size(): number {
    return this.store.size;
  }

  stats(): { hits: number; misses: number; size: number; ttlMs: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
      ttlMs: this.ttlMs,
    };
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}
