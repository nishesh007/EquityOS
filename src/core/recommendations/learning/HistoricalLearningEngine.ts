/**
 * Converts completed R1–R5 recommendation records into institutional feedback.
 * It reads existing outcomes/performance; it does not recompute those engines.
 */

import type {
  HistoricalFactorStatistics,
  HistoricalGroupStatistics,
  RecommendationHistoricalLearning,
  RecommendationLearningEvidence,
  RecommendationLearningFactor,
  RecommendationLearningSource,
} from "./RecommendationFeedbackModels";
import {
  RECOMMENDATION_LEARNING_FACTORS,
  clampLearning,
  normalizeLearningTimestamp,
  roundLearning,
} from "./RecommendationFeedbackModels";

const SUCCESS_VERDICTS = new Set([
  "Outstanding",
  "Successful",
  "Partially Successful",
]);
const FAILURE_VERDICTS = new Set(["Failed", "Invalidated"]);
const INCOMPLETE_STATES = new Set([
  "Pending Entry",
  "Entry Triggered",
  "Running",
  "Trailing",
]);

function readText(
  record: Readonly<Record<string, unknown>>,
  keys: readonly string[],
  fallback: string
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function healthFactorScore(
  source: RecommendationLearningSource,
  key: string
): number | undefined {
  const factor = source.health?.factors.find((item) => item.key === key);
  return factor?.currentScore ?? undefined;
}

function outcomeScore(
  successful: boolean,
  failed: boolean,
  neutral = 50
): number {
  return successful ? 100 : failed ? 0 : neutral;
}

export function isCompletedLearningSource(
  source: RecommendationLearningSource
): boolean {
  return !INCOMPLETE_STATES.has(source.outcome.state);
}

export function extractLearningEvidence(
  source: RecommendationLearningSource,
  learnedAt?: string | Date
): RecommendationLearningEvidence {
  if (!isCompletedLearningSource(source)) {
    throw new Error(
      `Recommendation ${source.snapshot.recommendationId} is not complete`
    );
  }

  const successful = SUCCESS_VERDICTS.has(source.outcome.verdict);
  const failed = FAILURE_VERDICTS.has(source.outcome.verdict);
  const market = source.snapshot.marketSnapshot as Readonly<
    Record<string, unknown>
  >;
  const sector = source.snapshot.sectorSnapshot as Readonly<
    Record<string, unknown>
  >;
  const technical = source.snapshot.technicalSnapshot as Readonly<
    Record<string, unknown>
  >;
  const fundamental = source.snapshot.fundamentalSnapshot as Readonly<
    Record<string, unknown>
  >;

  const momentum =
    healthFactorScore(source, "Momentum") ??
    (typeof technical.momentum === "number" ? technical.momentum : undefined);
  const fundamentalStrength =
    healthFactorScore(source, "Fundamental Strength") ??
    (typeof fundamental.qualityScore === "number"
      ? fundamental.qualityScore
      : undefined);
  const risk = healthFactorScore(source, "Risk");

  const factors: Partial<Record<RecommendationLearningFactor, number>> = {
    "Entry Accuracy": source.outcome.targets.entryTriggered ? 100 : 0,
    "Target Accuracy": source.outcome.targets.targetProgressPercent,
    "Stop Loss Accuracy": source.outcome.targets.stopLossHit ? 0 : 100,
    "Holding Period Accuracy":
      source.outcome.state === "Expired" ||
      source.outcome.state === "Archived"
        ? 0
        : outcomeScore(successful, failed),
    "Sector Success Rate": outcomeScore(successful, failed),
    "Market Regime Success": outcomeScore(successful, failed),
    "Strategy Success": outcomeScore(successful, failed),
  };
  if (momentum != null) factors["Momentum Success"] = clampLearning(momentum);
  if (fundamentalStrength != null) {
    factors["Fundamental Success"] = clampLearning(fundamentalStrength);
  }
  if (risk != null) factors["Risk Success"] = clampLearning(risk);

  const indicators = Object.keys(technical).sort();
  const lessons = [
    ...(source.replay?.lessons ?? []),
    ...source.outcome.attribution.succeededBecause,
    ...source.outcome.attribution.failedBecause,
  ].filter(
    (lesson, index, all) =>
      lesson.trim().length > 0 && all.indexOf(lesson) === index
  );

  return Object.freeze({
    recommendationId: source.snapshot.recommendationId,
    learnedAt: normalizeLearningTimestamp(learnedAt),
    verdict: source.outcome.verdict,
    successful,
    failed,
    strategy: source.snapshot.strategy,
    holdingPeriod: source.snapshot.expectedHoldingPeriod,
    sector: readText(sector, ["sector", "name"], "Unknown Sector"),
    marketRegime: readText(
      market,
      ["regime", "marketRegime"],
      "Unknown Regime"
    ),
    indicators: Object.freeze(indicators),
    factorScores: Object.freeze(factors),
    outcomeState: source.outcome.state,
    lessons: Object.freeze(lessons.slice(0, 8)),
  });
}

function average(values: number[]): number | null {
  return values.length === 0
    ? null
    : roundLearning(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function factorStatistics(
  evidence: readonly RecommendationLearningEvidence[],
  factor: RecommendationLearningFactor
): HistoricalFactorStatistics {
  const observed = evidence.filter(
    (item) => item.factorScores[factor] != null
  );
  const values = observed.map((item) => item.factorScores[factor] as number);
  const successful = observed
    .filter((item) => item.successful)
    .map((item) => item.factorScores[factor] as number);
  const failed = observed
    .filter((item) => item.failed)
    .map((item) => item.factorScores[factor] as number);

  return Object.freeze({
    factor,
    observations: observed.length,
    averageScore: average(values),
    successfulAverage: average(successful),
    failedAverage: average(failed),
    evidenceConfidence: roundLearning(
      Math.min(100, (observed.length / 20) * 100)
    ),
  });
}

function groupStatistics(
  evidence: readonly RecommendationLearningEvidence[],
  selector: (item: RecommendationLearningEvidence) => string
): HistoricalGroupStatistics[] {
  const groups = new Map<string, RecommendationLearningEvidence[]>();
  for (const item of evidence) {
    const key = selector(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()]
    .map(([key, items]) => {
      const successes = items.filter((item) => item.successful).length;
      const failures = items.filter((item) => item.failed).length;
      return Object.freeze({
        key,
        observations: items.length,
        successes,
        failures,
        successRate: roundLearning((successes / items.length) * 100),
      });
    })
    .sort(
      (left, right) =>
        right.observations - left.observations ||
        right.successRate - left.successRate ||
        left.key.localeCompare(right.key)
    );
}

export function buildHistoricalLearning(
  evidence: readonly RecommendationLearningEvidence[]
): RecommendationHistoricalLearning {
  const successes = evidence.filter((item) => item.successful).length;
  const failures = evidence.filter((item) => item.failed).length;
  const total = evidence.length;
  return Object.freeze({
    evaluated: total,
    successes,
    failures,
    successRate: total === 0 ? 0 : roundLearning((successes / total) * 100),
    failureRate: total === 0 ? 0 : roundLearning((failures / total) * 100),
    factors: Object.freeze(
      RECOMMENDATION_LEARNING_FACTORS.map((factor) =>
        factorStatistics(evidence, factor)
      )
    ),
    strategies: Object.freeze(groupStatistics(evidence, (item) => item.strategy)),
    sectors: Object.freeze(groupStatistics(evidence, (item) => item.sector)),
    marketRegimes: Object.freeze(
      groupStatistics(evidence, (item) => item.marketRegime)
    ),
    holdingPeriods: Object.freeze(
      groupStatistics(evidence, (item) => item.holdingPeriod)
    ),
  });
}

export class HistoricalLearningEngine {
  extract = extractLearningEvidence;
  summarize = buildHistoricalLearning;
  isComplete = isCompletedLearningSource;
}
