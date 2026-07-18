/**
 * Breakout Retest Trade Construction — Sprint 11B.3I.
 */

import type { BreakoutRetestExplainability } from "./BreakoutRetestExplainability";
import type { BreakoutRetestInstitutionalScore } from "./BreakoutRetestScoring";
import type { BreakoutRetestDetection } from "./BreakoutRetestTypes";

export type BreakoutRetestEntryMode =
  | "confirmation"
  | "aggressive_retest"
  | "breakout_continuation";

export type BreakoutRetestStopMethod =
  | "retest_low"
  | "atr"
  | "vwap"
  | "ema20"
  | "hybrid";

export type BreakoutRetestQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type BreakoutRetestPositionType = "Scalp" | "Intraday";

export interface BreakoutRetestTradeSetup {
  detection: BreakoutRetestDetection;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: BreakoutRetestQualityGrade;
  holdingPeriod: string;
  positionType: BreakoutRetestPositionType;
  warnings: string[];
  explainability: BreakoutRetestExplainability;
  institutionalScore: BreakoutRetestInstitutionalScore;
}

export const DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG = {
  entryMode: "confirmation" as BreakoutRetestEntryMode,
  stopMethod: "hybrid" as BreakoutRetestStopMethod,
  atrStopMultiple: 1,
  retestStopBufferPct: 0.0005,
  emaStopBufferPct: 0.0003,
  vwapStopBufferPct: 0.0004,
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
    breakoutQuality: 0.2,
    retestQuality: 0.2,
    volume: 0.15,
    trendStructure: 0.1,
    breadth: 0.1,
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
  defaultHoldingPeriod: "Intraday / breakout retest continuation window",
  defaultPositionType: "Intraday" as BreakoutRetestPositionType,
  preferHigherFinalRr: true,
} as const;

export type BreakoutRetestTradeConfig = {
  readonly entryMode: BreakoutRetestEntryMode;
  readonly stopMethod: BreakoutRetestStopMethod;
  readonly atrStopMultiple: number;
  readonly retestStopBufferPct: number;
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
    readonly breakoutQuality: number;
    readonly retestQuality: number;
    readonly volume: number;
    readonly trendStructure: number;
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
  readonly defaultPositionType: BreakoutRetestPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveBreakoutRetestTradeConfig(
  partial?: Partial<BreakoutRetestTradeConfig> & {
    targetRMultiples?: Partial<BreakoutRetestTradeConfig["targetRMultiples"]>;
    atrTargetMultiples?: Partial<
      BreakoutRetestTradeConfig["atrTargetMultiples"]
    >;
    qualityWeights?: Partial<BreakoutRetestTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<BreakoutRetestTradeConfig["gradeThresholds"]>;
  }
): BreakoutRetestTradeConfig {
  return {
    ...DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
