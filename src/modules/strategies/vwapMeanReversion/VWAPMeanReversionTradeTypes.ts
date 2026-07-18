/**
 * VWAP Mean Reversion Trade Construction config & contracts — Sprint 11B.3D.2.
 * Separate from detection config. Does not alter detection behaviour.
 */

import type { VWAPMeanReversionDetection } from "./VWAPMeanReversionTypes";

export type VWAPMeanReversionEntryMode =
  | "confirmation_close"
  | "retest_after_reversal"
  | "aggressive_immediate";

export type VWAPMeanReversionStopMethod =
  | "atr"
  | "swing"
  | "vwap_deviation_buffer"
  | "reversal_candle"
  | "hybrid";

export type VWAPMeanReversionQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type VWAPMeanReversionPositionType = "Scalp" | "Intraday";

/**
 * Complete institutional VWAP Mean Reversion trade setup (no execution).
 */
export interface VWAPMeanReversionTradeSetup {
  detection: VWAPMeanReversionDetection;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: VWAPMeanReversionQualityGrade;
  holdingPeriod: string;
  positionType: VWAPMeanReversionPositionType;
  warnings: string[];
}

export const DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG = {
  entryMode: "confirmation_close" as VWAPMeanReversionEntryMode,
  stopMethod: "hybrid" as VWAPMeanReversionStopMethod,
  atrStopMultiple: 1,
  /** Extra buffer beyond extreme in σ units for deviation stops. */
  deviationStopBufferSigma: 0.25,
  swingLookbackBars: 8,
  minimumRiskReward: 2,
  /** Partial fills toward VWAP for ladder. */
  vwapTargetFractions: {
    target1: 0.5,
    target2: 0.75,
    finalTarget: 1,
  },
  atrTargetMultiples: {
    target1: 0.5,
    target2: 1,
    finalTarget: 1.5,
  },
  measuredMoveFraction: 1,
  dynamicProjectionBars: 3,
  maxRiskPercentOfPrice: 0.03,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    vwapDeviation: 0.2,
    reversalQuality: 0.2,
    volumeStability: 0.15,
    marketContext: 0.15,
    breadth: 0.1,
    sectorStrength: 0.1,
    riskReward: 0.1,
  },
  gradeThresholds: {
    exceptionalMin: 90,
    highMin: 75,
    goodMin: 60,
    averageMin: 45,
  },
  defaultHoldingPeriod: "Scalp / mean-reversion window",
  defaultPositionType: "Scalp" as VWAPMeanReversionPositionType,
  preferHigherFinalRr: true,
} as const;

export type VWAPMeanReversionTradeConfig = {
  readonly entryMode: VWAPMeanReversionEntryMode;
  readonly stopMethod: VWAPMeanReversionStopMethod;
  readonly atrStopMultiple: number;
  readonly deviationStopBufferSigma: number;
  readonly swingLookbackBars: number;
  readonly minimumRiskReward: number;
  readonly vwapTargetFractions: {
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
    readonly vwapDeviation: number;
    readonly reversalQuality: number;
    readonly volumeStability: number;
    readonly marketContext: number;
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
  readonly defaultPositionType: VWAPMeanReversionPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveVWAPMeanReversionTradeConfig(
  partial?: Partial<VWAPMeanReversionTradeConfig> & {
    vwapTargetFractions?: Partial<
      VWAPMeanReversionTradeConfig["vwapTargetFractions"]
    >;
    atrTargetMultiples?: Partial<
      VWAPMeanReversionTradeConfig["atrTargetMultiples"]
    >;
    qualityWeights?: Partial<VWAPMeanReversionTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<VWAPMeanReversionTradeConfig["gradeThresholds"]>;
  }
): VWAPMeanReversionTradeConfig {
  return {
    ...DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG,
    ...partial,
    vwapTargetFractions: {
      ...DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG.vwapTargetFractions,
      ...partial?.vwapTargetFractions,
    },
    atrTargetMultiples: {
      ...DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
