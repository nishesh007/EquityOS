/**
 * Earnings Momentum constants — Sprint 11B.3T.
 * Institutional earnings quality / surprise momentum. BUY + SELL.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const EARNINGS_MOMENTUM_STRATEGY_ID = "earnings-momentum" as const;
export const EARNINGS_MOMENTUM_STRATEGY_NAME = "Earnings Momentum" as const;

export const DEFAULT_EARNINGS_MOMENTUM_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumDailyCandles: 10,
  /** Minimum EPS surprise fraction for BUY (e.g. 0.05 = 5%). */
  minEpsSurpriseBuy: 0.05,
  /** Minimum revenue surprise fraction for BUY. */
  minRevenueSurpriseBuy: 0.02,
  /** EPS surprise at or below this triggers SELL candidate. */
  maxEpsSurpriseSell: -0.05,
  /** Revenue surprise at or below this reinforces SELL. */
  maxRevenueSurpriseSell: -0.02,
  minYoyGrowthBuy: 0.08,
  minQoqGrowthBuy: 0.02,
  minMarginExpansionBuy: 0,
  maxMarginContractionSell: -0.005,
  minRelativeVolume: 1.2,
  volumeConfirmationMultiple: 1.25,
  minRelativeStrengthBuy: 55,
  maxRelativeStrengthSell: 45,
  bullishBreadthMin: 50,
  bearishBreadthMax: 50,
  bullishSectorMin: 55,
  bearishSectorMax: 45,
  minRegimeConfidence: 65,
  maxVolatilityScore: 70,
  circuitMovePct: 0.08,
  minAverageVolume: 100_000,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    earningsQuality: 0.3,
    guidanceQuality: 0.2,
    priceConfirmation: 0.15,
    volumeConfirmation: 0.1,
    relativeStrength: 0.1,
    sectorStrength: 0.1,
    riskReward: 0.05,
  },
  compatibleRegimes: [
    "Strong Bull",
    "Weak Bull",
    "Event Driven",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Strong Bear",
    "Low Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
  /** BUY requires Risk On; SELL only blocks Risk Off. */
  requireRiskOnForBuy: true,
} as const;

export type EarningsMomentumConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumDailyCandles: number;
  readonly minEpsSurpriseBuy: number;
  readonly minRevenueSurpriseBuy: number;
  readonly maxEpsSurpriseSell: number;
  readonly maxRevenueSurpriseSell: number;
  readonly minYoyGrowthBuy: number;
  readonly minQoqGrowthBuy: number;
  readonly minMarginExpansionBuy: number;
  readonly maxMarginContractionSell: number;
  readonly minRelativeVolume: number;
  readonly volumeConfirmationMultiple: number;
  readonly minRelativeStrengthBuy: number;
  readonly maxRelativeStrengthSell: number;
  readonly bullishBreadthMin: number;
  readonly bearishBreadthMax: number;
  readonly bullishSectorMin: number;
  readonly bearishSectorMax: number;
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
  readonly circuitMovePct: number;
  readonly minAverageVolume: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly confidenceWeights: {
    readonly earningsQuality: number;
    readonly guidanceQuality: number;
    readonly priceConfirmation: number;
    readonly volumeConfirmation: number;
    readonly relativeStrength: number;
    readonly sectorStrength: number;
    readonly riskReward: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
  readonly requireRiskOnForBuy: boolean;
};

export function resolveEarningsMomentumConfig(
  partial?: Partial<EarningsMomentumConfig> & {
    confidenceWeights?: Partial<EarningsMomentumConfig["confidenceWeights"]>;
  }
): EarningsMomentumConfig {
  return {
    ...DEFAULT_EARNINGS_MOMENTUM_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_EARNINGS_MOMENTUM_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ??
      DEFAULT_EARNINGS_MOMENTUM_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ??
      DEFAULT_EARNINGS_MOMENTUM_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ??
      DEFAULT_EARNINGS_MOMENTUM_CONFIG.blockedRiskModes,
  };
}
