/**
 * Institutional AI Recommendation Validation — configuration.
 * All thresholds are configurable; no hardcoded magic numbers in rules.
 */

export type RecommendationAction =
  | "BUY"
  | "STRONG_BUY"
  | "ACCUMULATE"
  | "HOLD"
  | "WATCH"
  | "REDUCE"
  | "SELL"
  | "STRONG_SELL";

export type RecommendationMode = "strict" | "relaxed";

export interface RecommendationValidationConfig {
  mode: RecommendationMode;
  minConfidence: number;
  maxConfidence: number;
  minQualityScore: number;
  /** Minimum confidence expected for strong bullish actions. */
  strongBuyMinConfidence: number;
  /** Maximum confidence allowed for sell actions under conflict. */
  sellMaxConfidenceWhenBullish: number;
  alignmentThreshold: number;
  riskThreshold: number;
  minRiskReward: number;
  inflatedConfidenceThreshold: number;
  historicalConflictWindowDays: number;
  qualityWeights: {
    technicalAlignment: number;
    fundamentalAlignment: number;
    reasoning: number;
    riskAssessment: number;
    historicalConsistency: number;
    marketContext: number;
  };
  bullishActions: RecommendationAction[];
  bearishActions: RecommendationAction[];
  neutralActions: RecommendationAction[];
  supportedActions: RecommendationAction[];
}

export const DEFAULT_RECOMMENDATION_VALIDATION_CONFIG: RecommendationValidationConfig =
  {
    mode: "strict",
    minConfidence: 0,
    maxConfidence: 100,
    minQualityScore: 55,
    strongBuyMinConfidence: 70,
    sellMaxConfidenceWhenBullish: 40,
    alignmentThreshold: 50,
    riskThreshold: 80,
    minRiskReward: 1,
    inflatedConfidenceThreshold: 95,
    historicalConflictWindowDays: 30,
    qualityWeights: {
      technicalAlignment: 0.2,
      fundamentalAlignment: 0.2,
      reasoning: 0.2,
      riskAssessment: 0.15,
      historicalConsistency: 0.15,
      marketContext: 0.1,
    },
    bullishActions: ["BUY", "STRONG_BUY", "ACCUMULATE"],
    bearishActions: ["SELL", "STRONG_SELL", "REDUCE"],
    neutralActions: ["HOLD", "WATCH"],
    supportedActions: [
      "BUY",
      "STRONG_BUY",
      "ACCUMULATE",
      "HOLD",
      "WATCH",
      "REDUCE",
      "SELL",
      "STRONG_SELL",
    ],
  };

export type RecommendationValidationConfigInput =
  Partial<RecommendationValidationConfig> & {
    qualityWeights?: Partial<
      RecommendationValidationConfig["qualityWeights"]
    >;
  };

export function resolveRecommendationConfig(
  input?: RecommendationValidationConfigInput
): RecommendationValidationConfig {
  return {
    ...DEFAULT_RECOMMENDATION_VALIDATION_CONFIG,
    ...input,
    qualityWeights: {
      ...DEFAULT_RECOMMENDATION_VALIDATION_CONFIG.qualityWeights,
      ...(input?.qualityWeights ?? {}),
    },
  };
}
