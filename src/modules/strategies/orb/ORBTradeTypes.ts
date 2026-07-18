/**
 * ORB Trade Construction config & contracts — Sprint 11B.3B.2.
 * Separate from detection config. Does not alter ORB detection behaviour.
 */

import type { ORBDetection } from "./ORBTypes";

export type ORBEntryMode = "breakout_close" | "retest";

export type ORBStopMethod =
  | "breakout_candle"
  | "opening_range"
  | "atr"
  | "hybrid";

export type ORBQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type ORBPositionType = "Scalp" | "Intraday";

/**
 * Complete institutional ORB trade setup (no execution).
 */
export interface ORBTradeSetup {
  detection: ORBDetection;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: ORBQualityGrade;
  holdingPeriod: string;
  positionType: ORBPositionType;
  warnings: string[];
}

export const DEFAULT_ORB_TRADE_CONFIG = {
  entryMode: "breakout_close" as ORBEntryMode,
  stopMethod: "hybrid" as ORBStopMethod,
  atrStopMultiple: 1,
  minimumRiskReward: 2,
  targetRMultiples: {
    target1: 1.5,
    target2: 2,
    finalTarget: 3,
  },
  atrTargetMultiples: {
    target1: 1,
    target2: 1.5,
    finalTarget: 2.5,
  },
  maxRiskPercentOfPrice: 0.03,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    breakoutQuality: 0.25,
    volumeQuality: 0.2,
    marketSupport: 0.2,
    breadth: 0.15,
    sectorStrength: 0.1,
    riskReward: 0.1,
  },
  gradeThresholds: {
    exceptionalMin: 90,
    highMin: 75,
    goodMin: 60,
    averageMin: 45,
  },
  defaultHoldingPeriod: "Intraday session",
  defaultPositionType: "Intraday" as ORBPositionType,
  preferHigherFinalRr: true,
} as const;

export type ORBTradeConfig = {
  readonly entryMode: ORBEntryMode;
  readonly stopMethod: ORBStopMethod;
  readonly atrStopMultiple: number;
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
  readonly maxRiskPercentOfPrice: number;
  readonly priceEpsilon: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly qualityWeights: {
    readonly breakoutQuality: number;
    readonly volumeQuality: number;
    readonly marketSupport: number;
    readonly breadth: number;
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
  readonly defaultPositionType: ORBPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveORBTradeConfig(
  partial?: Partial<ORBTradeConfig> & {
    targetRMultiples?: Partial<ORBTradeConfig["targetRMultiples"]>;
    atrTargetMultiples?: Partial<ORBTradeConfig["atrTargetMultiples"]>;
    qualityWeights?: Partial<ORBTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<ORBTradeConfig["gradeThresholds"]>;
  }
): ORBTradeConfig {
  return {
    ...DEFAULT_ORB_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_ORB_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_ORB_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_ORB_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_ORB_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
