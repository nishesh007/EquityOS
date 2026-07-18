/**
 * Liquidity Sweep Trade Construction config & contracts — Sprint 11B.3E.
 */

import type { LiquiditySweepExplainability } from "./LiquiditySweepExplainability";
import type { LiquiditySweepInstitutionalScore } from "./LiquiditySweepScoring";
import type { LiquiditySweepDetection } from "./LiquiditySweepTypes";

export type LiquiditySweepEntryMode =
  | "aggressive"
  | "confirmation"
  | "retest";

export type LiquiditySweepStopMethod =
  | "sweep_extreme"
  | "atr"
  | "swing"
  | "hybrid";

export type LiquiditySweepQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type LiquiditySweepPositionType = "Scalp" | "Intraday";

/**
 * Complete institutional Liquidity Sweep trade setup (no execution).
 */
export interface LiquiditySweepTradeSetup {
  detection: LiquiditySweepDetection;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: LiquiditySweepQualityGrade;
  holdingPeriod: string;
  positionType: LiquiditySweepPositionType;
  warnings: string[];
  explainability: LiquiditySweepExplainability;
  institutionalScore: LiquiditySweepInstitutionalScore;
}

export const DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG = {
  entryMode: "confirmation" as LiquiditySweepEntryMode,
  stopMethod: "hybrid" as LiquiditySweepStopMethod,
  atrStopMultiple: 1,
  sweepStopBufferPct: 0.0005,
  swingLookbackBars: 8,
  minimumRiskReward: 2,
  targetFractions: {
    target1: 0.5,
    target2: 0.75,
    finalTarget: 1,
  },
  atrTargetMultiples: {
    target1: 0.75,
    target2: 1.25,
    finalTarget: 2,
  },
  measuredMoveFraction: 1,
  dynamicProjectionBars: 3,
  maxRiskPercentOfPrice: 0.035,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    sweepQuality: 0.25,
    reversalQuality: 0.2,
    volume: 0.15,
    breadth: 0.1,
    sector: 0.1,
    marketRegime: 0.1,
    riskReward: 0.1,
  },
  gradeThresholds: {
    exceptionalMin: 90,
    highMin: 75,
    goodMin: 60,
    averageMin: 45,
  },
  defaultHoldingPeriod: "Scalp / liquidity reclaim window",
  defaultPositionType: "Scalp" as LiquiditySweepPositionType,
  preferHigherFinalRr: true,
} as const;

export type LiquiditySweepTradeConfig = {
  readonly entryMode: LiquiditySweepEntryMode;
  readonly stopMethod: LiquiditySweepStopMethod;
  readonly atrStopMultiple: number;
  readonly sweepStopBufferPct: number;
  readonly swingLookbackBars: number;
  readonly minimumRiskReward: number;
  readonly targetFractions: {
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
    readonly sweepQuality: number;
    readonly reversalQuality: number;
    readonly volume: number;
    readonly breadth: number;
    readonly sector: number;
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
  readonly defaultPositionType: LiquiditySweepPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveLiquiditySweepTradeConfig(
  partial?: Partial<LiquiditySweepTradeConfig> & {
    targetFractions?: Partial<LiquiditySweepTradeConfig["targetFractions"]>;
    atrTargetMultiples?: Partial<
      LiquiditySweepTradeConfig["atrTargetMultiples"]
    >;
    qualityWeights?: Partial<LiquiditySweepTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<LiquiditySweepTradeConfig["gradeThresholds"]>;
  }
): LiquiditySweepTradeConfig {
  return {
    ...DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG,
    ...partial,
    targetFractions: {
      ...DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG.targetFractions,
      ...partial?.targetFractions,
    },
    atrTargetMultiples: {
      ...DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
