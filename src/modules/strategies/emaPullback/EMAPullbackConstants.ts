/**
 * EMA Pullback constants — Sprint 11B.3P.
 * Institutional trend pullback continuation. BUY + SELL.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const EMA_PULLBACK_STRATEGY_ID = "ema-pullback" as const;
export const EMA_PULLBACK_STRATEGY_NAME = "EMA Pullback" as const;

export const DEFAULT_EMA_PULLBACK_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumDailyCandles: 30,
  minimumIntradayCandles: 8,
  trendLookbackBars: 10,
  pullbackLookbackBars: 4,
  maxPullbackFraction: 0.65,
  maxPullbackAtrMultiple: 2.5,
  deepCorrectionFraction: 0.85,
  emaTouchTolerancePct: 0.008,
  vwapTouchTolerancePct: 0.006,
  minAdx: 20,
  minEmaSlopePct: 0.0004,
  emaSlopeLookback: 4,
  minRelativeVolume: 0.85,
  preferredRelativeVolume: 1.1,
  pullbackVolumeMaxMultiple: 1.15,
  confirmationVolumeMultiple: 1.1,
  highVolumeSellingMultiple: 1.6,
  minRelativeStrength: 50,
  bullishBreadthMin: 52,
  bearishBreadthMax: 48,
  bullishSectorMin: 52,
  bearishSectorMax: 48,
  minRegimeConfidence: 68,
  maxVolatilityScore: 55,
  circuitMovePct: 0.06,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    trendQuality: 0.25,
    pullbackQuality: 0.2,
    emaAlignment: 0.15,
    volumeQuality: 0.1,
    sector: 0.1,
    market: 0.1,
    riskReward: 0.1,
  },
  compatibleBullRegimes: [
    "Strong Bull",
    "Weak Bull",
    "Low Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  compatibleBearRegimes: [
    "Strong Bear",
    "Weak Bear",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Sideways",
    "Event Driven",
    "High Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
} as const;

export type EMAPullbackConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumDailyCandles: number;
  readonly minimumIntradayCandles: number;
  readonly trendLookbackBars: number;
  readonly pullbackLookbackBars: number;
  readonly maxPullbackFraction: number;
  readonly maxPullbackAtrMultiple: number;
  readonly deepCorrectionFraction: number;
  readonly emaTouchTolerancePct: number;
  readonly vwapTouchTolerancePct: number;
  readonly minAdx: number;
  readonly minEmaSlopePct: number;
  readonly emaSlopeLookback: number;
  readonly minRelativeVolume: number;
  readonly preferredRelativeVolume: number;
  readonly pullbackVolumeMaxMultiple: number;
  readonly confirmationVolumeMultiple: number;
  readonly highVolumeSellingMultiple: number;
  readonly minRelativeStrength: number;
  readonly bullishBreadthMin: number;
  readonly bearishBreadthMax: number;
  readonly bullishSectorMin: number;
  readonly bearishSectorMax: number;
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
  readonly circuitMovePct: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly confidenceWeights: {
    readonly trendQuality: number;
    readonly pullbackQuality: number;
    readonly emaAlignment: number;
    readonly volumeQuality: number;
    readonly sector: number;
    readonly market: number;
    readonly riskReward: number;
  };
  readonly compatibleBullRegimes: readonly MarketRegimeLabel[];
  readonly compatibleBearRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export function resolveEMAPullbackConfig(
  partial?: Partial<EMAPullbackConfig> & {
    confidenceWeights?: Partial<EMAPullbackConfig["confidenceWeights"]>;
  }
): EMAPullbackConfig {
  return {
    ...DEFAULT_EMA_PULLBACK_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_EMA_PULLBACK_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleBullRegimes:
      partial?.compatibleBullRegimes ??
      DEFAULT_EMA_PULLBACK_CONFIG.compatibleBullRegimes,
    compatibleBearRegimes:
      partial?.compatibleBearRegimes ??
      DEFAULT_EMA_PULLBACK_CONFIG.compatibleBearRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_EMA_PULLBACK_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ?? DEFAULT_EMA_PULLBACK_CONFIG.blockedRiskModes,
  };
}
