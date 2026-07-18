/**
 * 52-Week High Breakout Trade Construction — Sprint 11B.3S.
 */

import type { FiftyTwoWeekHighExplainability } from "./FiftyTwoWeekHighExplainability";
import type { FiftyTwoWeekHighInstitutionalScore } from "./FiftyTwoWeekHighScoring";
import type { FiftyTwoWeekHighDetection } from "./FiftyTwoWeekHighTypes";

export type FiftyTwoWeekHighEntryMode =
  | "fresh_breakout"
  | "first_pullback"
  | "vwap_retest"
  | "continuation_entry";

export type FiftyTwoWeekHighStopMethod =
  | "breakout_level"
  | "ema20"
  | "atr"
  | "vwap"
  | "swing_low"
  | "hybrid";

export type FiftyTwoWeekHighQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type FiftyTwoWeekHighPositionType = "Swing" | "Position";

export interface FiftyTwoWeekHighTradeSetup {
  detection: FiftyTwoWeekHighDetection;
  previous52WeekHigh: number;
  currentBreakoutLevel: number;
  breakoutAge: number;
  distanceFromBreakout: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: FiftyTwoWeekHighQualityGrade;
  conviction: number;
  signalGrade: string;
  confidence: number;
  holdingPeriod: string;
  positionType: FiftyTwoWeekHighPositionType;
  warnings: string[];
  positiveReasons: string[];
  negativeReasons: string[];
  neutralReasons: string[];
  institutionalSummary: string[];
  explainability: FiftyTwoWeekHighExplainability;
  institutionalScore: FiftyTwoWeekHighInstitutionalScore;
}

export const DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG = {
  entryMode: "fresh_breakout" as FiftyTwoWeekHighEntryMode,
  stopMethod: "hybrid" as FiftyTwoWeekHighStopMethod,
  atrStopMultiple: 1.5,
  breakoutStopBufferPct: 0.001,
  emaStopBufferPct: 0.0005,
  vwapStopBufferPct: 0.0005,
  swingLowStopBufferPct: 0.001,
  minimumRiskReward: 2.5,
  targetRMultiples: {
    target1: 2,
    target2: 3,
    finalTarget: 5,
  },
  atrTargetMultiples: {
    target1: 1.5,
    target2: 2.5,
    finalTarget: 4,
  },
  measuredMoveFraction: 1,
  dynamicProjectionBars: 5,
  trailingStopAtrMultiple: 2,
  maxRiskPercentOfPrice: 0.1,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    breakoutQuality: 0.25,
    trendQuality: 0.2,
    relativeStrength: 0.15,
    volumeConfirmation: 0.15,
    sectorLeadership: 0.1,
    marketRegime: 0.1,
    riskReward: 0.05,
  },
  gradeThresholds: {
    exceptionalMin: 90,
    highMin: 75,
    goodMin: 60,
    averageMin: 45,
  },
  defaultHoldingPeriod: "Swing / 52-week high momentum",
  defaultPositionType: "Swing" as FiftyTwoWeekHighPositionType,
  preferHigherFinalRr: true,
} as const;

export type FiftyTwoWeekHighTradeConfig = {
  readonly entryMode: FiftyTwoWeekHighEntryMode;
  readonly stopMethod: FiftyTwoWeekHighStopMethod;
  readonly atrStopMultiple: number;
  readonly breakoutStopBufferPct: number;
  readonly emaStopBufferPct: number;
  readonly vwapStopBufferPct: number;
  readonly swingLowStopBufferPct: number;
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
  readonly trailingStopAtrMultiple: number;
  readonly maxRiskPercentOfPrice: number;
  readonly priceEpsilon: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly qualityWeights: {
    readonly breakoutQuality: number;
    readonly trendQuality: number;
    readonly relativeStrength: number;
    readonly volumeConfirmation: number;
    readonly sectorLeadership: number;
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
  readonly defaultPositionType: FiftyTwoWeekHighPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveFiftyTwoWeekHighTradeConfig(
  partial?: Partial<FiftyTwoWeekHighTradeConfig> & {
    targetRMultiples?: Partial<
      FiftyTwoWeekHighTradeConfig["targetRMultiples"]
    >;
    atrTargetMultiples?: Partial<
      FiftyTwoWeekHighTradeConfig["atrTargetMultiples"]
    >;
    qualityWeights?: Partial<FiftyTwoWeekHighTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<FiftyTwoWeekHighTradeConfig["gradeThresholds"]>;
  }
): FiftyTwoWeekHighTradeConfig {
  return {
    ...DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
