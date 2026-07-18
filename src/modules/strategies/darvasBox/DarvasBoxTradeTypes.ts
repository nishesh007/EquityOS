/**
 * Darvas Box Trade Construction — Sprint 11B.3N.
 */

import type { DarvasBoxExplainability } from "./DarvasBoxExplainability";
import type { DarvasBoxInstitutionalScore } from "./DarvasBoxScoring";
import type { DarvasBoxDetection } from "./DarvasBoxTypes";

export type DarvasBoxEntryMode =
  | "box_breakout"
  | "retest_box_high"
  | "early_breakout";

export type DarvasBoxStopMethod =
  | "box_low"
  | "atr"
  | "ema20"
  | "vwap"
  | "hybrid";

export type DarvasBoxQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type DarvasBoxPositionType = "Swing" | "Intraday";

export interface DarvasBoxTradeSetup {
  detection: DarvasBoxDetection;
  boxHigh: number;
  boxLow: number;
  boxHeight: number;
  boxDuration: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: DarvasBoxQualityGrade;
  conviction: number;
  signalGrade: string;
  confidence: number;
  holdingPeriod: string;
  positionType: DarvasBoxPositionType;
  warnings: string[];
  positiveReasons: string[];
  negativeReasons: string[];
  neutralReasons: string[];
  institutionalSummary: string[];
  explainability: DarvasBoxExplainability;
  institutionalScore: DarvasBoxInstitutionalScore;
}

export const DEFAULT_DARVAS_BOX_TRADE_CONFIG = {
  entryMode: "box_breakout" as DarvasBoxEntryMode,
  stopMethod: "hybrid" as DarvasBoxStopMethod,
  atrStopMultiple: 1.2,
  boxStopBufferPct: 0.001,
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
  boxHeightProjectionMultiple: 1,
  measuredMoveFraction: 1,
  dynamicProjectionBars: 5,
  maxRiskPercentOfPrice: 0.1,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    boxQuality: 0.25,
    breakoutQuality: 0.2,
    volumeConfirmation: 0.15,
    trendStructure: 0.1,
    relativeStrength: 0.1,
    sectorStrength: 0.1,
    marketRegime: 0.05,
    riskReward: 0.05,
  },
  gradeThresholds: {
    exceptionalMin: 90,
    highMin: 75,
    goodMin: 60,
    averageMin: 45,
  },
  defaultHoldingPeriod: "Swing / Darvas post-breakout continuation",
  defaultPositionType: "Swing" as DarvasBoxPositionType,
  preferHigherFinalRr: true,
} as const;

export type DarvasBoxTradeConfig = {
  readonly entryMode: DarvasBoxEntryMode;
  readonly stopMethod: DarvasBoxStopMethod;
  readonly atrStopMultiple: number;
  readonly boxStopBufferPct: number;
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
  readonly boxHeightProjectionMultiple: number;
  readonly measuredMoveFraction: number;
  readonly dynamicProjectionBars: number;
  readonly maxRiskPercentOfPrice: number;
  readonly priceEpsilon: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly qualityWeights: {
    readonly boxQuality: number;
    readonly breakoutQuality: number;
    readonly volumeConfirmation: number;
    readonly trendStructure: number;
    readonly relativeStrength: number;
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
  readonly defaultPositionType: DarvasBoxPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveDarvasBoxTradeConfig(
  partial?: Partial<DarvasBoxTradeConfig> & {
    targetRMultiples?: Partial<DarvasBoxTradeConfig["targetRMultiples"]>;
    atrTargetMultiples?: Partial<DarvasBoxTradeConfig["atrTargetMultiples"]>;
    qualityWeights?: Partial<DarvasBoxTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<DarvasBoxTradeConfig["gradeThresholds"]>;
  }
): DarvasBoxTradeConfig {
  return {
    ...DEFAULT_DARVAS_BOX_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_DARVAS_BOX_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_DARVAS_BOX_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_DARVAS_BOX_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_DARVAS_BOX_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
