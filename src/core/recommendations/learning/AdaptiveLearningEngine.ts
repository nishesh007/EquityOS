/**
 * Adaptive AI Learning Engine.
 * Completed recommendations become feedback; only future calibration is emitted.
 */

import {
  buildHistoricalLearning,
  extractLearningEvidence,
} from "./HistoricalLearningEngine";
import { discoverHistoricalPatterns } from "./PatternLearningEngine";
import { buildRecommendationCalibration } from "./RecommendationCalibrationEngine";
import type {
  RecommendationAILessons,
  RecommendationCalibration,
  RecommendationHistoricalLearning,
  RecommendationLearnedPattern,
  RecommendationLearningEvidence,
  RecommendationLearningResult,
  RecommendationLearningSource,
  RecommendationLearningSummary,
} from "./RecommendationFeedbackModels";
import { roundLearning } from "./RecommendationFeedbackModels";

function buildAiLessons(
  evidence: readonly RecommendationLearningEvidence[],
  patterns: readonly RecommendationLearnedPattern[]
): RecommendationAILessons {
  const successful = evidence.filter((item) => item.successful);
  const failed = evidence.filter((item) => item.failed);
  const strongPatterns = patterns.filter(
    (item) =>
      item.type === "Repeated Successful Pattern" ||
      item.type === "Strong Strategy" ||
      item.type === "Best Market Regime" ||
      item.type === "Reliable Indicator"
  );
  const weakPatterns = patterns.filter(
    (item) =>
      item.type === "Repeated Failure Pattern" ||
      item.type === "Weak Strategy" ||
      item.type === "Worst Market Regime" ||
      item.type === "Unreliable Indicator"
  );

  const learned = [
    ...strongPatterns.slice(0, 4).map((item) => item.label),
    ...successful
      .flatMap((item) => item.lessons)
      .filter((item, index, all) => all.indexOf(item) === index)
      .slice(0, 3),
  ];
  const avoid = [
    ...weakPatterns.slice(0, 4).map((item) => item.label),
    ...failed
      .flatMap((item) => item.lessons)
      .filter((item, index, all) => all.indexOf(item) === index)
      .slice(0, 3),
  ];

  return Object.freeze({
    aiLearned: Object.freeze(
      learned.length > 0
        ? learned.slice(0, 6)
        : ["Learning pending until repeated successful evidence emerges"]
    ),
    aiShouldAvoid: Object.freeze(
      avoid.length > 0
        ? avoid.slice(0, 6)
        : ["No repeated failure pattern identified"]
    ),
    aiConfidenceIncreasedBecause: Object.freeze(
      strongPatterns.length > 0
        ? strongPatterns
            .slice(0, 4)
            .map(
              (item) =>
                `${item.label} (${item.evidenceCount} observations)`
            )
        : ["Awaiting statistically repeated positive evidence"]
    ),
    aiConfidenceReducedBecause: Object.freeze(
      weakPatterns.length > 0
        ? weakPatterns
            .slice(0, 4)
            .map(
              (item) =>
                `${item.label} (${item.evidenceCount} observations)`
            )
        : ["No repeated negative evidence detected"]
    ),
    historicalEvidence: Object.freeze([
      `${evidence.length} completed recommendations evaluated`,
      `${successful.length} successful outcomes`,
      `${failed.length} failed or invalidated outcomes`,
      `${patterns.length} repeatable patterns discovered`,
    ]),
  });
}

function buildSummary(
  historical: RecommendationHistoricalLearning,
  calibration: RecommendationCalibration,
  patterns: readonly RecommendationLearnedPattern[],
  lessons: RecommendationAILessons
): RecommendationLearningSummary {
  return Object.freeze({
    recommendationsEvaluated: historical.evaluated,
    learningProgress: roundLearning(
      Math.min(100, (historical.evaluated / 25) * 100)
    ),
    successRate: historical.successRate,
    failureRate: historical.failureRate,
    calibrationConfidence: calibration.confidence,
    patternsLearned: patterns.length,
    latestAiLessons: Object.freeze(lessons.aiLearned.slice(0, 5)),
  });
}

export class AdaptiveLearningEngine {
  private readonly evidence = new Map<
    string,
    RecommendationLearningEvidence
  >();
  private historical: RecommendationHistoricalLearning =
    buildHistoricalLearning([]);
  private calibration: RecommendationCalibration =
    buildRecommendationCalibration(this.historical);
  private patterns: readonly RecommendationLearnedPattern[] = [];
  private lessons: RecommendationAILessons = buildAiLessons([], []);
  private summary: RecommendationLearningSummary = buildSummary(
    this.historical,
    this.calibration,
    this.patterns,
    this.lessons
  );

  learn(
    source: RecommendationLearningSource,
    learnedAt?: string | Date
  ): RecommendationLearningResult {
    const recommendationId = source.snapshot.recommendationId;
    if (this.evidence.has(recommendationId)) {
      throw new Error(
        `Recommendation ${recommendationId} has already been learned`
      );
    }

    const evidence = extractLearningEvidence(source, learnedAt);
    this.evidence.set(recommendationId, evidence);
    const allEvidence = this.listEvidence();
    this.historical = buildHistoricalLearning(allEvidence);
    this.patterns = Object.freeze(
      discoverHistoricalPatterns(allEvidence, this.historical)
    );
    this.calibration = buildRecommendationCalibration(
      this.historical,
      learnedAt
    );
    this.lessons = buildAiLessons(allEvidence, this.patterns);
    this.summary = buildSummary(
      this.historical,
      this.calibration,
      this.patterns,
      this.lessons
    );

    return Object.freeze({
      evidence,
      historical: this.historical,
      calibration: this.calibration,
      patterns: this.patterns,
      lessons: this.lessons,
      summary: this.summary,
    });
  }

  getSummary(): RecommendationLearningSummary {
    return this.summary;
  }

  getCalibration(): RecommendationCalibration {
    return this.calibration;
  }

  getPatterns(): readonly RecommendationLearnedPattern[] {
    return this.patterns;
  }

  getLessons(): RecommendationAILessons {
    return this.lessons;
  }

  getHistorical(): RecommendationHistoricalLearning {
    return this.historical;
  }

  listEvidence(): RecommendationLearningEvidence[] {
    return [...this.evidence.values()].sort(
      (left, right) =>
        Date.parse(right.learnedAt) - Date.parse(left.learnedAt) ||
        right.recommendationId.localeCompare(left.recommendationId)
    );
  }

  clear(): void {
    this.evidence.clear();
    this.historical = buildHistoricalLearning([]);
    this.calibration = buildRecommendationCalibration(this.historical);
    this.patterns = [];
    this.lessons = buildAiLessons([], []);
    this.summary = buildSummary(
      this.historical,
      this.calibration,
      this.patterns,
      this.lessons
    );
  }
}

export { buildAiLessons as buildAdaptiveAiLessons };
