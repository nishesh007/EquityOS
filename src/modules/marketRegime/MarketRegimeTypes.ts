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
export interface MarketRegime {
  regime: MarketRegimeLabel;
  confidence: number;
  priority: number;
  reasons: string[];
  triggeredRules: string[];
  timestamp: Date;
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
