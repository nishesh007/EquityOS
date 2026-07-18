/**
 * Darvas Box constants — Sprint 11B.3N.
 * Nicolas Darvas trend-following boxes. BUY only.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const DARVAS_BOX_STRATEGY_ID = "darvas" as const;
export const DARVAS_BOX_STRATEGY_NAME = "Darvas" as const;

export const DEFAULT_DARVAS_BOX_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumDailyCandles: 40,
  minBoxSessions: 5,
  maxBoxSessions: 40,
  /** Max box height as fraction of mid price. */
  maxBoxWidthPct: 0.12,
  /** Min box height as fraction of mid (avoid micro noise). */
  minBoxWidthPct: 0.01,
  /** Resistance touch tolerance. */
  resistanceTouchTolerancePct: 0.004,
  /** Support touch tolerance. */
  supportTouchTolerancePct: 0.004,
  minResistanceTouches: 2,
  minSupportTouches: 2,
  /** Volume contraction: late-box vol ≤ early * this. */
  volumeContractionMaxRatio: 0.85,
  minBreakoutRelativeVolume: 1.25,
  breakoutVolumeMultiple: 1.4,
  breakoutCloseStrengthFraction: 0.55,
  maxExtensionBeyondBoxPct: 0.05,
  minRelativeStrength: 55,
  bullishBreadthMin: 55,
  bullishSectorMin: 55,
  minRegimeConfidence: 65,
  maxVolatilityScore: 55,
  circuitMovePct: 0.06,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    boxQuality: 0.25,
    breakoutQuality: 0.2,
    volumeConfirmation: 0.15,
    trendStructure: 0.1,
    relativeStrength: 0.1,
    sector: 0.1,
    market: 0.05,
    riskReward: 0.05,
  },
  compatibleRegimes: [
    "Strong Bull",
    "Weak Bull",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Strong Bear",
    "Weak Bear",
    "High Volatility",
    "Event Driven",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
  /** Risk ON = Risk On or Neutral for Darvas buys. */
  requireRiskOnOrNeutral: true,
} as const;

export type DarvasBoxConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumDailyCandles: number;
  readonly minBoxSessions: number;
  readonly maxBoxSessions: number;
  readonly maxBoxWidthPct: number;
  readonly minBoxWidthPct: number;
  readonly resistanceTouchTolerancePct: number;
  readonly supportTouchTolerancePct: number;
  readonly minResistanceTouches: number;
  readonly minSupportTouches: number;
  readonly volumeContractionMaxRatio: number;
  readonly minBreakoutRelativeVolume: number;
  readonly breakoutVolumeMultiple: number;
  readonly breakoutCloseStrengthFraction: number;
  readonly maxExtensionBeyondBoxPct: number;
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
    readonly boxQuality: number;
    readonly breakoutQuality: number;
    readonly volumeConfirmation: number;
    readonly trendStructure: number;
    readonly relativeStrength: number;
    readonly sector: number;
    readonly market: number;
    readonly riskReward: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
  readonly requireRiskOnOrNeutral: boolean;
};

export function resolveDarvasBoxConfig(
  partial?: Partial<DarvasBoxConfig> & {
    confidenceWeights?: Partial<DarvasBoxConfig["confidenceWeights"]>;
  }
): DarvasBoxConfig {
  return {
    ...DEFAULT_DARVAS_BOX_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_DARVAS_BOX_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ?? DEFAULT_DARVAS_BOX_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_DARVAS_BOX_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ?? DEFAULT_DARVAS_BOX_CONFIG.blockedRiskModes,
  };
}
