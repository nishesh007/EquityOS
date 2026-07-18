/**
 * Cup & Handle constants — Sprint 11B.3Q.
 * William O'Neil / CAN SLIM continuation base. BUY only.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const CUP_HANDLE_STRATEGY_ID = "cup-and-handle" as const;
export const CUP_HANDLE_STRATEGY_NAME = "Cup & Handle" as const;

export const DEFAULT_CUP_HANDLE_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumDailyCandles: 50,
  minCupDurationBars: 20,
  maxCupDurationBars: 120,
  minCupDepthPct: 0.12,
  maxCupDepthPct: 0.35,
  /** Right peak must recover within this fraction of left peak. */
  rightPeakRecoveryMin: 0.92,
  /** V-shape reject: bottom dwell bars below this → too sharp. */
  minBottomDwellBars: 4,
  /** Bottom zone: within this fraction of cup depth from trough. */
  bottomZoneFraction: 0.25,
  /** Max mid-cup slope asymmetry for rounded U. */
  maxVShapeAsymmetry: 0.55,
  minHandleDurationBars: 3,
  maxHandleDurationBars: 25,
  maxHandleDepthPct: 0.15,
  /** Handle must stay in upper half of cup. */
  handleUpperHalfMin: 0.5,
  handleVolumeDeclineMaxRatio: 0.9,
  handleMaxRangePct: 0.08,
  minBreakoutRelativeVolume: 1.25,
  breakoutVolumeMultiple: 1.35,
  breakoutCloseStrengthFraction: 0.55,
  maxExtensionBeyondPivotPct: 0.05,
  minRelativeStrength: 55,
  nearFiftyTwoWeekHighPct: 0.2,
  bullishBreadthMin: 55,
  bullishSectorMin: 55,
  minRegimeConfidence: 72,
  maxVolatilityScore: 45,
  circuitMovePct: 0.06,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    cupQuality: 0.25,
    handleQuality: 0.2,
    breakoutQuality: 0.2,
    volumeConfirmation: 0.1,
    relativeStrength: 0.1,
    sector: 0.1,
    riskReward: 0.05,
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
  requireRiskOnOrNeutral: true,
} as const;

export type CupHandleConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumDailyCandles: number;
  readonly minCupDurationBars: number;
  readonly maxCupDurationBars: number;
  readonly minCupDepthPct: number;
  readonly maxCupDepthPct: number;
  readonly rightPeakRecoveryMin: number;
  readonly minBottomDwellBars: number;
  readonly bottomZoneFraction: number;
  readonly maxVShapeAsymmetry: number;
  readonly minHandleDurationBars: number;
  readonly maxHandleDurationBars: number;
  readonly maxHandleDepthPct: number;
  readonly handleUpperHalfMin: number;
  readonly handleVolumeDeclineMaxRatio: number;
  readonly handleMaxRangePct: number;
  readonly minBreakoutRelativeVolume: number;
  readonly breakoutVolumeMultiple: number;
  readonly breakoutCloseStrengthFraction: number;
  readonly maxExtensionBeyondPivotPct: number;
  readonly minRelativeStrength: number;
  readonly nearFiftyTwoWeekHighPct: number;
  readonly bullishBreadthMin: number;
  readonly bullishSectorMin: number;
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
  readonly circuitMovePct: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly confidenceWeights: {
    readonly cupQuality: number;
    readonly handleQuality: number;
    readonly breakoutQuality: number;
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

export function resolveCupHandleConfig(
  partial?: Partial<CupHandleConfig> & {
    confidenceWeights?: Partial<CupHandleConfig["confidenceWeights"]>;
  }
): CupHandleConfig {
  return {
    ...DEFAULT_CUP_HANDLE_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_CUP_HANDLE_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ?? DEFAULT_CUP_HANDLE_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_CUP_HANDLE_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ?? DEFAULT_CUP_HANDLE_CONFIG.blockedRiskModes,
  };
}
