/**
 * Market Context Engine — Sprint 11B.1A / 11B.1B / 11B.1C.
 * First stage of the institutional trading pipeline.
 * Extends with breadth, sector, and volatility analysis without breaking prior APIs.
 */

import { BreadthEngine, getBreadthEngine, resetBreadthEngine } from "./BreadthEngine";
import {
  SectorStrengthEngine,
  getSectorStrengthEngine,
  resetSectorStrengthEngine,
} from "./SectorStrengthEngine";
import {
  VolatilityEngine,
  getVolatilityEngine,
  resetVolatilityEngine,
} from "./VolatilityEngine";
import type {
  BreadthAnalysis,
  BreadthEngineInput,
  MarketContext,
  MarketContextAnalysisBreakdown,
  MarketContextConfig,
  MarketContextInput,
  SectorEngineInput,
  SectorStrengthAnalysis,
  VolatilityAnalysis,
  VolatilityEngineInput,
} from "./MarketContextTypes";
import {
  buildMarketContextFromInput,
  calculateBreadth,
  calculateConfidence,
  calculateMarketStrength,
  calculateRiskMode,
  calculateTrend,
  calculateVolatility,
  createFallbackMarketContext,
  resolveMarketContextConfig,
} from "./MarketContextUtils";

export class MarketContextEngine {
  private currentContext: MarketContext | null = null;
  private lastBreakdown: MarketContextAnalysisBreakdown | null = null;
  private breadthAnalysis: BreadthAnalysis | null = null;
  private sectorAnalysis: SectorStrengthAnalysis | null = null;
  private volatilityAnalysis: VolatilityAnalysis | null = null;
  private readonly config: MarketContextConfig;
  private readonly breadthEngine: BreadthEngine;
  private readonly sectorEngine: SectorStrengthEngine;
  private readonly volatilityEngine: VolatilityEngine;

  constructor(config?: Partial<MarketContextConfig>) {
    this.config = resolveMarketContextConfig(config);
    this.breadthEngine = getBreadthEngine();
    this.sectorEngine = getSectorStrengthEngine();
    this.volatilityEngine = getVolatilityEngine();
  }

  /**
   * Analyze normalized market inputs and return a fully populated MarketContext.
   * Gracefully falls back to a neutral context when inputs are unusable.
   */
  analyze(input: MarketContextInput): MarketContext {
    try {
      const mergedInput: MarketContextInput = {
        ...input,
        config: {
          weights: {
            ...this.config.weights,
            ...input.config?.weights,
          },
          thresholds: {
            ...this.config.thresholds,
            ...input.config?.thresholds,
          },
        },
      };

      const context = buildMarketContextFromInput(mergedInput);
      this.currentContext = context;
      this.lastBreakdown = this.buildBreakdown(mergedInput, context);
      return context;
    } catch {
      const fallback = createFallbackMarketContext(
        input.asOf ?? new Date(),
        "Market context analysis failed — neutral fallback applied"
      );
      this.currentContext = fallback;
      this.lastBreakdown = null;
      return fallback;
    }
  }

  /** Sprint 11B.1B — institutional breadth analysis. */
  analyzeBreadth(input: BreadthEngineInput): BreadthAnalysis {
    const analysis = this.breadthEngine.analyze(input);
    this.breadthAnalysis = analysis;
    return analysis;
  }

  /** Sprint 11B.1B — institutional sector strength analysis. */
  analyzeSectorStrength(input: SectorEngineInput): SectorStrengthAnalysis {
    const analysis = this.sectorEngine.analyze(input);
    this.sectorAnalysis = analysis;
    return analysis;
  }

  /** Sprint 11B.1C — institutional volatility analysis. */
  analyzeVolatility(input: VolatilityEngineInput): VolatilityAnalysis {
    const analysis = this.volatilityEngine.analyze(input);
    this.volatilityAnalysis = analysis;
    return analysis;
  }

  getCurrentContext(): MarketContext | null {
    return this.currentContext;
  }

  getBreadthAnalysis(): BreadthAnalysis | null {
    return this.breadthAnalysis ?? this.breadthEngine.getCurrentAnalysis();
  }

  getSectorAnalysis(): SectorStrengthAnalysis | null {
    return this.sectorAnalysis ?? this.sectorEngine.getCurrentAnalysis();
  }

  /** Sprint 11B.1C — latest institutional volatility analysis. */
  getVolatilityAnalysis(): VolatilityAnalysis | null {
    return this.volatilityAnalysis ?? this.volatilityEngine.getCurrentAnalysis();
  }

  getLastBreakdown(): MarketContextAnalysisBreakdown | null {
    return this.lastBreakdown;
  }

  getConfiguration(): MarketContextConfig {
    return resolveMarketContextConfig(this.config);
  }

  clear(): void {
    this.currentContext = null;
    this.lastBreakdown = null;
    this.breadthAnalysis = null;
    this.sectorAnalysis = null;
    this.volatilityAnalysis = null;
    this.breadthEngine.clear();
    this.sectorEngine.clear();
    this.volatilityEngine.clear();
  }

  private buildBreakdown(
    input: MarketContextInput,
    context: MarketContext
  ): MarketContextAnalysisBreakdown {
    const thresholds = resolveMarketContextConfig(input.config).thresholds;
    const weights = resolveMarketContextConfig(input.config).weights;

    const primary = input.nifty.available
      ? input.nifty
      : input.sensex.available
        ? input.sensex
        : input.bankNifty;

    const secondary = input.bankNifty.available
      ? input.bankNifty
      : input.sensex.available
        ? input.sensex
        : null;

    const trend = calculateTrend(primary, secondary, thresholds);
    const breadth = calculateBreadth(input.breadth, thresholds);
    const volatility = calculateVolatility(input.indiaVix, primary, thresholds);
    const strength = calculateMarketStrength(
      trend,
      breadth,
      volatility,
      input.breadth.sectors,
      weights
    );
    const risk = calculateRiskMode(
      trend,
      breadth,
      volatility,
      strength.marketStrength,
      thresholds
    );
    const confidence = calculateConfidence(
      trend,
      breadth,
      volatility,
      risk,
      strength.marketStrength,
      thresholds
    );

    return {
      trend,
      breadth,
      volatility,
      risk,
      strength,
      confidence: {
        ...confidence,
        confidence: context.confidence,
      },
    };
  }
}

let engineSingleton: MarketContextEngine | null = null;

export function getMarketContextEngine(
  config?: Partial<MarketContextConfig>
): MarketContextEngine {
  if (!engineSingleton) {
    engineSingleton = new MarketContextEngine(config);
  }
  return engineSingleton;
}

export function resetMarketContextEngine(): void {
  if (engineSingleton) {
    engineSingleton.clear();
  }
  engineSingleton = null;
  resetBreadthEngine();
  resetSectorStrengthEngine();
  resetVolatilityEngine();
}
