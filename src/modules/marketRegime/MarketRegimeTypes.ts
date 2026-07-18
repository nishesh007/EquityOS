/**
 * Market Regime Engine — type contracts (Sprint 11B.2A).
 * Second stage of the institutional trading pipeline:
 * Institutional Market Context → Market Regime → Strategy Eligibility.
 *
 * Decision rules (deterministic priority, highest wins):
 *  100  High Volatility Override — extreme/high vol + Risk Off (or extreme alone)
 *   95  Event Driven — material gap + ATR/vol expansion under stress
 *   85  Strong Bull — bullish trend + strong breadth/sectors/health
 *   85  Strong Bear — bearish trend + weak breadth + defensive risk
 *   70  Weak Bull — bullish bias with moderate confirmation
 *   70  Weak Bear — bearish bias with moderate confirmation
 *   55  Low Volatility — subdued vol without strong directional setup
 *   10  Sideways — mixed/conflicting signals or incomplete context (fallback)
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";

export type MarketRegimeLabel =
  | "Strong Bull"
  | "Weak Bull"
  | "Sideways"
  | "Weak Bear"
  | "Strong Bear"
  | "High Volatility"
  | "Low Volatility"
  | "Event Driven";

/**
 * Canonical market regime classification output.
 */
export interface MarketRegimeClassification {
  regime: MarketRegimeLabel;
  confidence: number;
  priority: number;
  reasons: string[];
  triggeredRules: string[];
  timestamp: Date;
}

/**
 * Market regime with Sprint 11B.2B confidence & explainability attached.
 */
export interface MarketRegime extends MarketRegimeClassification {
  confidenceAnalysis: RegimeConfidenceAnalysis;
}

/* ─── Sprint 11B.2B — Regime Confidence & Explainability ─── */

export type ConfidenceGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Moderate"
  | "Low";

export type ConfidenceDirection = "Positive" | "Negative" | "Neutral";

/**
 * Configurable evidence weights for regime confidence scoring.
 * Weights should sum to 1.0.
 */
export interface RegimeConfidenceWeights {
  readonly trendAgreement: number;
  readonly breadthAgreement: number;
  readonly sectorAgreement: number;
  readonly volatilityAgreement: number;
  readonly marketStrength: number;
  readonly riskMode: number;
  readonly dataQuality: number;
}

export interface RegimeConfidenceConfig {
  readonly weights: RegimeConfidenceWeights;
  readonly exceptionalMin: number;
  readonly highMin: number;
  readonly goodMin: number;
  readonly moderateMin: number;
  readonly neutralBand: number;
  readonly missingFactorPenalty: number;
  readonly conflictPenalty: number;
  readonly incompletePenalty: number;
  readonly summaryMaxPoints: number;
  readonly confidenceFloor: number;
}

export const DEFAULT_REGIME_CONFIDENCE_WEIGHTS: RegimeConfidenceWeights = {
  trendAgreement: 0.25,
  breadthAgreement: 0.2,
  sectorAgreement: 0.15,
  volatilityAgreement: 0.15,
  marketStrength: 0.1,
  riskMode: 0.1,
  dataQuality: 0.05,
};

export const DEFAULT_REGIME_CONFIDENCE_CONFIG: RegimeConfidenceConfig = {
  weights: DEFAULT_REGIME_CONFIDENCE_WEIGHTS,
  exceptionalMin: 95,
  highMin: 85,
  goodMin: 70,
  moderateMin: 55,
  neutralBand: 6,
  missingFactorPenalty: 10,
  conflictPenalty: 12,
  incompletePenalty: 14,
  summaryMaxPoints: 5,
  confidenceFloor: 20,
};

/**
 * Single factor contribution toward regime confidence.
 */
export interface ConfidenceContribution {
  factor: string;
  title: string;
  description: string;
  score: number;
  weight: number;
  /** Signed contribution to the composite (positive supports regime). */
  contribution: number;
  direction: ConfidenceDirection;
  reason: string;
}

