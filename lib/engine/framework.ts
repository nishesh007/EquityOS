import { clamp, scoreConfidence } from "@/lib/engine/utils";
import type { ContributingFactor, ScoreCategory, ScoreResult, ScoreSource } from "@/lib/engine/types";

export interface CreateScoreOptions {
  key: string;
  label: string;
  category: ScoreCategory;
  rawScore: number;
  weight?: number;
  confidence?: number;
  explanation: string;
  contributingFactors?: ContributingFactor[];
  source?: ScoreSource;
}

/**
 * Normalizes a raw score to 0–100 and builds a complete ScoreResult.
 * All calculators in EquityOS must use this factory.
 */
export function createScoreResult(options: CreateScoreOptions): ScoreResult {
  const normalizedScore = Math.round(clamp(options.rawScore));

  return {
    key: options.key,
    label: options.label,
    category: options.category,
    rawScore: options.rawScore,
    normalizedScore,
    confidence: options.confidence ?? scoreConfidence(normalizedScore),
    weight: options.weight ?? 1,
    explanation: options.explanation,
    contributingFactors: options.contributingFactors ?? [],
    source: options.source ?? "computed",
  };
}

export function weightedOverallScore(
  factors: ScoreResult[],
  weights: number[]
): ScoreResult {
  const overallRaw = factors.reduce(
    (total, factor, index) => total + factor.normalizedScore * weights[index],
    0
  );

  return createScoreResult({
    key: "overall",
    label: "Overall EquityOS Score",
    category: "overall",
    rawScore: overallRaw,
    weight: 1,
    explanation: `Weighted composite of ${factors.length} factor scores.`,
    contributingFactors: factors.map((factor, index) => ({
      key: factor.key,
      label: factor.label,
      value: factor.normalizedScore,
      weight: weights[index],
      impact:
        factor.normalizedScore >= 60
          ? "positive"
          : factor.normalizedScore >= 45
            ? "neutral"
            : "negative",
    })),
  });
}
