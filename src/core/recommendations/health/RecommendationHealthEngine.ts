/**
 * Recommendation Health Engine — Current Health evolves; Original Conviction stays frozen.
 * Reuses R1 snapshots and engine-supplied factor scores. No conviction regeneration.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import {
  buildHealthExplanation,
  calculateConvictionDrift,
} from "./ConvictionDriftEngine";
import {
  aggregateCurrentHealth,
  buildHealthFactors,
  collectFundamentalHealth,
  collectMarketHealth,
  collectSectorHealth,
  collectTechnicalHealth,
} from "./HealthFactorEngine";
import type {
  CalculateHealthInput,
  ConvictionDriftResult,
  RecommendationHealthAssessment,
  RecommendationHealthExplanation,
  RecommendationHealthFactor,
  RecommendationHealthFactorInput,
  RecommendationHealthState,
} from "./RecommendationHealthModels";
import {
  clampScore,
  extractOriginalValues,
  normalizeTimestamp,
  roundScore,
} from "./RecommendationHealthModels";

function resolveHealthState(
  currentHealth: number,
  invalidated: boolean
): RecommendationHealthState {
  if (invalidated) return "Invalidated";
  if (currentHealth >= 90) return "Very Strong";
  if (currentHealth >= 80) return "Strong";
  if (currentHealth >= 70) return "Healthy";
  if (currentHealth >= 55) return "Neutral";
  if (currentHealth >= 40) return "Weak";
  return "Critical";
}

function readMomentum(
  factors: readonly RecommendationHealthFactor[]
): number | null {
  const momentum = factors.find((factor) => factor.key === "Momentum");
  return momentum?.currentScore ?? null;
}

function readRisk(
  factors: readonly RecommendationHealthFactor[],
  input: RecommendationHealthFactorInput
): number | null {
  if (typeof input.risk === "number" && Number.isFinite(input.risk)) {
    return clampScore(input.risk);
  }
  const risk = factors.find((factor) => factor.key === "Risk");
  return risk?.currentScore ?? null;
}

export function calculateHealth(
  input: CalculateHealthInput
): RecommendationHealthAssessment {
  const original = extractOriginalValues(input.snapshot);
  const factorInput = input.factors ?? {};
  const factors = buildHealthFactors(original, factorInput);
  const invalidated = Boolean(input.invalidated);
  const currentHealth = invalidated
    ? 0
    : aggregateCurrentHealth(original.originalConviction, factors);
  const drift = calculateConvictionDrift(
    original.originalConviction,
    currentHealth,
    factors,
    input.previousHealth
  );
  const explanation = buildHealthExplanation(
    factors,
    original.originalReasons,
    [...input.snapshot.riskFactors]
  );
  const updatedAt = normalizeTimestamp(input.asOf);

  return Object.freeze({
    recommendationId: input.snapshot.recommendationId,
    snapshot: input.snapshot,
    original,
    current: Object.freeze({
      currentHealth,
      currentTrust:
        typeof factorInput.currentTrust === "number"
          ? clampScore(factorInput.currentTrust)
          : original.originalTrust,
      currentValidation:
        typeof factorInput.currentValidation === "number"
          ? clampScore(factorInput.currentValidation)
          : original.originalValidation,
      currentRisk: readRisk(factors, factorInput),
      currentMomentum: readMomentum(factors),
      currentTechnicalHealth: collectTechnicalHealth(factors),
      currentFundamentalHealth: collectFundamentalHealth(factors),
      currentSectorHealth: collectSectorHealth(factors),
      currentMarketHealth: collectMarketHealth(factors),
    }),
    state: resolveHealthState(currentHealth, invalidated),
    trend: drift.trend,
    drift,
    factors: Object.freeze(factors),
    explanation,
    updatedAt,
    invalidated,
  });
}

export class RecommendationHealthEngine {
  private readonly assessments = new Map<string, RecommendationHealthAssessment>();

  calculate(input: CalculateHealthInput): RecommendationHealthAssessment {
    const previous = this.assessments.get(input.snapshot.recommendationId);
    const assessment = calculateHealth({
      ...input,
      previousHealth: input.previousHealth ?? previous?.current.currentHealth,
    });
    this.assessments.set(assessment.recommendationId, assessment);
    return assessment;
  }

  get(recommendationId: string): RecommendationHealthAssessment | undefined {
    return this.assessments.get(recommendationId);
  }

  getFactors(recommendationId: string): readonly RecommendationHealthFactor[] | undefined {
    return this.assessments.get(recommendationId)?.factors;
  }

  getExplanation(
    recommendationId: string
  ): RecommendationHealthExplanation | undefined {
    return this.assessments.get(recommendationId)?.explanation;
  }

  getDrift(recommendationId: string): ConvictionDriftResult | undefined {
    return this.assessments.get(recommendationId)?.drift;
  }

  list(): RecommendationHealthAssessment[] {
    return [...this.assessments.values()].sort(
      (a, b) =>
        Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
        b.recommendationId.localeCompare(a.recommendationId)
    );
  }

  clear(): void {
    this.assessments.clear();
  }

  /** Convenience: score-only helper that never mutates the snapshot. */
  scoreOnly(
    snapshot: RecommendationSnapshot,
    factors?: RecommendationHealthFactorInput
  ): number {
    return roundScore(calculateHealth({ snapshot, factors }).current.currentHealth);
  }
}
