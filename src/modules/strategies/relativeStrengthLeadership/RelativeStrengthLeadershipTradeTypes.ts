/**
 * Relative Strength Leadership Trade Construction — Sprint 11B.3O.
 */

import type { RelativeStrengthLeadershipExplainability } from "./RelativeStrengthLeadershipExplainability";
import type { RelativeStrengthLeadershipInstitutionalScore } from "./RelativeStrengthLeadershipScoring";
import type { RelativeStrengthLeadershipDetection } from "./RelativeStrengthLeadershipTypes";

export type RelativeStrengthLeadershipEntryMode =
  | "momentum_breakout"
  | "pullback_ema20"
  | "vwap_retest"
  | "fifty_two_week_high_breakout"
  | "continuation";

export type RelativeStrengthLeadershipStopMethod =
  | "ema20"
  | "swing_low"
  | "atr"
  | "vwap"
  | "hybrid";

export type RelativeStrengthLeadershipQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type RelativeStrengthLeadershipPositionType = "Swing" | "Position";

export interface RelativeStrengthLeadershipTradeSetup {
  detection: RelativeStrengthLeadershipDetection;
  relativeStrengthScore: number;
  relativeStrengthRank: number;
  sectorRank: number;
  industryRank: number;
  leadershipPercentile: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: RelativeStrengthLeadershipQualityGrade;
  conviction: number;
  signalGrade: string;
  confidence: number;
  holdingPeriod: string;
  positionType: RelativeStrengthLeadershipPositionType;
  warnings: string[];
  positiveReasons: string[];
  negativeReasons: string[];
  neutralReasons: string[];
  institutionalSummary: string[];
  explainability: RelativeStrengthLeadershipExplainability;
  institutionalScore: RelativeStrengthLeadershipInstitutionalScore;
}

export const DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG = {
  entryMode: "momentum_breakout" as RelativeStrengthLeadershipEntryMode,
  stopMethod: "hybrid" as RelativeStrengthLeadershipStopMethod,
  atrStopMultiple: 1.3,
  emaStopBufferPct: 0.0005,
  vwapStopBufferPct: 0.0005,
  swingLookbackBars: 10,
  minimumRiskReward: 2.5,
  targetRMultiples: {
    target1: 3,
    target2: 5,
    finalTarget: 5,
  },
  atrTargetMultiples: {
    target1: 1.5,
    target2: 2.5,
    finalTarget: 4,
  },
  measuredMoveFraction: 1,
  dynamicProjectionBars: 5,
  maxRiskPercentOfPrice: 0.1,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    relativeStrength: 0.3,
    leadershipRank: 0.2,
    trendQuality: 0.15,
    volumeConfirmation: 0.1,
    sectorStrength: 0.1,
    marketRegime: 0.1,
    riskReward: 0.05,
  },
  gradeThresholds: {
    exceptionalMin: 90,
    highMin: 75,
    goodMin: 60,
    averageMin: 45,
  },
  defaultHoldingPeriod: "Swing / RS leadership continuation",
  defaultPositionType: "Swing" as RelativeStrengthLeadershipPositionType,
  preferHigherFinalRr: true,
} as const;

export type RelativeStrengthLeadershipTradeConfig = {
  readonly entryMode: RelativeStrengthLeadershipEntryMode;
  readonly stopMethod: RelativeStrengthLeadershipStopMethod;
  readonly atrStopMultiple: number;
  readonly emaStopBufferPct: number;
  readonly vwapStopBufferPct: number;
  readonly swingLookbackBars: number;
  readonly minimumRiskReward: number;
  readonly targetRMultiples: {
    readonly target1: number;
    readonly target2: number;
    readonly finalTarget: number;
  };
  readonly atrTargetMultiples: {
    readonly target1: number;
    readonly target2: number;
    readonly finalTarget: number;
  };
  readonly measuredMoveFraction: number;
  readonly dynamicProjectionBars: number;
  readonly maxRiskPercentOfPrice: number;
  readonly priceEpsilon: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly qualityWeights: {
    readonly relativeStrength: number;
    readonly leadershipRank: number;
    readonly trendQuality: number;
    readonly volumeConfirmation: number;
    readonly sectorStrength: number;
    readonly marketRegime: number;
    readonly riskReward: number;
  };
  readonly gradeThresholds: {
    readonly exceptionalMin: number;
    readonly highMin: number;
    readonly goodMin: number;
    readonly averageMin: number;
  };
  readonly defaultHoldingPeriod: string;
  readonly defaultPositionType: RelativeStrengthLeadershipPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveRelativeStrengthLeadershipTradeConfig(
  partial?: Partial<RelativeStrengthLeadershipTradeConfig> & {
    targetRMultiples?: Partial<
      RelativeStrengthLeadershipTradeConfig["targetRMultiples"]
    >;
    atrTargetMultiples?: Partial<
      RelativeStrengthLeadershipTradeConfig["atrTargetMultiples"]
    >;
    qualityWeights?: Partial<
      RelativeStrengthLeadershipTradeConfig["qualityWeights"]
    >;
    gradeThresholds?: Partial<
      RelativeStrengthLeadershipTradeConfig["gradeThresholds"]
    >;
  }
): RelativeStrengthLeadershipTradeConfig {
  return {
    ...DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
