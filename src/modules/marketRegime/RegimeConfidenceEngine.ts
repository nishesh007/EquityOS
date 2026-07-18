/**
 * Regime Confidence Engine — Sprint 11B.2B.
 * Evaluates reliability of a classified market regime and explains why.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  MarketRegime,
  MarketRegimeClassification,
  RegimeConfidenceAnalysis,
  RegimeConfidenceInput,
} from "./MarketRegimeTypes";
import {
  buildRegimeConfidenceAnalysis,
  createFallbackConfidenceAnalysis,
  enrichRegimeWithConfidence,
  resolveRegimeConfidenceConfig,
} from "./RegimeConfidenceUtils";

export class RegimeConfidenceEngine {
  private current: RegimeConfidenceAnalysis | null = null;
  private readonly config: ReturnType<typeof resolveRegimeConfidenceConfig>;

  constructor(config?: RegimeConfidenceInput["config"]) {
    this.config = resolveRegimeConfidenceConfig(config);
  }

  /**
   * Analyze confidence for a classified regime against institutional context.
   * Never crashes — missing inputs yield Low confidence with explanations.
   */
  analyze(
    context: InstitutionalMarketContext | null | undefined,
    regime: MarketRegimeClassification | null | undefined
  ): RegimeConfidenceAnalysis {
    try {
      const analysis = buildRegimeConfidenceAnalysis({
        context: context ?? null,
        regime: regime ?? null,
        config: this.config,
      });
      this.current = analysis;
      return analysis;
    } catch {
      const fallback = createFallbackConfidenceAnalysis(
        "Confidence analysis failed — confidence reduced."
      );
      this.current = fallback;
      return fallback;
    }
  }

  /**
   * Enrich a classification with confidenceAnalysis and synced confidence score.
   */
  enrich(
    context: InstitutionalMarketContext | null | undefined,
    regime: MarketRegimeClassification
  ): MarketRegime {
    const enriched = enrichRegimeWithConfidence(
      regime,
      context ?? null,
      this.config
    );
    this.current = enriched.confidenceAnalysis;
    return enriched as MarketRegime;
  }

  getCurrentAnalysis(): RegimeConfidenceAnalysis | null {
    return this.current;
  }

  getConfiguration() {
    return resolveRegimeConfidenceConfig(this.config);
  }

  clear(): void {
    this.current = null;
  }
}

let confidenceSingleton: RegimeConfidenceEngine | null = null;

export function getRegimeConfidenceEngine(
  config?: RegimeConfidenceInput["config"]
): RegimeConfidenceEngine {
  if (!confidenceSingleton) {
    confidenceSingleton = new RegimeConfidenceEngine(config);
  }
  return confidenceSingleton;
}

export function resetRegimeConfidenceEngine(): void {
  if (confidenceSingleton) confidenceSingleton.clear();
  confidenceSingleton = null;
}
