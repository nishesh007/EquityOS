/**
 * EMA Pullback Trade Construction — Sprint 11B.3P.
 */

import type { EMAPullbackExplainability } from "./EMAPullbackExplainability";
import type { EMAPullbackInstitutionalScore } from "./EMAPullbackScoring";
import type {
  EMAPullbackDetection,
  EMAPullbackTrendDirection,
  EMAPullbackType,
} from "./EMAPullbackTypes";

export type EMAPullbackEntryMode =
  | "ema20_bounce"
  | "ema50_bounce"
  | "vwap_bounce"
  | "bullish_confirmation_candle"
  | "aggressive_pullback_entry";

export type EMAPullbackStopMethod =
  | "atr"
  | "ema50"
  | "swing_low"
  | "vwap"
  | "hybrid";

export type EMAPullbackQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type EMAPullbackPositionType = "Swing" | "Intraday";

export interface EMAPullbackTradeSetup {
  detection: EMAPullbackDetection;
  trendDirection: EMAPullbackTrendDirection;
  pullbackType: EMAPullbackType;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: EMAPullbackQualityGrade;
  conviction: number;
  signalGrade: string;
  confidence: number;
  holdingPeriod: string;
  positionType: EMAPullbackPositionType;
  warnings: string[];
  positiveReasons: string[];
  negativeReasons: string[];
  neutralReasons: string[];
  institutionalSummary: string[];
  explainability: EMAPullbackExplainability;
  institutionalScore: EMAPullbackInstitutionalScore;
}

export const DEFAULT_EMA_PULLBACK_TRADE_CONFIG = {
  entryMode: "bullish_confirmation_candle" as EMAPullbackEntryMode,
  stopMethod: "hybrid" as EMAPullbackStopMethod,
  atrStopMultiple: 1.25,
  emaStopBufferPct: 0.0005,
  vwapStopBufferPct: 0.0005,
  swingLookbackBars: 8,
  minimumRiskReward: 2,
  targetRMultiples: {
    target1: 2,
    target2: 3,
    finalTarget: 3,
  },
  atrTargetMultiples: {
    target1: 1.25,
    target2: 2,
    finalTarget: 3,
  },
  measuredMoveFraction: 1,
  dynamicProjectionBars: 5,
  maxRiskPercentOfPrice: 0.08,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    trendQuality: 0.25,
    pullbackQuality: 0.2,
    emaAlignment: 0.15,
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
  defaultHoldingPeriod: "Swing / EMA pullback continuation",
  defaultPositionType: "Swing" as EMAPullbackPositionType,
  preferHigherFinalRr: true,
} as const;

export type EMAPullbackTradeConfig = {
  readonly entryMode: EMAPullbackEntryMode;
  readonly stopMethod: EMAPullbackStopMethod;
  readonly atrStopMultiple: number;
  readonly emaStopBufferPct: number;
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
  readonly dynamicProjectionBars: number;
  readonly maxRiskPercentOfPrice: number;
  readonly priceEpsilon: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly qualityWeights: {
    readonly trendQuality: number;
    readonly pullbackQuality: number;
    readonly emaAlignment: number;
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
  readonly defaultPositionType: EMAPullbackPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveEMAPullbackTradeConfig(
  partial?: Partial<EMAPullbackTradeConfig> & {
    targetRMultiples?: Partial<EMAPullbackTradeConfig["targetRMultiples"]>;
    atrTargetMultiples?: Partial<EMAPullbackTradeConfig["atrTargetMultiples"]>;
    qualityWeights?: Partial<EMAPullbackTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<EMAPullbackTradeConfig["gradeThresholds"]>;
  }
): EMAPullbackTradeConfig {
  return {
    ...DEFAULT_EMA_PULLBACK_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_EMA_PULLBACK_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_EMA_PULLBACK_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_EMA_PULLBACK_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_EMA_PULLBACK_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
