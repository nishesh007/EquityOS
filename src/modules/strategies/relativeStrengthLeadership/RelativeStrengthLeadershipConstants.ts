/**
 * Relative Strength Leadership constants — Sprint 11B.3O.
 * William O'Neil / CAN SLIM institutional momentum. BUY only.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID =
  "relative-strength-leadership" as const;
export const RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_NAME =
  "Relative Strength Leadership" as const;

export const DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumDailyCandles: 40,
  minRsScore: 70,
  minRsMomentum: 0.5,
  minLeadershipPercentile: 70,
  minSectorRankPercentile: 60,
  minIndustryRankPercentile: 60,
  nearFiftyTwoWeekHighPct: 0.15,
  minRelativeVolume: 1.15,
  breakoutVolumeMultiple: 1.2,
  bullishBreadthMin: 58,
  bullishSectorMin: 62,
  minRegimeConfidence: 70,
  maxVolatilityScore: 50,
  lateTrendExtensionPct: 0.35,
  circuitMovePct: 0.06,
  rsLookbackBars: 20,
  momentumLookbackBars: 5,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    relativeStrength: 0.3,
    leadershipRank: 0.2,
    trendQuality: 0.15,
    volumeConfirmation: 0.1,
    sector: 0.1,
    market: 0.1,
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
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
  requireRiskOnOrNeutral: true,
} as const;

export type RelativeStrengthLeadershipConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumDailyCandles: number;
  readonly minRsScore: number;
  readonly minRsMomentum: number;
  readonly minLeadershipPercentile: number;
  readonly minSectorRankPercentile: number;
  readonly minIndustryRankPercentile: number;
  readonly nearFiftyTwoWeekHighPct: number;
  readonly minRelativeVolume: number;
  readonly breakoutVolumeMultiple: number;
  readonly bullishBreadthMin: number;
  readonly bullishSectorMin: number;
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
  readonly lateTrendExtensionPct: number;
  readonly circuitMovePct: number;
  readonly rsLookbackBars: number;
  readonly momentumLookbackBars: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly confidenceWeights: {
    readonly relativeStrength: number;
    readonly leadershipRank: number;
    readonly trendQuality: number;
    readonly volumeConfirmation: number;
    readonly sector: number;
    readonly market: number;
    readonly riskReward: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
  readonly requireRiskOnOrNeutral: boolean;
};

export function resolveRelativeStrengthLeadershipConfig(
  partial?: Partial<RelativeStrengthLeadershipConfig> & {
    confidenceWeights?: Partial<
      RelativeStrengthLeadershipConfig["confidenceWeights"]
    >;
  }
): RelativeStrengthLeadershipConfig {
  return {
    ...DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ??
      DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ??
      DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ??
      DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONFIG.blockedRiskModes,
  };
}