/**
 * Full institutional confidence & explainability package.
 */
export interface RegimeConfidenceAnalysis {
  score: number;
  grade: ConfidenceGrade;
  positiveReasons: string[];
  negativeReasons: string[];
  neutralReasons: string[];
  contributions: ConfidenceContribution[];
  summary: string[];
}

export interface RegimeConfidenceInput {
  context: InstitutionalMarketContext | null;
  regime: MarketRegimeClassification | null;
  config?: Partial<RegimeConfidenceConfig> & {
    weights?: Partial<RegimeConfidenceWeights>;
  };
}

/**
 * Configurable classification thresholds — no inline magic numbers.
 */
export interface MarketRegimeConfig {
  readonly bullStrengthMin: number;
  readonly strongBullStrengthMin: number;
  readonly bearStrengthMax: number;
  readonly strongBearStrengthMax: number;
  readonly breadthStrongMin: number;
  readonly breadthWeakMax: number;
  readonly participationStrongMin: number;
  readonly participationWeakMax: number;
  readonly sectorStrongMin: number;
  readonly sectorWeakMax: number;
  readonly healthStrongMin: number;
  readonly healthWeakMax: number;
  readonly volatilityHighMin: number;
  readonly volatilityExtremeMin: number;
  readonly volatilityLowMax: number;
  readonly volatilityVeryLowMax: number;
  readonly gapEventMinPct: number;
  readonly confidenceFloor: number;
  readonly incompleteContextConfidence: number;
  readonly conflictConfidencePenalty: number;
  readonly lowContextConfidenceThreshold: number;
}

export const DEFAULT_MARKET_REGIME_CONFIG: MarketRegimeConfig = {
  bullStrengthMin: 55,
  strongBullStrengthMin: 70,
  bearStrengthMax: 45,
  strongBearStrengthMax: 30,
  breadthStrongMin: 60,
  breadthWeakMax: 40,
  participationStrongMin: 60,
  participationWeakMax: 40,
  sectorStrongMin: 58,
  sectorWeakMax: 42,
  healthStrongMin: 65,
  healthWeakMax: 40,
  volatilityHighMin: 65,
  volatilityExtremeMin: 80,
  volatilityLowMax: 35,
  volatilityVeryLowMax: 22,
  gapEventMinPct: 0.75,
  confidenceFloor: 25,
  incompleteContextConfidence: 30,
  conflictConfidencePenalty: 12,
  lowContextConfidenceThreshold: 45,
};

/**
 * Modular regime rule — evaluated independently, selected by priority.
 */
export interface MarketRegimeRule {
  readonly name: string;
  readonly priority: number;
  readonly resultingRegime: MarketRegimeLabel;
  readonly reason: string;
  matches(
    context: InstitutionalMarketContext,
    config: MarketRegimeConfig
  ): boolean;
}

export interface MarketRegimeRuleMatch {
  rule: MarketRegimeRule;
  reason: string;
}

export type MarketRegimeListener = (regime: MarketRegime) => void;

export interface MarketRegimeServiceOptions {
  forceRefresh?: boolean;
}

/**
 * Derived feature flags from InstitutionalMarketContext.
 * Pure projections — no recalculation of upstream engines.
 */
export interface RegimeContextFeatures {
  averageSectorScore: number;
  sectorParticipationRatio: number;
  isBullTrend: boolean;
  isBearTrend: boolean;
  isStrongBullTrend: boolean;
  isStrongBearTrend: boolean;
  isHighVolatility: boolean;
  isExtremeVolatility: boolean;
  isLowVolatility: boolean;
  isVeryLowVolatility: boolean;
  hasMaterialGap: boolean;
  hasAtrExpansion: boolean;
  hasConflicts: boolean;
  isIncomplete: boolean;
  qualitySupportive: boolean;
  qualityWeak: boolean;
}
