/**
 * 52-Week High Breakout constants — Sprint 11B.3S.
 * O'Neil / Minervini institutional momentum. BUY only.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const FIFTY_TWO_WEEK_HIGH_STRATEGY_ID = "fifty-two-week-high" as const;
export const FIFTY_TWO_WEEK_HIGH_STRATEGY_NAME = "52 Week High" as const;

export const DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumDailyCandles: 40,
  /** Trading days used to derive 52-week high when not provided. */
  fiftyTwoWeekLookbackBars: 252,
  /** Fresh breakout must occur within this many bars. */
  maxBreakoutAgeBars: 3,
  /** Reject if close is more than this many ATRs above breakout. */
  maxExtensionAtrMultiple: 2.5,
  minBreakoutRelativeVolume: 1.25,
  breakoutVolumeMultiple: 1.35,
  breakoutCloseStrengthFraction: 0.55,
  minRelativeStrength: 60,
  bullishBreadthMin: 60,
  bullishSectorMin: 60,
  minRegimeConfidence: 75,
  maxVolatilityScore: 50,
  circuitMovePct: 0.06,
  minAverageVolume: 100_000,
  distributionLookbackBars: 10,
  maxDistributionDays: 4,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    breakoutQuality: 0.25,
    trendQuality: 0.2,
    relativeStrength: 0.15,
    volumeConfirmation: 0.15,
    sectorLeadership: 0.1,
    marketRegime: 0.1,
    riskReward: 0.05,
  },
  compatibleRegimes: [
    "Strong Bull",
    "Weak Bull",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Strong Bear",
    "Weak Bear",
    "Sideways",
    "High Volatility",
    "Low Volatility",
    "Event Driven",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
  requireRiskOn: true,
} as const;

export type FiftyTwoWeekHighConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumDailyCandles: number;
  readonly fiftyTwoWeekLookbackBars: number;
  readonly maxBreakoutAgeBars: number;
  readonly maxExtensionAtrMultiple: number;
  readonly minBreakoutRelativeVolume: number;
  readonly breakoutVolumeMultiple: number;
  readonly breakoutCloseStrengthFraction: number;
  readonly minRelativeStrength: number;
  readonly bullishBreadthMin: number;
  readonly bullishSectorMin: number;
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
  readonly circuitMovePct: number;
  readonly minAverageVolume: number;
  readonly distributionLookbackBars: number;
  readonly maxDistributionDays: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly confidenceWeights: {
    readonly breakoutQuality: number;
    readonly trendQuality: number;
    readonly relativeStrength: number;
    readonly volumeConfirmation: number;
    readonly sectorLeadership: number;
    readonly marketRegime: number;
    readonly riskReward: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
  readonly requireRiskOn: boolean;
};

export function resolveFiftyTwoWeekHighConfig(
  partial?: Partial<FiftyTwoWeekHighConfig> & {
    confidenceWeights?: Partial<FiftyTwoWeekHighConfig["confidenceWeights"]>;
  }
): FiftyTwoWeekHighConfig {
  return {
    ...DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ??
      DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ??
      DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ??
      DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG.blockedRiskModes,
  };
}
