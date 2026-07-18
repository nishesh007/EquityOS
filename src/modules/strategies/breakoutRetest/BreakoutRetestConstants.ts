/**
 * Breakout Retest constants — Sprint 11B.3I.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const BREAKOUT_RETEST_STRATEGY_ID = "breakout-retest" as const;
export const BREAKOUT_RETEST_STRATEGY_NAME = "Breakout Retest" as const;

export const DEFAULT_BREAKOUT_RETEST_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumSessionCandles: 10,
  breakoutLookbackBars: 10,
  retestLookbackBars: 6,
  /** Min breakout penetration beyond level as fraction of price / ATR. */
  minBreakoutPenetrationPct: 0.0015,
  minBreakoutPenetrationAtrMultiple: 0.2,
  /** Breakout close must be in top/bottom fraction of candle. */
  breakoutCloseStrengthFraction: 0.6,
  /** Retest must touch within this fraction of breakout level. */
  retestTouchTolerancePct: 0.0025,
  /** Max retest depth below/above breakout as fraction of breakout move. */
  maxRetestDepthFraction: 0.55,
  /** Max bars allowed for retest window. */
  maxRetestBars: 5,
  /** Volume expansion on breakout vs prior average. */
  breakoutVolumeMultiple: 1.3,
  /** Volume contraction on retest vs breakout bar. */
  retestVolumeContractionMax: 0.9,
  minRelativeVolume: 1.0,
  preferredRelativeVolume: 1.2,
  minEmaSeparationPct: 0.0006,
  circuitMovePct: 0.05,
  bullishBreadthMin: 55,
  bearishBreadthMax: 45,
  bullishSectorMin: 55,
  bearishSectorMax: 45,
  minRegimeConfidence: 70,
  maxVolatilityScore: 70,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    breakoutQuality: 0.2,
    retestQuality: 0.2,
    volume: 0.15,
    trendStructure: 0.1,
    breadth: 0.1,
    sector: 0.1,
    market: 0.1,
    vwap: 0.05,
  },
  compatibleRegimes: [
    "Strong Bull",
    "Weak Bull",
    "Strong Bear",
    "Weak Bear",
    "Event Driven",
    "High Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Sideways",
    "Low Volatility",
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

export type BreakoutRetestConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumSessionCandles: number;
  readonly breakoutLookbackBars: number;
  readonly retestLookbackBars: number;
  readonly minBreakoutPenetrationPct: number;
  readonly minBreakoutPenetrationAtrMultiple: number;
  readonly breakoutCloseStrengthFraction: number;
  readonly retestTouchTolerancePct: number;
  readonly maxRetestDepthFraction: number;
  readonly maxRetestBars: number;
  readonly breakoutVolumeMultiple: number;
  readonly retestVolumeContractionMax: number;
  readonly minRelativeVolume: number;
  readonly preferredRelativeVolume: number;
  readonly minEmaSeparationPct: number;
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
    readonly breakoutQuality: number;
    readonly retestQuality: number;
    readonly volume: number;
    readonly trendStructure: number;
    readonly breadth: number;
    readonly sector: number;
    readonly market: number;
    readonly vwap: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly bullBlockedRegimes: readonly MarketRegimeLabel[];
  readonly bearBlockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export function resolveBreakoutRetestConfig(
  partial?: Partial<BreakoutRetestConfig> & {
    confidenceWeights?: Partial<BreakoutRetestConfig["confidenceWeights"]>;
  }
): BreakoutRetestConfig {
  return {
    ...DEFAULT_BREAKOUT_RETEST_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_BREAKOUT_RETEST_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ?? DEFAULT_BREAKOUT_RETEST_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_BREAKOUT_RETEST_CONFIG.blockedRegimes,
    bullBlockedRegimes:
      partial?.bullBlockedRegimes ??
      DEFAULT_BREAKOUT_RETEST_CONFIG.bullBlockedRegimes,
    bearBlockedRegimes:
      partial?.bearBlockedRegimes ??
      DEFAULT_BREAKOUT_RETEST_CONFIG.bearBlockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ?? DEFAULT_BREAKOUT_RETEST_CONFIG.blockedRiskModes,
  };
}
