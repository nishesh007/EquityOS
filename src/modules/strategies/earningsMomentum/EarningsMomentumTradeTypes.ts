/**
 * Earnings Momentum Trade Construction — Sprint 11B.3T.
 */

import type { EarningsMomentumExplainability } from "./EarningsMomentumExplainability";
import type { EarningsMomentumInstitutionalScore } from "./EarningsMomentumScoring";
import type {
  EarningsGuidanceTone,
  EarningsMomentumDetection,
} from "./EarningsMomentumTypes";

export type EarningsMomentumEntryMode =
  | "gap_continuation"
  | "opening_pullback"
  | "vwap_retest"
  | "confirmation_candle"
  | "continuation_breakout";

export type EarningsMomentumStopMethod =
  | "atr"
  | "vwap"
  | "ema20"
  | "swing_low"
  | "hybrid";

export type EarningsMomentumQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type EarningsMomentumPositionType = "Swing" | "Position";

export interface EarningsMomentumTradeSetup {
  detection: EarningsMomentumDetection;
  epsActual: number;
  epsEstimate: number;
  epsSurprise: number;
  revenueActual: number;
  revenueEstimate: number;
  revenueSurprise: number;
  guidance: EarningsGuidanceTone;
  marginExpansion: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: EarningsMomentumQualityGrade;
  conviction: number;
  signalGrade: string;
  confidence: number;
  holdingPeriod: string;
  positionType: EarningsMomentumPositionType;
  warnings: string[];
  positiveReasons: string[];
  negativeReasons: string[];
  neutralReasons: string[];
  institutionalSummary: string[];
  explainability: EarningsMomentumExplainability;
  institutionalScore: EarningsMomentumInstitutionalScore;
}

export const DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG = {
  entryMode: "confirmation_candle" as EarningsMomentumEntryMode,
  stopMethod: "hybrid" as EarningsMomentumStopMethod,
  atrStopMultiple: 1.5,
  emaStopBufferPct: 0.0005,
  vwapStopBufferPct: 0.0005,
  swingLookbackBars: 8,
  minimumRiskReward: 2.5,
  targetRMultiples: {
    target1: 2,
    target2: 3,
    finalTarget: 5,
  },
  atrTargetMultiples: {
    target1: 1.5,
    target2: 2.5,
    finalTarget: 4,
  },
  measuredMoveFraction: 1,
  dynamicProjectionBars: 5,
  trailingStopAtrMultiple: 2,
  maxRiskPercentOfPrice: 0.12,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    earningsQuality: 0.3,
    guidanceQuality: 0.2,
    priceConfirmation: 0.15,
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
  defaultHoldingPeriod: "Swing / Post-earnings momentum",
  defaultPositionType: "Swing" as EarningsMomentumPositionType,
  preferHigherFinalRr: true,
} as const;

export type EarningsMomentumTradeConfig = {
  readonly entryMode: EarningsMomentumEntryMode;
  readonly stopMethod: EarningsMomentumStopMethod;
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
  readonly trailingStopAtrMultiple: number;
  readonly maxRiskPercentOfPrice: number;
  readonly priceEpsilon: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly qualityWeights: {
    readonly earningsQuality: number;
    readonly guidanceQuality: number;
    readonly priceConfirmation: number;
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
  readonly defaultPositionType: EarningsMomentumPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveEarningsMomentumTradeConfig(
  partial?: Partial<EarningsMomentumTradeConfig> & {
    targetRMultiples?: Partial<
      EarningsMomentumTradeConfig["targetRMultiples"]
    >;
    atrTargetMultiples?: Partial<
      EarningsMomentumTradeConfig["atrTargetMultiples"]
    >;
    qualityWeights?: Partial<EarningsMomentumTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<EarningsMomentumTradeConfig["gradeThresholds"]>;
  }
): EarningsMomentumTradeConfig {
  return {
    ...DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
