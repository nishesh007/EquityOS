/**
 * Market Context Aggregator — Sprint 11B.1D.
 * Single source of truth for the institutional trading pipeline.
 * Combines MarketContext / Breadth / Sector / Volatility outputs only —
 * never recalculates those engines.
 */

import type {
  AggregatorConfig,
  AggregatorInput,
  InstitutionalMarketContext,
} from "./MarketContextTypes";
import {
  aggregateInstitutionalMarketContext,
  buildAggregatorFingerprint,
  resolveAggregatorConfig,
} from "./AggregatorUtils";

export class MarketContextAggregator {
  private cache: InstitutionalMarketContext | null = null;
  private cacheFingerprint: string | null = null;
  private readonly config: AggregatorConfig;

  constructor(config?: AggregatorInput["config"]) {
    this.config = resolveAggregatorConfig(config);
  }

  /**
   * Aggregate already-computed subsystem outputs into InstitutionalMarketContext.
   * Returns cached result when section fingerprints are unchanged.
   */
  aggregate(input: AggregatorInput): InstitutionalMarketContext {
    try {
      const merged: AggregatorInput = {
        ...input,
        config: {
          ...this.config,
          ...input.config,
          weights: {
            ...this.config.weights,
            ...input.config?.weights,
          },
        },
      };

      const fingerprint = buildAggregatorFingerprint(merged);
      if (this.cache && this.cacheFingerprint === fingerprint) {
        return this.cache;
      }

      const result = aggregateInstitutionalMarketContext(merged);
      this.cache = result;
      this.cacheFingerprint = fingerprint;
      return result;
    } catch {
      const fallback = aggregateInstitutionalMarketContext({
        context: null,
        breadth: null,
        sector: null,
        volatility: null,
        timestamp: input.timestamp ?? new Date(),
        config: this.config,
      });
      fallback.warnings = [
        ...fallback.warnings,
        "Aggregator failure — neutral institutional context applied",
      ];
      this.cache = fallback;
      this.cacheFingerprint = null;
      return fallback;
    }
  }

  /** Latest aggregated institutional context, or null before first aggregate(). */
  getCurrent(): InstitutionalMarketContext | null {
    return this.cache;
  }

  getConfiguration(): AggregatorConfig {
    return resolveAggregatorConfig(this.config);
  }

  clearCache(): void {
    this.cache = null;
    this.cacheFingerprint = null;
  }
}

let aggregatorSingleton: MarketContextAggregator | null = null;

export function getMarketContextAggregator(
  config?: AggregatorInput["config"]
): MarketContextAggregator {
  if (!aggregatorSingleton) {
    aggregatorSingleton = new MarketContextAggregator(config);
  }
  return aggregatorSingleton;
}

export function resetMarketContextAggregator(): void {
  if (aggregatorSingleton) aggregatorSingleton.clearCache();
  aggregatorSingleton = null;
}
