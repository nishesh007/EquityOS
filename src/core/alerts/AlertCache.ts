/**
 * Institutional AI Alert Engine — cache layer (Sprint 9C.R1).
 * Reuses platform cache key/TTL conventions; avoids duplicate alerts and recalculation.
 */

import { CACHE_TTL, cacheKey } from "@/lib/cache";
import type { InstitutionalAlert } from "./AlertModels";

const ALERT_CACHE_PREFIX = "alert-engine";
const DEFAULT_TTL_MS = CACHE_TTL.DASHBOARD;

interface AlertCacheEntry {
  alert: InstitutionalAlert;
  storedAt: number;
  expiresAt: number;
}

function cloneAlert(alert: InstitutionalAlert): InstitutionalAlert {
  return {
    ...alert,
    evidence: [...alert.evidence],
    confidence: { ...alert.confidence },
    metadata: {
      ...alert.metadata,
      tags: [...alert.metadata.tags],
      extras: { ...alert.metadata.extras },
    },
  };
}

/**
 * Sync alert cache with platform TTL conventions.
 * Deduplication and grouping indexes prevent duplicate institutional alerts.
 */
export class AlertCache {
  private readonly store = new Map<string, AlertCacheEntry>();
  private readonly dedupeIndex = new Map<string, string>();
  private readonly groupIndex = new Map<string, string>();
  private hits = 0;
  private misses = 0;
  private writes = 0;

  buildKey(...parts: (string | number)[]): string {
    return cacheKey(ALERT_CACHE_PREFIX, ...parts);
  }

  getById(alertId: string): InstitutionalAlert | null {
    const key = this.buildKey("id", alertId);
    const entry = this.store.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      this.hits += 1;
      return cloneAlert(entry.alert);
    }
    if (entry) this.store.delete(key);
    this.misses += 1;
    return null;
  }

  getByDedupeKey(dedupeKey: string): InstitutionalAlert | null {
    const alertId = this.dedupeIndex.get(dedupeKey);
    if (!alertId) {
      this.misses += 1;
      return null;
    }
    return this.getById(alertId);
  }

  getByGroupKey(groupKey: string): InstitutionalAlert | null {
    const alertId = this.groupIndex.get(groupKey);
    if (!alertId) {
      this.misses += 1;
      return null;
    }
    return this.getById(alertId);
  }

  set(alert: InstitutionalAlert, options?: { ttlMs?: number }): void {
    const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
    const key = this.buildKey("id", alert.id);
    const now = Date.now();
    this.store.set(key, {
      alert: cloneAlert(alert),
      storedAt: now,
      expiresAt: now + ttlMs,
    });
    this.dedupeIndex.set(alert.metadata.dedupeKey, alert.id);
    this.groupIndex.set(alert.metadata.groupKey, alert.id);
    this.writes += 1;
  }

  /** Rebind indexes after an in-place update (same id, possibly new keys). */
  reindex(alert: InstitutionalAlert): void {
    this.dedupeIndex.set(alert.metadata.dedupeKey, alert.id);
    this.groupIndex.set(alert.metadata.groupKey, alert.id);
    const key = this.buildKey("id", alert.id);
    const existing = this.store.get(key);
    if (existing) {
      existing.alert = cloneAlert(alert);
    } else {
      this.set(alert);
    }
  }

  invalidate(alertId: string): void {
    const existing = this.getById(alertId);
    this.store.delete(this.buildKey("id", alertId));
    if (existing) {
      if (this.dedupeIndex.get(existing.metadata.dedupeKey) === alertId) {
        this.dedupeIndex.delete(existing.metadata.dedupeKey);
      }
      if (this.groupIndex.get(existing.metadata.groupKey) === alertId) {
        this.groupIndex.delete(existing.metadata.groupKey);
      }
    }
  }

  clear(): void {
    this.store.clear();
    this.dedupeIndex.clear();
    this.groupIndex.clear();
    this.hits = 0;
    this.misses = 0;
    this.writes = 0;
  }

  getStats(): {
    hits: number;
    misses: number;
    writes: number;
    size: number;
    dedupeKeys: number;
    groupKeys: number;
    ttlMs: number;
  } {
    return {
      hits: this.hits,
      misses: this.misses,
      writes: this.writes,
      size: this.store.size,
      dedupeKeys: this.dedupeIndex.size,
      groupKeys: this.groupIndex.size,
      ttlMs: DEFAULT_TTL_MS,
    };
  }
}
