/**
 * VCP (Volatility Contraction Pattern) constants — Sprint 11B.3L.
 * Inspired by Mark Minervini. BUY only.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const VCP_STRATEGY_ID = "vcp" as const;
export const VCP_STRATEGY_NAME = "VCP" as const;

export const DEFAULT_VCP_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumSessionCandles: 30,
  minContractions: 2,
  maxContractions: 6,
  /** Each contraction range must be ≤ prior * this factor. */
  contractionShrinkFactor: 0.85,
  /** Min higher-low improvement between contractions. */
  higherLowEpsilonPct: 0.0005,
  /** ATR must decline across base by at least this fraction. */
  minAtrDeclineFraction: 0.15,
  /** Average range decline across base. */
  minRangeDeclineFraction: 0.15,
  /** Volume dry-up: late-base volume ≤ early * this. */
  volumeDryUpMaxRatio: 0.75,
  /** Breakout RVOL minimum. */
  minBreakoutRelativeVolume: 1.2,
  breakoutVolumeMultiple: 1.4,
  /** Breakout close in upper fraction of bar. */
  breakoutCloseStrengthFraction: 0.55,
  /** Reject if price already extended this far beyond pivot. */
  maxExtensionBeyondPivotPct: 0.04,
  /** Price should be near 52-week high within this fraction below. */
  nearFiftyTwoWeekHighPct: 0.15,
  minEmaSeparationPct: 0.0005,
  circuitMovePct: 0.05,
  bullishBreadthMin: 50,
  bullishSectorMin: 55,
  minRegimeConfidence: 65,
  maxVolatilityScore: 55,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    patternQuality: 0.25,
    contractionQuality: 0.2,
    volumeDryUp: 0.15,
    breakoutQuality: 0.15,
    sector: 0.1,
    market: 0.1,
    vwap: 0.05,
  },
  compatibleRegimes: [
    "Strong Bull",
    "Weak Bull",
    "Low Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Strong Bear",
    "Weak Bear",
    "High Volatility",
    "Event Driven",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
} as const;

export type VCPConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumSessionCandles: number;
  readonly minContractions: number;
  readonly maxContractions: number;
  readonly contractionShrinkFactor: number;
  readonly higherLowEpsilonPct: number;
  readonly minAtrDeclineFraction: number;
  readonly minRangeDeclineFraction: number;
  readonly volumeDryUpMaxRatio: number;
  readonly minBreakoutRelativeVolume: number;
  readonly breakoutVolumeMultiple: number;
  readonly breakoutCloseStrengthFraction: number;
  readonly maxExtensionBeyondPivotPct: number;
  readonly nearFiftyTwoWeekHighPct: number;
  readonly minEmaSeparationPct: number;
  readonly circuitMovePct: number;
  readonly bullishBreadthMin: number;
  readonly bullishSectorMin: number;
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly confidenceWeights: {
    readonly patternQuality: number;
    readonly contractionQuality: number;
    readonly volumeDryUp: number;
    readonly breakoutQuality: number;
    readonly sector: number;
    readonly market: number;
    readonly vwap: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export function resolveVCPConfig(
  partial?: Partial<VCPConfig> & {
    confidenceWeights?: Partial<VCPConfig["confidenceWeights"]>;
  }
): VCPConfig {
  return {
    ...DEFAULT_VCP_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_VCP_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ?? DEFAULT_VCP_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_VCP_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ?? DEFAULT_VCP_CONFIG.blockedRiskModes,
  };
}
