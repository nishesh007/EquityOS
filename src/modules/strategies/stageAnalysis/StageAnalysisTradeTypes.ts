/**
 * Stage Analysis Trade Construction — Sprint 11B.3M.
 */

import type { StageAnalysisExplainability } from "./StageAnalysisExplainability";
import type { StageAnalysisInstitutionalScore } from "./StageAnalysisScoring";
import type {
  StageAnalysisDetection,
  StageTransition,
  WeinsteinStage,
} from "./StageAnalysisTypes";

export type StageAnalysisEntryMode =
  | "base_breakout"
  | "pullback_30w"
  | "vwap_retest"
  | "continuation";

export type StageAnalysisStopMethod =
  | "ma30w"
  | "swing_low"
  | "atr"
  | "ema20"
  | "hybrid";

export type StageAnalysisQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type StageAnalysisPositionType = "Swing" | "Position";

export interface StageAnalysisTradeSetup {
  detection: StageAnalysisDetection;
  stage: WeinsteinStage | 0;
  previousStage: WeinsteinStage | 0;
  transition: StageTransition;
  transitionConfidence: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: StageAnalysisQualityGrade;
  conviction: number;
  signalGrade: string;
  confidence: number;
  holdingPeriod: string;
  positionType: StageAnalysisPositionType;
  warnings: string[];
  positiveReasons: string[];
  negativeReasons: string[];
  neutralReasons: string[];
  institutionalSummary: string[];
  explainability: StageAnalysisExplainability;
  institutionalScore: StageAnalysisInstitutionalScore;
}

export const DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG = {
  entryMode: "base_breakout" as StageAnalysisEntryMode,
  stopMethod: "hybrid" as StageAnalysisStopMethod,
  atrStopMultiple: 1.5,
  maStopBufferPct: 0.002,
  emaStopBufferPct: 0.0005,
  swingLookbackBars: 12,
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
  dynamicProjectionBars: 6,
  maxRiskPercentOfPrice: 0.1,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    stageQuality: 0.25,
    trendStructure: 0.2,
    relativeStrength: 0.15,
    volumeQuality: 0.1,
    sectorStrength: 0.1,
    marketRegime: 0.1,
    riskReward: 0.1,
  },
  gradeThresholds: {
    exceptionalMin: 90,
    highMin: 75,
    goodMin: 60,
    averageMin: 45,
  },
  defaultHoldingPeriod: "Swing / Stage 2 trend follow",
  defaultPositionType: "Swing" as StageAnalysisPositionType,
  preferHigherFinalRr: true,
} as const;

export type StageAnalysisTradeConfig = {
  readonly entryMode: StageAnalysisEntryMode;
  readonly stopMethod: StageAnalysisStopMethod;
  readonly atrStopMultiple: number;
  readonly maStopBufferPct: number;
  readonly emaStopBufferPct: number;
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
    readonly stageQuality: number;
    readonly trendStructure: number;
    readonly relativeStrength: number;
    readonly volumeQuality: number;
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
  readonly defaultPositionType: StageAnalysisPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveStageAnalysisTradeConfig(
  partial?: Partial<StageAnalysisTradeConfig> & {
    targetRMultiples?: Partial<StageAnalysisTradeConfig["targetRMultiples"]>;
    atrTargetMultiples?: Partial<StageAnalysisTradeConfig["atrTargetMultiples"]>;
    qualityWeights?: Partial<StageAnalysisTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<StageAnalysisTradeConfig["gradeThresholds"]>;
  }
): StageAnalysisTradeConfig {
  return {
    ...DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
