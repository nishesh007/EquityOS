/**
 * Sector Rotation Trade Construction — Sprint 11B.3J.
 */

import type { SectorRotationExplainability } from "./SectorRotationExplainability";
import type { SectorRotationInstitutionalScore } from "./SectorRotationScoring";
import type { SectorRotationDetection } from "./SectorRotationTypes";

export type SectorRotationEntryMode =
  | "momentum_breakout"
  | "sector_pullback"
  | "vwap_retest"
  | "relative_strength_breakout";

export type SectorRotationStopMethod =
  | "atr"
  | "ema20"
  | "swing"
  | "vwap"
  | "hybrid";

export type SectorRotationQualityGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Poor";

export type SectorRotationPositionType = "Scalp" | "Intraday";

export interface SectorRotationTradeSetup {
  detection: SectorRotationDetection;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  qualityScore: number;
  qualityGrade: SectorRotationQualityGrade;
  holdingPeriod: string;
  positionType: SectorRotationPositionType;
  warnings: string[];
  explainability: SectorRotationExplainability;
  institutionalScore: SectorRotationInstitutionalScore;
}

export const DEFAULT_SECTOR_ROTATION_TRADE_CONFIG = {
  entryMode: "momentum_breakout" as SectorRotationEntryMode,
  stopMethod: "hybrid" as SectorRotationStopMethod,
  atrStopMultiple: 1,
  emaStopBufferPct: 0.0003,
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
  sectorProjectionMultiple: 1.5,
  dynamicProjectionBars: 4,
  maxRiskPercentOfPrice: 0.03,
  priceEpsilon: 0.0001,
  scoreFloor: 0,
  scoreCeiling: 100,
  qualityWeights: {
    sectorStrength: 0.25,
    relativeStrength: 0.2,
    sectorBreadth: 0.15,
    volume: 0.1,
    marketRegime: 0.1,
    trendStructure: 0.1,
    riskReward: 0.1,
  },
  gradeThresholds: {
    exceptionalMin: 90,
    highMin: 75,
    goodMin: 60,
    averageMin: 45,
  },
  defaultHoldingPeriod: "Intraday / sector rotation leadership window",
  defaultPositionType: "Intraday" as SectorRotationPositionType,
  preferHigherFinalRr: true,
} as const;

export type SectorRotationTradeConfig = {
  readonly entryMode: SectorRotationEntryMode;
  readonly stopMethod: SectorRotationStopMethod;
  readonly atrStopMultiple: number;
  readonly emaStopBufferPct: number;
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
  readonly sectorProjectionMultiple: number;
  readonly dynamicProjectionBars: number;
  readonly maxRiskPercentOfPrice: number;
  readonly priceEpsilon: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly qualityWeights: {
    readonly sectorStrength: number;
    readonly relativeStrength: number;
    readonly sectorBreadth: number;
    readonly volume: number;
    readonly marketRegime: number;
    readonly trendStructure: number;
    readonly riskReward: number;
  };
  readonly gradeThresholds: {
    readonly exceptionalMin: number;
    readonly highMin: number;
    readonly goodMin: number;
    readonly averageMin: number;
  };
  readonly defaultHoldingPeriod: string;
  readonly defaultPositionType: SectorRotationPositionType;
  readonly preferHigherFinalRr: boolean;
};

export function resolveSectorRotationTradeConfig(
  partial?: Partial<SectorRotationTradeConfig> & {
    targetRMultiples?: Partial<SectorRotationTradeConfig["targetRMultiples"]>;
    atrTargetMultiples?: Partial<
      SectorRotationTradeConfig["atrTargetMultiples"]
    >;
    qualityWeights?: Partial<SectorRotationTradeConfig["qualityWeights"]>;
    gradeThresholds?: Partial<SectorRotationTradeConfig["gradeThresholds"]>;
  }
): SectorRotationTradeConfig {
  return {
    ...DEFAULT_SECTOR_ROTATION_TRADE_CONFIG,
    ...partial,
    targetRMultiples: {
      ...DEFAULT_SECTOR_ROTATION_TRADE_CONFIG.targetRMultiples,
      ...partial?.targetRMultiples,
    },
    atrTargetMultiples: {
      ...DEFAULT_SECTOR_ROTATION_TRADE_CONFIG.atrTargetMultiples,
      ...partial?.atrTargetMultiples,
    },
    qualityWeights: {
      ...DEFAULT_SECTOR_ROTATION_TRADE_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    gradeThresholds: {
      ...DEFAULT_SECTOR_ROTATION_TRADE_CONFIG.gradeThresholds,
      ...partial?.gradeThresholds,
    },
  };
}
