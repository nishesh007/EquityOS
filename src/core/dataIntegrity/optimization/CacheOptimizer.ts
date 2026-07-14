/**
 * Cache optimizer — TTL, hit ratio, eviction, invalidation (advisory only).
 */

import type { OptimizationConfiguration } from "./OptimizationConfiguration";
import type { OptimizationProbe } from "./OptimizationRegistry";
import {
  OptimizationStrategies,
  type OptimizationRecommendation,
} from "./OptimizationStrategies";

export interface CacheOptimizationResult {
  cacheEfficiency: number;
  averageHitRate: number | null;
  suggestedTtlMs: number;
  recommendations: OptimizationRecommendation[];
  warnings: string[];
  errors: string[];
}

export class CacheOptimizer {
  constructor(private config: OptimizationConfiguration) {}

  setConfiguration(config: OptimizationConfiguration): void {
    this.config = config;
  }

  optimize(probes: OptimizationProbe[]): CacheOptimizationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: OptimizationRecommendation[] = [];

    try {
      const withCache = probes.filter(
        (p) => typeof p.cacheHitRate === "number" || typeof p.cacheSize === "number"
      );
      const hitRates = withCache
        .map((p) => p.cacheHitRate)
        .filter((n): n is number => typeof n === "number");
      const averageHitRate =
        hitRates.length === 0
          ? null
          : hitRates.reduce((a, b) => a + b, 0) / hitRates.length;

      const ttls = withCache
        .map((p) => p.cacheTtlMs)
        .filter((n): n is number => typeof n === "number" && n > 0);
      const avgTtl =
        ttls.length === 0
          ? this.config.cacheDefaultTtlMs
          : ttls.reduce((a, b) => a + b, 0) / ttls.length;

      let suggestedTtlMs = this.config.cacheDefaultTtlMs;
      if (averageHitRate != null && averageHitRate < this.config.cacheHitTargetPct) {
        suggestedTtlMs = Math.round(avgTtl * 1.5);
        for (const probe of withCache) {
          const id = probe.module;
          recommendations.push(
            OptimizationStrategies.improveCacheHit(
              id,
              Math.min(30, this.config.cacheHitTargetPct - averageHitRate)
            )
          );
          recommendations.push(
            OptimizationStrategies.tuneCacheTtl(
              id,
              suggestedTtlMs,
              12
            )
          );
        }
      } else if (averageHitRate != null && averageHitRate > 95) {
        suggestedTtlMs = Math.round(avgTtl * 0.8);
        warnings.push("Very high cache hit rate; TTL may be overly long.");
      }

      for (const probe of withCache) {
        if ((probe.cacheSize ?? 0) > this.config.cacheMaxEntries) {
          recommendations.push(
            createEvictionRecommendation(
              probe.module,
              probe.cacheSize ?? 0,
              this.config.cacheMaxEntries
            )
          );
        }
      }

      const cacheEfficiency =
        averageHitRate == null
          ? 100
          : clamp(
              100 -
                Math.max(0, this.config.cacheHitTargetPct - averageHitRate) * 1.5,
              0,
              100
            );

      return {
        cacheEfficiency: round2(cacheEfficiency),
        averageHitRate:
          averageHitRate == null ? null : round2(averageHitRate),
        suggestedTtlMs,
        recommendations,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Cache optimization failed: ${String(err)}`);
      return {
        cacheEfficiency: 0,
        averageHitRate: null,
        suggestedTtlMs: this.config.cacheDefaultTtlMs,
        recommendations,
        warnings,
        errors,
      };
    }
  }
}

function createEvictionRecommendation(
  targetId: string,
  size: number,
  maxEntries: number
) {
  return {
    recommendationId: `rec:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
    strategyId: "EVICT_CACHE" as const,
    title: "Tighten cache eviction",
    description: `Cache size ${size} for ${targetId} exceeds limit ${maxEntries}.`,
    priority: "MEDIUM" as const,
    targetType: "cache" as const,
    targetId,
    estimatedImpactPct: 10,
    advisoryOnly: true as const,
    metadata: { size, maxEntries },
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
