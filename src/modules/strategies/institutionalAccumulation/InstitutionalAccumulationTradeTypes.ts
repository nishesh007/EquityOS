/**
 * Institutional Accumulation Trade Construction — Sprint 11B.3H.
 */

import type { InstitutionalAccumulationExplainability } from "./InstitutionalAccumulationExplainability";
import type { InstitutionalAccumulationInstitutionalScore } from "./InstitutionalAccumulationScoring";
import type { InstitutionalAccumulationDetection } from "./InstitutionalAccumulationTypes";

export type InstitutionalAccumulationEntryMode =
  | "breakout"
  | "demand_zone_retest"
  | "vwap_retest"
  | "continuation";

export type InstitutionalAccumulationStopMethod =
  | "demand_zone"
  | "atr"
  | "swing"
  | "vwap"
  | "hybrid";

export type InstitutionalAccumulationQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type InstitutionalAccumulationPositionType = "Scalp" | "Intraday";

export interface InstitutionalAccumulationTradeSetup {
  detection: InstitutionalAccumulationDetection;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: InstitutionalAccumulationQualityGrade;
  holdingPeriod: string;
  positionType: InstitutionalAccumulationPositionType;
  warnings: string[];
  explainability: InstitutionalAccumulationExplainability;
  institutionalScore: InstitutionalAccumulationInstitutionalScore;
}

export const DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG = {
  entryMode: "breakout" as InstitutionalAccumulationEntryMode,
  stopMethod: "hybrid" as InstitutionalAccumulationStopMethod,
  atrStopMultiple: 1,
  demandZoneBufferPct: 0.0005,
  swingLookbackBars: 6,
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
  maxRiskPercentOfPrice: 0.035,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    accumulationQuality: 0.25,
    volumeQuality: 0.2,
    trendStructure: 0.15,
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
  defaultHoldingPeriod: "Intraday / institutional accumulation window",
  defaultPositionType: "Intraday" as InstitutionalAccumulationPositionType,
  preferHigherFinalRr: true,
} as const;

export type InstitutionalAccumulationTradeConfig = {
  readonly entryMode: InstitutionalAccumulationEntryMode;
  readonly stopMethod: InstitutionalAccumulationStopMethod;
  readonly atrStopMultiple: number;
  readonly demandZoneBufferPct: number;
  readonly swingLookbackBars: number;
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
    readonly accumulationQuality: number;
    readonly volumeQuality: number;
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
  readonly defaultPositionType: InstitutionalAccumulationPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveInstitutionalAccumulationTradeConfig(
  partial?: Partial<InstitutionalAccumulationTradeConfig> & {
    targetRMultiples?: Partial<
      InstitutionalAccumulationTradeConfig["targetRMultiples"]
    >;
    atrTargetMultiples?: Partial<
      InstitutionalAccumulationTradeConfig["atrTargetMultiples"]
    >;
    qualityWeights?: Partial<
      InstitutionalAccumulationTradeConfig["qualityWeights"]
    >;
    gradeThresholds?: Partial<
      InstitutionalAccumulationTradeConfig["gradeThresholds"]
    >;
  }
): InstitutionalAccumulationTradeConfig {
  return {
    ...DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
