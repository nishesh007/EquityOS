/**
 * Flat Base Trade Construction — Sprint 11B.3R.
 */

import type { FlatBaseExplainability } from "./FlatBaseExplainability";
import type { FlatBaseInstitutionalScore } from "./FlatBaseScoring";
import type { FlatBaseDetection } from "./FlatBaseTypes";

export type FlatBaseEntryMode =
  | "pivot_breakout"
  | "retest_entry"
  | "aggressive_entry";

export type FlatBaseStopMethod =
  | "base_low"
  | "atr"
  | "ema20"
  | "vwap"
  | "hybrid";

export type FlatBaseQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type FlatBasePositionType = "Swing" | "Position";

export interface FlatBaseTradeSetup {
  detection: FlatBaseDetection;
  pivotPrice: number;
  baseDepth: number;
  baseDuration: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: FlatBaseQualityGrade;
  conviction: number;
  signalGrade: string;
  confidence: number;
  holdingPeriod: string;
  positionType: FlatBasePositionType;
  warnings: string[];
  positiveReasons: string[];
  negativeReasons: string[];
  neutralReasons: string[];
  institutionalSummary: string[];
  explainability: FlatBaseExplainability;
  institutionalScore: FlatBaseInstitutionalScore;
}

export const DEFAULT_FLAT_BASE_TRADE_CONFIG = {
  entryMode: "pivot_breakout" as FlatBaseEntryMode,
  stopMethod: "hybrid" as FlatBaseStopMethod,
  atrStopMultiple: 1.25,
  baseStopBufferPct: 0.0005,
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
  measuredMoveFraction: 1,
  dynamicProjectionBars: 5,
  maxRiskPercentOfPrice: 0.1,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    baseQuality: 0.25,
    breakoutQuality: 0.2,
    trendQuality: 0.15,
    volumeConfirmation: 0.15,
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
  defaultHoldingPeriod: "Swing / Flat Base continuation",
  defaultPositionType: "Swing" as FlatBasePositionType,
  preferHigherFinalRr: true,
} as const;

export type FlatBaseTradeConfig = {
  readonly entryMode: FlatBaseEntryMode;
  readonly stopMethod: FlatBaseStopMethod;
  readonly atrStopMultiple: number;
  readonly baseStopBufferPct: number;
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
  readonly measuredMoveFraction: number;
  readonly dynamicProjectionBars: number;
  readonly maxRiskPercentOfPrice: number;
  readonly priceEpsilon: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly qualityWeights: {
    readonly baseQuality: number;
    readonly breakoutQuality: number;
    readonly trendQuality: number;
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
  readonly defaultPositionType: FlatBasePositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveFlatBaseTradeConfig(
  partial?: Partial<FlatBaseTradeConfig> & {
    targetRMultiples?: Partial<FlatBaseTradeConfig["targetRMultiples"]>;
    atrTargetMultiples?: Partial<FlatBaseTradeConfig["atrTargetMultiples"]>;
    qualityWeights?: Partial<FlatBaseTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<FlatBaseTradeConfig["gradeThresholds"]>;
  }
): FlatBaseTradeConfig {
  return {
    ...DEFAULT_FLAT_BASE_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_FLAT_BASE_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_FLAT_BASE_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_FLAT_BASE_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_FLAT_BASE_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
