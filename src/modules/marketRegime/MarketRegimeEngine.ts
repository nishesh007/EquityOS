/**
 * Market Regime Engine — Sprint 11B.2A / 11B.2B.
 * Classifies InstitutionalMarketContext and attaches confidence explainability.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  MarketRegime,
  MarketRegimeConfig,
  MarketRegimeRule,
  RegimeConfidenceAnalysis,
} from "./MarketRegimeTypes";
import {
  buildDefaultMarketRegimeRules,
  classifyMarketRegime,
  createFallbackMarketRegime,
  isInstitutionalContextIncomplete,
  resolveMarketRegimeConfig,
} from "./MarketRegimeUtils";
import {
  RegimeConfidenceEngine,
  getRegimeConfidenceEngine,
  resetRegimeConfidenceEngine,
} from "./RegimeConfidenceEngine";

export class MarketRegimeEngine {
  private current: MarketRegime | null = null;
  private readonly config: MarketRegimeConfig;
  private readonly rules: readonly MarketRegimeRule[];
  private readonly confidenceEngine: RegimeConfidenceEngine;

  constructor(
    config?: Partial<MarketRegimeConfig>,
    rules?: readonly MarketRegimeRule[]
  ) {
    this.config = resolveMarketRegimeConfig(config);
    this.rules = rules ?? buildDefaultMarketRegimeRules();
    this.confidenceEngine = getRegimeConfidenceEngine();
  }

  /**
   * Classify the provided institutional market context and enrich with
   * Sprint 11B.2B confidence analysis. Never crashes.
   */
  classify(context: InstitutionalMarketContext | null | undefined): MarketRegime {
    try {
      if (isInstitutionalContextIncomplete(context)) {
        const fallback = createFallbackMarketRegime(
          context?.timestamp ?? new Date(),
          "Incomplete market context — Sideways regime with reduced confidence."
        );
        this.current = fallback;
        this.confidenceEngine.analyze(null, fallback);
        return fallback;
      }

      const classification = classifyMarketRegime(
        context as InstitutionalMarketContext,
        this.config,
        this.rules
      );
      const enriched = this.confidenceEngine.enrich(
        context as InstitutionalMarketContext,
        classification
      );
      this.current = enriched;
      return enriched;
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

  /** Sprint 11B.2B — latest confidence / explainability package. */
  getConfidenceAnalysis(): RegimeConfidenceAnalysis | null {
    return (
      this.current?.confidenceAnalysis ??
      this.confidenceEngine.getCurrentAnalysis()
    );
  }

  getConfiguration(): MarketRegimeConfig {
    return resolveMarketRegimeConfig(this.config);
  }

  getRules(): readonly MarketRegimeRule[] {
    return this.rules;
  }

  clear(): void {
    this.current = null;
    this.confidenceEngine.clear();
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
  resetRegimeConfidenceEngine();
}
