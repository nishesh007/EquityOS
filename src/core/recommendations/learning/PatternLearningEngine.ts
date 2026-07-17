/**
 * Historical pattern discovery from completed recommendation evidence.
 */

import type {
  RecommendationHistoricalLearning,
  RecommendationLearnedPattern,
  RecommendationLearningEvidence,
  RecommendationPatternType,
} from "./RecommendationFeedbackModels";
import { roundLearning } from "./RecommendationFeedbackModels";

function pattern(
  type: RecommendationPatternType,
  label: string,
  evidenceCount: number,
  successRate: number | null,
  evidence: string[]
): RecommendationLearnedPattern {
  return Object.freeze({
    patternId: `PAT-${type.replace(/\s+/g, "-").toUpperCase()}-${label
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase()}`,
    type,
    label,
    evidenceCount,
    confidence: roundLearning(Math.min(100, (evidenceCount / 10) * 100)),
    successRate,
    evidence: Object.freeze(evidence),
  });
}

function bestAndWorst(
  groups: RecommendationHistoricalLearning["strategies"],
  bestType: RecommendationPatternType,
  worstType: RecommendationPatternType,
  bestPrefix: string,
  worstPrefix: string
): RecommendationLearnedPattern[] {
  const eligible = groups.filter((group) => group.observations >= 2);
  if (eligible.length === 0) return [];
  const sorted = [...eligible].sort(
    (left, right) =>
      right.successRate - left.successRate ||
      right.observations - left.observations
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const results = [
    pattern(
      bestType,
      `${bestPrefix}: ${best.key}`,
      best.observations,
      best.successRate,
      [
        `${best.successes}/${best.observations} successful`,
        `Success rate ${best.successRate}%`,
      ]
    ),
  ];
  if (worst.key !== best.key || worst.successRate < 50) {
    results.push(
      pattern(
        worstType,
        `${worstPrefix}: ${worst.key}`,
        worst.observations,
        worst.successRate,
        [
          `${worst.failures}/${worst.observations} failed`,
          `Success rate ${worst.successRate}%`,
        ]
      )
    );
  }
  return results;
}

function indicatorPatterns(
  evidence: readonly RecommendationLearningEvidence[]
): RecommendationLearnedPattern[] {
  const byIndicator = new Map<string, RecommendationLearningEvidence[]>();
  for (const item of evidence) {
    for (const indicator of item.indicators) {
      byIndicator.set(indicator, [...(byIndicator.get(indicator) ?? []), item]);
    }
  }

  return [...byIndicator.entries()]
    .filter(([, items]) => items.length >= 2)
    .map(([indicator, items]) => {
      const successes = items.filter((item) => item.successful).length;
      const rate = roundLearning((successes / items.length) * 100);
      const reliable = rate >= 60;
      return pattern(
        reliable ? "Reliable Indicator" : "Unreliable Indicator",
        `${reliable ? "Reliable" : "Unreliable"} indicator: ${indicator}`,
        items.length,
        rate,
        [`${successes}/${items.length} successful when present`]
      );
    });
}

export function discoverHistoricalPatterns(
  evidence: readonly RecommendationLearningEvidence[],
  historical: RecommendationHistoricalLearning
): RecommendationLearnedPattern[] {
  if (evidence.length < 2) return [];

  const successful = evidence.filter((item) => item.successful);
  const failed = evidence.filter((item) => item.failed);
  const patterns: RecommendationLearnedPattern[] = [];

  const successStrategies = new Map<string, number>();
  for (const item of successful) {
    successStrategies.set(
      item.strategy,
      (successStrategies.get(item.strategy) ?? 0) + 1
    );
  }
  for (const [strategy, count] of successStrategies) {
    if (count >= 2) {
      patterns.push(
        pattern(
          "Repeated Successful Pattern",
          `Repeated success: ${strategy}`,
          count,
          100,
          [`${count} successful ${strategy} recommendations`]
        )
      );
    }
  }

  const failureStrategies = new Map<string, number>();
  for (const item of failed) {
    failureStrategies.set(
      item.strategy,
      (failureStrategies.get(item.strategy) ?? 0) + 1
    );
  }
  for (const [strategy, count] of failureStrategies) {
    if (count >= 2) {
      patterns.push(
        pattern(
          "Repeated Failure Pattern",
          `Repeated failure: ${strategy}`,
          count,
          0,
          [`${count} failed ${strategy} recommendations`]
        )
      );
    }
  }

  patterns.push(
    ...bestAndWorst(
      historical.marketRegimes,
      "Best Market Regime",
      "Worst Market Regime",
      "Best regime",
      "Worst regime"
    ),
    ...bestAndWorst(
      historical.holdingPeriods,
      "Best Holding Period",
      "Repeated Failure Pattern",
      "Best holding period",
      "Weak holding period"
    ),
    ...bestAndWorst(
      historical.strategies,
      "Strong Strategy",
      "Weak Strategy",
      "Strong strategy",
      "Weak strategy"
    ),
    ...indicatorPatterns(evidence)
  );

  const unique = new Map<string, RecommendationLearnedPattern>();
  for (const item of patterns) unique.set(item.patternId, item);
  return [...unique.values()].sort(
    (left, right) =>
      right.confidence - left.confidence ||
      right.evidenceCount - left.evidenceCount ||
      left.label.localeCompare(right.label)
  );
}

export class PatternLearningEngine {
  discover = discoverHistoricalPatterns;
}
