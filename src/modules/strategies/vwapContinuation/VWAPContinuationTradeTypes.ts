/**
 * VWAP Continuation Trade Construction config & contracts — Sprint 11B.3C.2 / 11B.3C.3.
 * Separate from detection config. Does not alter detection behaviour.
 */

import type { VWAPContinuationExplainability } from "./VWAPContinuationExplainability";
import type { VWAPContinuationInstitutionalScore } from "./VWAPContinuationScoring";
import type { VWAPContinuationDetection } from "./VWAPContinuationTypes";

export type VWAPContinuationEntryMode =
  | "confirmation_close"
  | "vwap_retest"
  | "aggressive_intrabar";

export type VWAPContinuationStopMethod =
  | "vwap_buffer"
  | "atr"
  | "swing"
  | "hybrid";

export type VWAPContinuationQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type VWAPContinuationPositionType = "Scalp" | "Intraday";

/**
 * Complete institutional VWAP Continuation trade setup (no execution).
 */
export interface VWAPContinuationTradeSetup {
  detection: VWAPContinuationDetection;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: VWAPContinuationQualityGrade;
  holdingPeriod: string;
  positionType: VWAPContinuationPositionType;
  warnings: string[];
  explainability: VWAPContinuationExplainability;
  institutionalScore: VWAPContinuationInstitutionalScore;
}

export const DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG = {
  entryMode: "confirmation_close" as VWAPContinuationEntryMode,
  stopMethod: "hybrid" as VWAPContinuationStopMethod,
  atrStopMultiple: 1,
  /** Buffer below/above VWAP for vwap_buffer stops (fraction of VWAP). */
  vwapStopBufferPct: 0.002,
  swingLookbackBars: 8,
  minimumRiskReward: 2,
  targetRMultiples: {
    target1: 2,
    target2: 2.5,
    finalTarget: 3,
  },
  atrTargetMultiples: {
    target1: 1,
    target2: 1.5,
    finalTarget: 2.5,
  },
  measuredMoveFraction: 1,
  trendProjectionBars: 4,
  maxRiskPercentOfPrice: 0.03,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    vwapQuality: 0.25,
    trendStrength: 0.2,
    volume: 0.15,
    breadth: 0.1,
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
  defaultHoldingPeriod: "Intraday session",
  defaultPositionType: "Intraday" as VWAPContinuationPositionType,
  preferHigherFinalRr: true,
} as const;

export type VWAPContinuationTradeConfig = {
  readonly entryMode: VWAPContinuationEntryMode;
  readonly stopMethod: VWAPContinuationStopMethod;
  readonly atrStopMultiple: number;
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
  readonly trendProjectionBars: number;
  readonly maxRiskPercentOfPrice: number;
  readonly priceEpsilon: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly qualityWeights: {
    readonly vwapQuality: number;
    readonly trendStrength: number;
    readonly volume: number;
    readonly breadth: number;
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
  readonly defaultPositionType: VWAPContinuationPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveVWAPContinuationTradeConfig(
  partial?: Partial<VWAPContinuationTradeConfig> & {
    targetRMultiples?: Partial<VWAPContinuationTradeConfig["targetRMultiples"]>;
    atrTargetMultiples?: Partial<
      VWAPContinuationTradeConfig["atrTargetMultiples"]
    >;
    qualityWeights?: Partial<VWAPContinuationTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<VWAPContinuationTradeConfig["gradeThresholds"]>;
  }
): VWAPContinuationTradeConfig {
  return {
    ...DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
