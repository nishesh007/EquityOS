/**
 * Market Context Engine — Sprint 11B.1A.
 * First stage of the institutional trading pipeline.
 * Analyzes overall market context before any stock recommendation.
 */

import type {
  MarketContext,
  MarketContextAnalysisBreakdown,
  MarketContextConfig,
  MarketContextInput,
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
  private readonly config: MarketContextConfig;

  constructor(config?: Partial<MarketContextConfig>) {
    this.config = resolveMarketContextConfig(config);
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

  /** Returns the most recent analyzed context, or null before the first analyze(). */
  getCurrentContext(): MarketContext | null {
    return this.currentContext;
  }

  /** Optional diagnostic breakdown from the last successful analyze(). */
  getLastBreakdown(): MarketContextAnalysisBreakdown | null {
    return this.lastBreakdown;
  }

  getConfiguration(): MarketContextConfig {
    return resolveMarketContextConfig(this.config);
  }

  clear(): void {
    this.currentContext = null;
    this.lastBreakdown = null;
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
}
