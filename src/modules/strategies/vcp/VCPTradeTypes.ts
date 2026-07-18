/**
 * VCP Trade Construction — Sprint 11B.3L.
 */

import type { VCPExplainability } from "./VCPExplainability";
import type { VCPInstitutionalScore } from "./VCPScoring";
import type { VCPDetection } from "./VCPTypes";

export type VCPEntryMode = "pivot_breakout" | "retest" | "early_pivot";

export type VCPStopMethod =
  | "pivot_low"
  | "atr"
  | "last_contraction_low"
  | "ema20"
  | "hybrid";

export type VCPQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type VCPPositionType = "Swing" | "Intraday";

export interface VCPTradeSetup {
  detection: VCPDetection;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: VCPQualityGrade;
  conviction: number;
  signalGrade: string;
  confidence: number;
  pivotPrice: number;
  contractionCount: number;
  holdingPeriod: string;
  positionType: VCPPositionType;
  warnings: string[];
  positiveReasons: string[];
  negativeReasons: string[];
  neutralReasons: string[];
  institutionalSummary: string[];
  explainability: VCPExplainability;
  institutionalScore: VCPInstitutionalScore;
}

export const DEFAULT_VCP_TRADE_CONFIG = {
  entryMode: "pivot_breakout" as VCPEntryMode,
  stopMethod: "hybrid" as VCPStopMethod,
  atrStopMultiple: 1.2,
  pivotStopBufferPct: 0.001,
  emaStopBufferPct: 0.0005,
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
  maxRiskPercentOfPrice: 0.08,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    patternQuality: 0.25,
    contractionQuality: 0.2,
    volumeDryUp: 0.15,
    breakoutQuality: 0.15,
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
  defaultHoldingPeriod: "Swing / VCP post-breakout continuation",
  defaultPositionType: "Swing" as VCPPositionType,
  preferHigherFinalRr: true,
} as const;

export type VCPTradeConfig = {
  readonly entryMode: VCPEntryMode;
  readonly stopMethod: VCPStopMethod;
  readonly atrStopMultiple: number;
  readonly pivotStopBufferPct: number;
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
    readonly patternQuality: number;
    readonly contractionQuality: number;
    readonly volumeDryUp: number;
    readonly breakoutQuality: number;
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
  readonly defaultPositionType: VCPPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveVCPTradeConfig(
  partial?: Partial<VCPTradeConfig> & {
    targetRMultiples?: Partial<VCPTradeConfig["targetRMultiples"]>;
    atrTargetMultiples?: Partial<VCPTradeConfig["atrTargetMultiples"]>;
    qualityWeights?: Partial<VCPTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<VCPTradeConfig["gradeThresholds"]>;
  }
): VCPTradeConfig {
  return {
    ...DEFAULT_VCP_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_VCP_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_VCP_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_VCP_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_VCP_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
