/**
 * Cup & Handle Trade Construction — Sprint 11B.3Q.
 */

import type { CupHandleExplainability } from "./CupHandleExplainability";
import type { CupHandleInstitutionalScore } from "./CupHandleScoring";
import type { CupHandleDetection } from "./CupHandleTypes";

export type CupHandleEntryMode =
  | "handle_breakout"
  | "retest_entry"
  | "early_breakout";

export type CupHandleStopMethod =
  | "handle_low"
  | "atr"
  | "ema20"
  | "vwap"
  | "hybrid";

export type CupHandleQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type CupHandlePositionType = "Swing" | "Position";

export interface CupHandleTradeSetup {
  detection: CupHandleDetection;
  cupDepth: number;
  cupDuration: number;
  handleDepth: number;
  handleDuration: number;
  pivotPrice: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: CupHandleQualityGrade;
  conviction: number;
  signalGrade: string;
  confidence: number;
  holdingPeriod: string;
  positionType: CupHandlePositionType;
  warnings: string[];
  positiveReasons: string[];
  negativeReasons: string[];
  neutralReasons: string[];
  institutionalSummary: string[];
  explainability: CupHandleExplainability;
  institutionalScore: CupHandleInstitutionalScore;
}

export const DEFAULT_CUP_HANDLE_TRADE_CONFIG = {
  entryMode: "handle_breakout" as CupHandleEntryMode,
  stopMethod: "hybrid" as CupHandleStopMethod,
  atrStopMultiple: 1.3,
  handleStopBufferPct: 0.0005,
  emaStopBufferPct: 0.0005,
  vwapStopBufferPct: 0.0005,
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
  cupHeightProjectionMultiple: 1,
  measuredMoveFraction: 1,
  dynamicProjectionBars: 5,
  maxRiskPercentOfPrice: 0.12,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    cupQuality: 0.25,
    handleQuality: 0.2,
    breakoutQuality: 0.2,
    volumeConfirmation: 0.1,
    relativeStrength: 0.1,
    sectorStrength: 0.1,
    riskReward: 0.05,
  },
  gradeThresholds: {
    exceptionalMin: 90,
    highMin: 75,
    goodMin: 60,
    averageMin: 45,
  },
  defaultHoldingPeriod: "Swing / Cup & Handle continuation",
  defaultPositionType: "Swing" as CupHandlePositionType,
  preferHigherFinalRr: true,
} as const;

export type CupHandleTradeConfig = {
  readonly entryMode: CupHandleEntryMode;
  readonly stopMethod: CupHandleStopMethod;
  readonly atrStopMultiple: number;
  readonly handleStopBufferPct: number;
  readonly emaStopBufferPct: number;
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
  readonly cupHeightProjectionMultiple: number;
  readonly measuredMoveFraction: number;
  readonly dynamicProjectionBars: number;
  readonly maxRiskPercentOfPrice: number;
  readonly priceEpsilon: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly qualityWeights: {
    readonly cupQuality: number;
    readonly handleQuality: number;
    readonly breakoutQuality: number;
    readonly volumeConfirmation: number;
    readonly relativeStrength: number;
    readonly sectorStrength: number;
    readonly riskReward: number;
  };
  readonly gradeThresholds: {
    readonly exceptionalMin: number;
    readonly highMin: number;
    readonly goodMin: number;
    readonly averageMin: number;
  };
  readonly defaultHoldingPeriod: string;
  readonly defaultPositionType: CupHandlePositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveCupHandleTradeConfig(
  partial?: Partial<CupHandleTradeConfig> & {
    targetRMultiples?: Partial<CupHandleTradeConfig["targetRMultiples"]>;
    atrTargetMultiples?: Partial<CupHandleTradeConfig["atrTargetMultiples"]>;
    qualityWeights?: Partial<CupHandleTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<CupHandleTradeConfig["gradeThresholds"]>;
  }
): CupHandleTradeConfig {
  return {
    ...DEFAULT_CUP_HANDLE_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_CUP_HANDLE_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_CUP_HANDLE_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_CUP_HANDLE_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_CUP_HANDLE_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
