/**
 * Relative Strength Intraday constants — Sprint 11B.3G.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID = "relative-strength" as const;
export const RELATIVE_STRENGTH_INTRADAY_STRATEGY_NAME =
  "Relative Strength Intraday" as const;

export const DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumSessionCandles: 8,
  trendLookbackBars: 8,
  /** Minimum stock RS score (0–100). */
  minRelativeStrengthScore: 60,
  /** Stock must beat benchmark by this margin (score points). */
  minBenchmarkOutperformance: 5,
  /** Stock must beat sector by this margin (score points). */
  minSectorOutperformance: 3,
  minEmaSeparationPct: 0.0008,
  flatEmaSlopePct: 0.0003,
  emaSlopeLookback: 4,
  minRelativeVolume: 1.0,
  preferredRelativeVolume: 1.2,
  volumeConfirmationMultiple: 1.15,
  circuitMovePct: 0.05,
  bullishBreadthMin: 52,
  bearishBreadthMax: 48,
  bullishSectorMin: 58,
  bearishSectorMax: 42,
  minRegimeConfidence: 68,
  maxVolatilityScore: 65,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    relativeStrength: 0.25,
    trendQuality: 0.15,
    volume: 0.15,
    sector: 0.1,
    breadth: 0.1,
    market: 0.1,
    vwap: 0.1,
    ema: 0.05,
  },
  compatibleRegimes: [
    "Strong Bull",
    "Weak Bull",
    "Strong Bear",
    "Weak Bear",
    "Low Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Sideways",
    "High Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  bullBlockedRegimes: [
    "Strong Bear",
    "Weak Bear",
  ] as const satisfies readonly MarketRegimeLabel[],
  bearBlockedRegimes: [
    "Strong Bull",
    "Weak Bull",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
} as const;

export type RelativeStrengthIntradayConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumSessionCandles: number;
  readonly trendLookbackBars: number;
  readonly minRelativeStrengthScore: number;
  readonly minBenchmarkOutperformance: number;
  readonly minSectorOutperformance: number;
  readonly minEmaSeparationPct: number;
  readonly flatEmaSlopePct: number;
  readonly emaSlopeLookback: number;
  readonly minRelativeVolume: number;
  readonly preferredRelativeVolume: number;
  readonly volumeConfirmationMultiple: number;
  readonly circuitMovePct: number;
  readonly bullishBreadthMin: number;
  readonly bearishBreadthMax: number;
  readonly bullishSectorMin: number;
  readonly bearishSectorMax: number;
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly confidenceWeights: {
    readonly relativeStrength: number;
    readonly trendQuality: number;
    readonly volume: number;
    readonly sector: number;
    readonly breadth: number;
    readonly market: number;
    readonly vwap: number;
    readonly ema: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly bullBlockedRegimes: readonly MarketRegimeLabel[];
  readonly bearBlockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export function resolveRelativeStrengthIntradayConfig(
  partial?: Partial<RelativeStrengthIntradayConfig> & {
    confidenceWeights?: Partial<
      RelativeStrengthIntradayConfig["confidenceWeights"]
    >;
  }
): RelativeStrengthIntradayConfig {
  return {
    ...DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ??
      DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ??
      DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG.blockedRegimes,
    bullBlockedRegimes:
      partial?.bullBlockedRegimes ??
      DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG.bullBlockedRegimes,
    bearBlockedRegimes:
      partial?.bearBlockedRegimes ??
      DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG.bearBlockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ??
      DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG.blockedRiskModes,
  };
}
