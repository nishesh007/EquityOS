/**
 * Sprint 9F.1.R6 – Adaptive AI Learning public API.
 *
 * No LLM training. No historical mutation. Calibration applies only to future
 * recommendation creation and is exposed as guidance to existing engines.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import { getLivingRecommendation } from "../lifecycle";
import { getRecommendationHealth } from "../health";
import { getRecommendationReplay } from "../replay";
import { getRecommendationOutcome } from "../outcomes";
import { AdaptiveLearningEngine } from "./AdaptiveLearningEngine";
import { calibrateFutureRecommendation as applyFutureCalibration } from "./RecommendationCalibrationEngine";
import type {
  CalibratedFutureRecommendation,
  FutureRecommendationCalibrationInput,
  RecommendationAILessons,
  RecommendationCalibration,
  RecommendationHistoricalLearning,
  RecommendationLearnedPattern,
  RecommendationLearningResult,
  RecommendationLearningSource,
  RecommendationLearningSummary,
} from "./RecommendationFeedbackModels";
import {
  presentLearningForSurface,
  type LearningSurfaceBundle,
  type RecommendationLearningSurface,
} from "./LearningPresentationModels";

export * from "./RecommendationFeedbackModels";
export * from "./HistoricalLearningEngine";
export * from "./PatternLearningEngine";
export * from "./RecommendationCalibrationEngine";
export * from "./AdaptiveLearningEngine";
export * from "./LearningPresentationModels";

const learningEngine = new AdaptiveLearningEngine();
let snapshotLoader:
  | ((recommendationId: string) => RecommendationSnapshot | undefined)
  | null = null;

export function bindRecommendationLearningSnapshotLoader(
  loader: (recommendationId: string) => RecommendationSnapshot | undefined
): void {
  snapshotLoader = loader;
}

function composeLearningSource(
  recommendationId: string
): RecommendationLearningSource {
  const snapshot = snapshotLoader?.(recommendationId);
  const outcome = getRecommendationOutcome(recommendationId);
  if (!snapshot) {
    throw new Error(
      `Recommendation ${recommendationId} not found for adaptive learning`
    );
  }
  if (!outcome) {
    throw new Error(
      `Completed outcome ${recommendationId} not found for adaptive learning`
    );
  }
  return {
    snapshot,
    lifecycle: getLivingRecommendation(recommendationId) ?? null,
    health: getRecommendationHealth(recommendationId) ?? null,
    outcome,
    replay: getRecommendationReplay(recommendationId) ?? null,
  };
}

export function learnFromRecommendation(
  recommendation: string | RecommendationLearningSource,
  learnedAt?: string | Date
): RecommendationLearningResult {
  const source =
    typeof recommendation === "string"
      ? composeLearningSource(recommendation)
      : recommendation;
  return learningEngine.learn(source, learnedAt);
}

export function getLearningSummary(): RecommendationLearningSummary {
  return learningEngine.getSummary();
}

export function getCalibration(): RecommendationCalibration {
  return learningEngine.getCalibration();
}

export function getHistoricalPatterns(): readonly RecommendationLearnedPattern[] {
  return learningEngine.getPatterns();
}

export function getAILessons(): RecommendationAILessons {
  return learningEngine.getLessons();
}

export function getHistoricalLearning(): RecommendationHistoricalLearning {
  return learningEngine.getHistorical();
}

/**
 * Applies learned guidance to a prospective recommendation input only.
 * Historical snapshots never enter this function and cannot be modified.
 */
export function calibrateFutureRecommendation(
  input: FutureRecommendationCalibrationInput
): CalibratedFutureRecommendation {
  return calibrateFutureRecommendationInternal(input);
}

function calibrateFutureRecommendationInternal(
  input: FutureRecommendationCalibrationInput
): CalibratedFutureRecommendation {
  return applyFutureCalibration(input, learningEngine.getCalibration());
}

export function resetAdaptiveLearning(): void {
  learningEngine.clear();
}

export function getAdaptiveLearningEngine(): AdaptiveLearningEngine {
  return learningEngine;
}

function wireLearningSurface(
  surface: RecommendationLearningSurface
): LearningSurfaceBundle {
  return presentLearningForSurface(
    surface,
    learningEngine.getSummary(),
    learningEngine.getCalibration(),
    learningEngine.getPatterns(),
    learningEngine.getLessons()
  );
}

/** Future-only guidance adapter; does not modify AI Research. */
export function wireLearningAIResearch(): LearningSurfaceBundle {
  return wireLearningSurface("ai_research");
}

/** Future-only guidance adapter; does not modify AI Screener. */
export function wireLearningAIScreener(): LearningSurfaceBundle {
  return wireLearningSurface("ai_screener");
}

export function wireLearningDashboard(): LearningSurfaceBundle {
  return wireLearningSurface("dashboard");
}

export function wireLearningRecommendationCenter(): LearningSurfaceBundle {
  return wireLearningSurface("recommendation_center");
}

/** Read-only calibration evidence for the existing Validation engine. */
export function wireLearningValidation(): LearningSurfaceBundle {
  return wireLearningSurface("validation");
}

export function wireLearningReplay(): LearningSurfaceBundle {
  return wireLearningSurface("replay");
}

export function wireLearningHistory(): LearningSurfaceBundle {
  return wireLearningSurface("history");
}
