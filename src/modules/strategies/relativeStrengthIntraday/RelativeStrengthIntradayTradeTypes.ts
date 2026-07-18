/**
 * Relative Strength Intraday Trade Construction — Sprint 11B.3G.
 */

import type { RelativeStrengthIntradayExplainability } from "./RelativeStrengthIntradayExplainability";
import type { RelativeStrengthIntradayInstitutionalScore } from "./RelativeStrengthIntradayScoring";
import type { RelativeStrengthIntradayDetection } from "./RelativeStrengthIntradayTypes";

export type RelativeStrengthIntradayEntryMode =
  | "momentum_breakout"
  | "intraday_pullback"
  | "vwap_retest"
  | "opening_range_continuation";

export type RelativeStrengthIntradayStopMethod =
  | "atr"
  | "ema20"
  | "swing"
  | "vwap"
  | "hybrid";

export type RelativeStrengthIntradayQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type RelativeStrengthIntradayPositionType = "Scalp" | "Intraday";

export interface RelativeStrengthIntradayTradeSetup {
  detection: RelativeStrengthIntradayDetection;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: RelativeStrengthIntradayQualityGrade;
  holdingPeriod: string;
  positionType: RelativeStrengthIntradayPositionType;
  warnings: string[];
  explainability: RelativeStrengthIntradayExplainability;
  institutionalScore: RelativeStrengthIntradayInstitutionalScore;
}

export const DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG = {
  entryMode: "momentum_breakout" as RelativeStrengthIntradayEntryMode,
  stopMethod: "hybrid" as RelativeStrengthIntradayStopMethod,
  atrStopMultiple: 1,
  emaStopBufferPct: 0.0003,
  swingLookbackBars: 6,
  vwapStopBufferPct: 0.0004,
  minimumRiskReward: 2,
  targetRMultiples: {
    target1: 2,
    target2: 3,
    finalTarget: 3,
  },
  atrTargetMultiples: {
    target1: 1,
    target2: 1.5,
    finalTarget: 2.5,
  },
  dynamicProjectionBars: 4,
  maxRiskPercentOfPrice: 0.03,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  /** Weights sum 1.10 — normalized at scoring. */
  qualityWeights: {
    relativeStrength: 0.25,
    trendQuality: 0.15,
    volume: 0.15,
    sectorStrength: 0.1,
    breadth: 0.1,
    marketRegime: 0.1,
    riskReward: 0.1,
    liquidity: 0.05,
    dataQuality: 0.1,
  },
  gradeThresholds: {
    exceptionalMin: 90,
    highMin: 75,
    goodMin: 60,
    averageMin: 45,
  },
  defaultHoldingPeriod: "Intraday / relative strength leadership window",
  defaultPositionType: "Intraday" as RelativeStrengthIntradayPositionType,
  preferHigherFinalRr: true,
} as const;

export type RelativeStrengthIntradayTradeConfig = {
  readonly entryMode: RelativeStrengthIntradayEntryMode;
  readonly stopMethod: RelativeStrengthIntradayStopMethod;
  readonly atrStopMultiple: number;
  readonly emaStopBufferPct: number;
  readonly swingLookbackBars: number;
  readonly vwapStopBufferPct: number;
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
  readonly dynamicProjectionBars: number;
  readonly maxRiskPercentOfPrice: number;
  readonly priceEpsilon: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly qualityWeights: {
    readonly relativeStrength: number;
    readonly trendQuality: number;
    readonly volume: number;
    readonly sectorStrength: number;
    readonly breadth: number;
    readonly marketRegime: number;
    readonly riskReward: number;
    readonly liquidity: number;
    readonly dataQuality: number;
  };
  readonly gradeThresholds: {
    readonly exceptionalMin: number;
    readonly highMin: number;
    readonly goodMin: number;
    readonly averageMin: number;
  };
  readonly defaultHoldingPeriod: string;
  readonly defaultPositionType: RelativeStrengthIntradayPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveRelativeStrengthIntradayTradeConfig(
  partial?: Partial<RelativeStrengthIntradayTradeConfig> & {
    targetRMultiples?: Partial<
      RelativeStrengthIntradayTradeConfig["targetRMultiples"]
    >;
    atrTargetMultiples?: Partial<
      RelativeStrengthIntradayTradeConfig["atrTargetMultiples"]
    >;
    qualityWeights?: Partial<
      RelativeStrengthIntradayTradeConfig["qualityWeights"]
    >;
    gradeThresholds?: Partial<
      RelativeStrengthIntradayTradeConfig["gradeThresholds"]
    >;
  }
): RelativeStrengthIntradayTradeConfig {
  return {
    ...DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
