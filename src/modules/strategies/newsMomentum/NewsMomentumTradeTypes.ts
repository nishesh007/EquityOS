/**
 * News Momentum Trade Construction — Sprint 11B.3K.
 */

import type { NewsMomentumExplainability } from "./NewsMomentumExplainability";
import type { NewsMomentumInstitutionalScore } from "./NewsMomentumScoring";
import type {
  NewsCatalystType,
  NewsMomentumDetection,
} from "./NewsMomentumTypes";

export type NewsMomentumEntryMode =
  | "confirmation"
  | "opening_breakout"
  | "pullback"
  | "vwap_retest"
  | "momentum_continuation";

export type NewsMomentumStopMethod =
  | "atr"
  | "vwap"
  | "swing"
  | "ema20"
  | "hybrid";

export type NewsMomentumQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type NewsMomentumPositionType = "Scalp" | "Intraday";

export interface NewsMomentumTradeSetup {
  detection: NewsMomentumDetection;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: NewsMomentumQualityGrade;
  catalystType: NewsCatalystType;
  catalystStrength: number;
  holdingPeriod: string;
  positionType: NewsMomentumPositionType;
  warnings: string[];
  explainability: NewsMomentumExplainability;
  institutionalScore: NewsMomentumInstitutionalScore;
}

export const DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG = {
  entryMode: "confirmation" as NewsMomentumEntryMode,
  stopMethod: "hybrid" as NewsMomentumStopMethod,
  atrStopMultiple: 1.1,
  emaStopBufferPct: 0.0004,
  swingLookbackBars: 5,
  vwapStopBufferPct: 0.0005,
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
  measuredMoveFraction: 1,
  gapProjectionMultiple: 1,
  dynamicProjectionBars: 4,
  maxRiskPercentOfPrice: 0.04,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    newsQuality: 0.3,
    priceConfirmation: 0.15,
    volumeConfirmation: 0.15,
    sectorStrength: 0.1,
    breadth: 0.1,
    marketRegime: 0.1,
    riskReward: 0.1,
  },
  gradeThresholds: {
    exceptionalMin: 90,
    highMin: 75,
    goodMin: 60,
    averageMin: 45,
  },
  defaultHoldingPeriod: "Intraday / news catalyst momentum window",
  defaultPositionType: "Intraday" as NewsMomentumPositionType,
  preferHigherFinalRr: true,
} as const;

export type NewsMomentumTradeConfig = {
  readonly entryMode: NewsMomentumEntryMode;
  readonly stopMethod: NewsMomentumStopMethod;
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
  readonly measuredMoveFraction: number;
  readonly gapProjectionMultiple: number;
  readonly dynamicProjectionBars: number;
  readonly maxRiskPercentOfPrice: number;
  readonly priceEpsilon: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly qualityWeights: {
    readonly newsQuality: number;
    readonly priceConfirmation: number;
    readonly volumeConfirmation: number;
    readonly sectorStrength: number;
    readonly breadth: number;
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
  readonly defaultPositionType: NewsMomentumPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveNewsMomentumTradeConfig(
  partial?: Partial<NewsMomentumTradeConfig> & {
    targetRMultiples?: Partial<NewsMomentumTradeConfig["targetRMultiples"]>;
    atrTargetMultiples?: Partial<NewsMomentumTradeConfig["atrTargetMultiples"]>;
    qualityWeights?: Partial<NewsMomentumTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<NewsMomentumTradeConfig["gradeThresholds"]>;
  }
): NewsMomentumTradeConfig {
  return {
    ...DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
