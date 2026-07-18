/**
 * Flat Base constants — Sprint 11B.3R.
 * William O'Neil / CAN SLIM flat consolidation. BUY only.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const FLAT_BASE_STRATEGY_ID = "flat-base" as const;
export const FLAT_BASE_STRATEGY_NAME = "Flat Base" as const;

export const DEFAULT_FLAT_BASE_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumDailyCandles: 40,
  /** Prior advance lookback before base. */
  priorAdvanceLookbackBars: 20,
  minPriorAdvancePct: 0.12,
  minBaseDurationBars: 5,
  maxBaseDurationBars: 35,
  maxBaseDepthPct: 0.15,
  /** Prefer higher lows across base. */
  higherLowEpsilonPct: 0.002,
  /** ATR must contract vs prior advance ATR. */
  minAtrContractionFraction: 0.1,
  /** Weekly-style tight closes: max close range / mid. */
  maxCloseRangePct: 0.08,
  minBreakoutRelativeVolume: 1.2,
  breakoutVolumeMultiple: 1.3,
  breakoutCloseStrengthFraction: 0.55,
  maxExtensionBeyondPivotPct: 0.05,
  minRelativeStrength: 52,
  bullishBreadthMin: 50,
  bullishSectorMin: 52,
  minRegimeConfidence: 70,
  maxVolatilityScore: 40,
  circuitMovePct: 0.06,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    baseQuality: 0.25,
    breakoutQuality: 0.2,
    trendQuality: 0.15,
    volumeConfirmation: 0.15,
    relativeStrength: 0.1,
    sector: 0.1,
    riskReward: 0.05,
  },
  compatibleRegimes: [
    "Weak Bull",
    "Sideways",
    "Low Volatility",
    "Strong Bull",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Strong Bear",
    "Weak Bear",
    "High Volatility",
    "Event Driven",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
  requireRiskOnOrNeutral: true,
} as const;

export type FlatBaseConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumDailyCandles: number;
  readonly priorAdvanceLookbackBars: number;
  readonly minPriorAdvancePct: number;
  readonly minBaseDurationBars: number;
  readonly maxBaseDurationBars: number;
  readonly maxBaseDepthPct: number;
  readonly higherLowEpsilonPct: number;
  readonly minAtrContractionFraction: number;
  readonly maxCloseRangePct: number;
  readonly minBreakoutRelativeVolume: number;
  readonly breakoutVolumeMultiple: number;
  readonly breakoutCloseStrengthFraction: number;
  readonly maxExtensionBeyondPivotPct: number;
  readonly minRelativeStrength: number;
  readonly bullishBreadthMin: number;
  readonly bullishSectorMin: number;
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
  readonly circuitMovePct: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly confidenceWeights: {
    readonly baseQuality: number;
    readonly breakoutQuality: number;
    readonly trendQuality: number;
    readonly volumeConfirmation: number;
    readonly relativeStrength: number;
    readonly sector: number;
    readonly riskReward: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
  readonly requireRiskOnOrNeutral: boolean;
};

export function resolveFlatBaseConfig(
  partial?: Partial<FlatBaseConfig> & {
    confidenceWeights?: Partial<FlatBaseConfig["confidenceWeights"]>;
  }
): FlatBaseConfig {
  return {
    ...DEFAULT_FLAT_BASE_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_FLAT_BASE_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ?? DEFAULT_FLAT_BASE_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_FLAT_BASE_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ?? DEFAULT_FLAT_BASE_CONFIG.blockedRiskModes,
  };
}
