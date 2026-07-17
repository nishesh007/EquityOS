/**
 * Adaptive recommendation learning models.
 * Learning consumes immutable historical evidence and emits future-only guidance.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type { LivingRecommendation } from "../lifecycle";
import type { RecommendationHealthAssessment } from "../health";
import type { RecommendationReplayBundle } from "../replay";
import type {
  InstitutionalVerdict,
  RecommendationOutcomeAssessment,
} from "../outcomes";

export const RECOMMENDATION_LEARNING_FACTORS = [
  "Entry Accuracy",
  "Target Accuracy",
  "Stop Loss Accuracy",
  "Holding Period Accuracy",
  "Sector Success Rate",
  "Market Regime Success",
  "Strategy Success",
  "Momentum Success",
  "Fundamental Success",
  "Risk Success",
] as const;

export type RecommendationLearningFactor =
  (typeof RECOMMENDATION_LEARNING_FACTORS)[number];

export const RECOMMENDATION_PATTERN_TYPES = [
  "Repeated Successful Pattern",
  "Repeated Failure Pattern",
  "Best Market Regime",
  "Worst Market Regime",
  "Best Holding Period",
  "Weak Strategy",
  "Strong Strategy",
  "Reliable Indicator",
  "Unreliable Indicator",
] as const;

export type RecommendationPatternType =
  (typeof RECOMMENDATION_PATTERN_TYPES)[number];

export interface RecommendationLearningSource {
  readonly snapshot: RecommendationSnapshot;
  readonly lifecycle?: LivingRecommendation | null;
  readonly health?: RecommendationHealthAssessment | null;
  readonly outcome: RecommendationOutcomeAssessment;
  readonly replay?: RecommendationReplayBundle | null;
}

export interface RecommendationLearningEvidence {
  readonly recommendationId: string;
  readonly learnedAt: string;
  readonly verdict: InstitutionalVerdict;
  readonly successful: boolean;
  readonly failed: boolean;
  readonly strategy: string;
  readonly holdingPeriod: string;
  readonly sector: string;
  readonly marketRegime: string;
  readonly indicators: readonly string[];
  readonly factorScores: Readonly<
    Partial<Record<RecommendationLearningFactor, number>>
  >;
  readonly outcomeState: string;
  readonly lessons: readonly string[];
}

export interface HistoricalFactorStatistics {
  readonly factor: RecommendationLearningFactor;
  readonly observations: number;
  readonly averageScore: number | null;
  readonly successfulAverage: number | null;
  readonly failedAverage: number | null;
  readonly evidenceConfidence: number;
}

export interface HistoricalGroupStatistics {
  readonly key: string;
  readonly observations: number;
  readonly successes: number;
  readonly failures: number;
  readonly successRate: number;
}

export interface RecommendationHistoricalLearning {
  readonly evaluated: number;
  readonly successes: number;
  readonly failures: number;
  readonly successRate: number;
  readonly failureRate: number;
  readonly factors: readonly HistoricalFactorStatistics[];
  readonly strategies: readonly HistoricalGroupStatistics[];
  readonly sectors: readonly HistoricalGroupStatistics[];
  readonly marketRegimes: readonly HistoricalGroupStatistics[];
  readonly holdingPeriods: readonly HistoricalGroupStatistics[];
}

export interface RecommendationLearnedPattern {
  readonly patternId: string;
  readonly type: RecommendationPatternType;
  readonly label: string;
  readonly evidenceCount: number;
  readonly confidence: number;
  readonly successRate: number | null;
  readonly evidence: readonly string[];
}

export interface RecommendationCalibrationAdjustment {
  readonly factor: "Momentum" | "Sector" | "Risk";
  /** Percentage-point guidance applied only during creation of future recommendations. */
  readonly adjustmentPercent: number;
  readonly rationale: string;
  readonly confidence: number;
}

export interface RecommendationCalibration {
  readonly generatedAt: string;
  readonly sampleSize: number;
  readonly confidence: number;
  readonly adjustments: readonly RecommendationCalibrationAdjustment[];
  readonly convictionCap: number;
  readonly trustCalibration: number;
  readonly validationWeighting: number;
  readonly appliesTo: "FUTURE_RECOMMENDATIONS_ONLY";
}

export interface RecommendationAILessons {
  readonly aiLearned: readonly string[];
  readonly aiShouldAvoid: readonly string[];
  readonly aiConfidenceIncreasedBecause: readonly string[];
  readonly aiConfidenceReducedBecause: readonly string[];
  readonly historicalEvidence: readonly string[];
}

export interface RecommendationLearningSummary {
  readonly recommendationsEvaluated: number;
  readonly learningProgress: number;
  readonly successRate: number;
  readonly failureRate: number;
  readonly calibrationConfidence: number;
  readonly patternsLearned: number;
  readonly latestAiLessons: readonly string[];
}

export interface RecommendationLearningResult {
  readonly evidence: RecommendationLearningEvidence;
  readonly historical: RecommendationHistoricalLearning;
  readonly calibration: RecommendationCalibration;
  readonly patterns: readonly RecommendationLearnedPattern[];
  readonly lessons: RecommendationAILessons;
  readonly summary: RecommendationLearningSummary;
}

export interface FutureRecommendationCalibrationInput {
  readonly baseConviction: number;
  readonly baseTrust: number;
  readonly baseValidationWeight: number;
  readonly factors?: readonly ("Momentum" | "Sector" | "Risk")[];
}

export interface CalibratedFutureRecommendation {
  readonly conviction: number;
  readonly trust: number;
  readonly validationWeight: number;
  readonly appliedAdjustments: readonly RecommendationCalibrationAdjustment[];
  readonly historicalSampleSize: number;
  readonly calibrationConfidence: number;
}

export function normalizeLearningTimestamp(value?: string | Date): string {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    throw new Error("Learning timestamp is invalid");
  }
  return date.toISOString();
}

export function roundLearning(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function clampLearning(value: number): number {
  return Math.max(0, Math.min(100, value));
}
