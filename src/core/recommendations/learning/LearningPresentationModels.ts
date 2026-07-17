/**
 * Presentation models for the learning dashboard and read-only surface adapters.
 */

import type {
  RecommendationAILessons,
  RecommendationCalibration,
  RecommendationLearnedPattern,
  RecommendationLearningSummary,
} from "./RecommendationFeedbackModels";

export const RECOMMENDATION_LEARNING_EMPTY = {
  noHistoricalRecommendations: "No Historical Recommendations",
  learningPending: "Learning Pending",
  awaitingCalibration: "Awaiting Calibration",
  noPatternsLearned: "No Patterns Learned",
} as const;

export type RecommendationLearningEmptyMessage =
  (typeof RECOMMENDATION_LEARNING_EMPTY)[keyof typeof RECOMMENDATION_LEARNING_EMPTY];

export type RecommendationLearningSurface =
  | "ai_research"
  | "ai_screener"
  | "dashboard"
  | "recommendation_center"
  | "validation"
  | "replay"
  | "history";

export interface LearningDashboardPresentation {
  readonly recommendationsEvaluated: number;
  readonly learningProgress: string;
  readonly successRate: string;
  readonly failureRate: string;
  readonly calibrationConfidence: string;
  readonly patternsLearned: number;
  readonly latestAiLessons: readonly string[];
  readonly empty: boolean;
  readonly emptyMessage: RecommendationLearningEmptyMessage | null;
}

export interface CalibrationPresentation {
  readonly sampleSize: number;
  readonly confidence: string;
  readonly adjustments: readonly string[];
  readonly convictionCap: string;
  readonly trustCalibration: string;
  readonly validationWeighting: string;
  readonly futureOnly: true;
  readonly empty: boolean;
  readonly emptyMessage: RecommendationLearningEmptyMessage | null;
}

export interface PatternsPresentation {
  readonly patterns: readonly RecommendationLearnedPattern[];
  readonly empty: boolean;
  readonly emptyMessage: RecommendationLearningEmptyMessage | null;
}

export interface LearningSurfaceBundle {
  readonly surface: RecommendationLearningSurface;
  readonly dashboard: LearningDashboardPresentation;
  readonly calibration: CalibrationPresentation;
  readonly patterns: PatternsPresentation;
  readonly lessons: RecommendationAILessons;
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function presentLearningDashboard(
  summary: RecommendationLearningSummary
): LearningDashboardPresentation {
  return Object.freeze({
    recommendationsEvaluated: summary.recommendationsEvaluated,
    learningProgress: percent(summary.learningProgress),
    successRate: percent(summary.successRate),
    failureRate: percent(summary.failureRate),
    calibrationConfidence: percent(summary.calibrationConfidence),
    patternsLearned: summary.patternsLearned,
    latestAiLessons: Object.freeze([...summary.latestAiLessons]),
    empty: summary.recommendationsEvaluated === 0,
    emptyMessage:
      summary.recommendationsEvaluated === 0
        ? RECOMMENDATION_LEARNING_EMPTY.noHistoricalRecommendations
        : null,
  });
}

export function presentCalibration(
  calibration: RecommendationCalibration
): CalibrationPresentation {
  return Object.freeze({
    sampleSize: calibration.sampleSize,
    confidence: percent(calibration.confidence),
    adjustments: Object.freeze(
      calibration.adjustments.map(
        (item) =>
          `${item.factor} ${item.adjustmentPercent >= 0 ? "+" : ""}${
            item.adjustmentPercent
          }% — ${item.rationale}`
      )
    ),
    convictionCap: String(calibration.convictionCap),
    trustCalibration: `${
      calibration.trustCalibration >= 0 ? "+" : ""
    }${calibration.trustCalibration}`,
    validationWeighting: `${calibration.validationWeighting}×`,
    futureOnly: true as const,
    empty: calibration.sampleSize === 0,
    emptyMessage:
      calibration.sampleSize === 0
        ? RECOMMENDATION_LEARNING_EMPTY.awaitingCalibration
        : null,
  });
}

export function presentPatterns(
  patterns: readonly RecommendationLearnedPattern[]
): PatternsPresentation {
  return Object.freeze({
    patterns: Object.freeze([...patterns]),
    empty: patterns.length === 0,
    emptyMessage:
      patterns.length === 0
        ? RECOMMENDATION_LEARNING_EMPTY.noPatternsLearned
        : null,
  });
}

export function presentLearningForSurface(
  surface: RecommendationLearningSurface,
  summary: RecommendationLearningSummary,
  calibration: RecommendationCalibration,
  patterns: readonly RecommendationLearnedPattern[],
  lessons: RecommendationAILessons
): LearningSurfaceBundle {
  return Object.freeze({
    surface,
    dashboard: presentLearningDashboard(summary),
    calibration: presentCalibration(calibration),
    patterns: presentPatterns(patterns),
    lessons,
  });
}
