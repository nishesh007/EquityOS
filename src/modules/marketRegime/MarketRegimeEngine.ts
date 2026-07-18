/**
 * Market Regime Engine — Sprint 11B.2A.
 * Classifies InstitutionalMarketContext into one canonical market regime.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  MarketRegime,
  MarketRegimeConfig,
  MarketRegimeRule,
} from "./MarketRegimeTypes";
import {
  buildDefaultMarketRegimeRules,
  classifyMarketRegime,
  createFallbackMarketRegime,
  isInstitutionalContextIncomplete,
  resolveMarketRegimeConfig,
} from "./MarketRegimeUtils";

export class MarketRegimeEngine {
  private current: MarketRegime | null = null;
  private readonly config: MarketRegimeConfig;
  private readonly rules: readonly MarketRegimeRule[];

  constructor(
    config?: Partial<MarketRegimeConfig>,
    rules?: readonly MarketRegimeRule[]
  ) {
    this.config = resolveMarketRegimeConfig(config);
    this.rules = rules ?? buildDefaultMarketRegimeRules();
  }

  /**
   * Classify the provided institutional market context.
   * Never crashes — incomplete context yields Sideways with reduced confidence.
   */
  classify(context: InstitutionalMarketContext | null | undefined): MarketRegime {
    try {
      if (isInstitutionalContextIncomplete(context)) {
        const fallback = createFallbackMarketRegime(
          context?.timestamp ?? new Date(),
          "Incomplete market context — Sideways regime with reduced confidence."
        );
        this.current = fallback;
        return fallback;
      }

      const regime = classifyMarketRegime(
        context as InstitutionalMarketContext,
        this.config,
        this.rules
      );
      this.current = regime;
      return regime;
    } catch {
      const fallback = createFallbackMarketRegime(
        new Date(),
        "Regime classification failed — Sideways fallback applied."
      );
      this.current = fallback;
      return fallback;
    }
  }

  getCurrentRegime(): MarketRegime | null {
    return this.current;
  }

  getConfiguration(): MarketRegimeConfig {
    return resolveMarketRegimeConfig(this.config);
  }

  getRules(): readonly MarketRegimeRule[] {
    return this.rules;
  }

  clear(): void {
    this.current = null;
  }
}

let engineSingleton: MarketRegimeEngine | null = null;

export function getMarketRegimeEngine(
  config?: Partial<MarketRegimeConfig>
): MarketRegimeEngine {
  if (!engineSingleton) {
    engineSingleton = new MarketRegimeEngine(config);
  }
  return engineSingleton;
}

export function resetMarketRegimeEngine(): void {
  if (engineSingleton) engineSingleton.clear();
  engineSingleton = null;
}
