/**
 * Momentum Continuation Trade Construction config & contracts — Sprint 11B.3F.
 */

import type { MomentumContinuationExplainability } from "./MomentumContinuationExplainability";
import type { MomentumContinuationInstitutionalScore } from "./MomentumContinuationScoring";
import type { MomentumContinuationDetection } from "./MomentumContinuationTypes";

export type MomentumContinuationEntryMode =
  | "breakout_close"
  | "confirmation"
  | "retest";

export type MomentumContinuationStopMethod =
  | "pullback"
  | "atr"
  | "ema20"
  | "hybrid";

export type MomentumContinuationQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type MomentumContinuationPositionType = "Scalp" | "Intraday";

export interface MomentumContinuationTradeSetup {
  detection: MomentumContinuationDetection;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: MomentumContinuationQualityGrade;
  holdingPeriod: string;
  positionType: MomentumContinuationPositionType;
  warnings: string[];
  explainability: MomentumContinuationExplainability;
  institutionalScore: MomentumContinuationInstitutionalScore;
}

export const DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG = {
  entryMode: "confirmation" as MomentumContinuationEntryMode,
  stopMethod: "hybrid" as MomentumContinuationStopMethod,
  atrStopMultiple: 1,
  pullbackStopBufferPct: 0.0005,
  emaStopBufferPct: 0.0003,
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
  dynamicProjectionBars: 4,
  maxRiskPercentOfPrice: 0.03,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    trendStrength: 0.2,
    pullbackQuality: 0.15,
    volumeConfirmation: 0.15,
    adxStrength: 0.15,
    breadth: 0.1,
    sectorStrength: 0.1,
    marketRegime: 0.1,
    riskReward: 0.05,
    liquidity: 0.05,
  },
  gradeThresholds: {
    exceptionalMin: 90,
    highMin: 75,
    goodMin: 60,
    averageMin: 45,
  },
  defaultHoldingPeriod: "Scalp / momentum continuation window",
  defaultPositionType: "Scalp" as MomentumContinuationPositionType,
  preferHigherFinalRr: true,
} as const;

export type MomentumContinuationTradeConfig = {
  readonly entryMode: MomentumContinuationEntryMode;
  readonly stopMethod: MomentumContinuationStopMethod;
  readonly atrStopMultiple: number;
  readonly pullbackStopBufferPct: number;
  readonly emaStopBufferPct: number;
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
    readonly trendStrength: number;
    readonly pullbackQuality: number;
    readonly volumeConfirmation: number;
    readonly adxStrength: number;
    readonly breadth: number;
    readonly sectorStrength: number;
    readonly marketRegime: number;
    readonly riskReward: number;
    readonly liquidity: number;
  };
  readonly gradeThresholds: {
    readonly exceptionalMin: number;
    readonly highMin: number;
    readonly goodMin: number;
    readonly averageMin: number;
  };
  readonly defaultHoldingPeriod: string;
  readonly defaultPositionType: MomentumContinuationPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveMomentumContinuationTradeConfig(
  partial?: Partial<MomentumContinuationTradeConfig> & {
    targetRMultiples?: Partial<
      MomentumContinuationTradeConfig["targetRMultiples"]
    >;
    atrTargetMultiples?: Partial<
      MomentumContinuationTradeConfig["atrTargetMultiples"]
    >;
    qualityWeights?: Partial<
      MomentumContinuationTradeConfig["qualityWeights"]
    >;
    gradeThresholds?: Partial<
      MomentumContinuationTradeConfig["gradeThresholds"]
    >;
  }
): MomentumContinuationTradeConfig {
  return {
    ...DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
