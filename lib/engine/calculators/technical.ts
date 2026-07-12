/**
 * Technical analysis calculator — delegates to Sprint 8B Technical Engine.
 * All indicators are computed from OHLCV candles via MarketDataService.
 */

import type { PricePoint } from "@/types";
import {
  buildTechnicalAnalysisFromMarketData,
  calculateTechnicalScoreFromAnalysis,
  type TechnicalBuildResult,
} from "@/lib/technical/engine";
import type { CompanyProfile, TechnicalAnalysis, TradingData } from "@/types";

export type { TechnicalBuildResult };

export interface TechnicalAnalysisOptions {
  priceHistory?: PricePoint[];
}

/**
 * Builds technical indicators and computes the Technical Score centrally.
 */
export function buildTechnicalAnalysis(
  profile: CompanyProfile,
  trading: TradingData,
  options?: TechnicalAnalysisOptions
): TechnicalBuildResult {
  return buildTechnicalAnalysisFromMarketData({
    profile,
    trading,
    priceHistory: options?.priceHistory,
  });
}

export { calculateTechnicalScoreFromAnalysis };
