/**
 * Recommendation Outcome Engine — lifecycle-complete institutional evaluation.
 * Reuses R1 snapshot, R2 lifecycle, R3 health. Never grades from today's candle alone.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type { LivingRecommendation } from "../lifecycle/RecommendationLifecycleModels";
import type { RecommendationHealthAssessment } from "../health/RecommendationHealthModels";
import {
  buildOutcomeAttribution,
  computeRecommendationPerformance,
  getInstitutionalVerdict,
  resolveExitReason,
  resolveOutcomeState,
  resolveTargetAchieved,
  summarizeRecommendationOutcomes,
} from "./RecommendationPerformanceEngine";
import { trackRecommendationTargets } from "./RecommendationTargetTracker";
import type {
  EvaluateRecommendationOutcomeInput,
  InstitutionalVerdict,
  RecommendationOutcomeAssessment,
  RecommendationOutcomeSummary,
  RecommendationPricePathInput,
} from "./RecommendationOutcomeModels";
import { normalizeOutcomeTimestamp } from "./RecommendationOutcomeModels";

export function evaluateRecommendationOutcome(
  input: EvaluateRecommendationOutcomeInput
): RecommendationOutcomeAssessment {
  const { snapshot, lifecycle = null, health = null, path } = input;
  const evaluatedAt = normalizeOutcomeTimestamp(input.evaluatedAt ?? path?.asOf);
  const targets = trackRecommendationTargets(snapshot, lifecycle, path);
  const performance = computeRecommendationPerformance(
    snapshot,
    targets,
    lifecycle,
    path,
    evaluatedAt
  );
  const state = resolveOutcomeState(lifecycle, targets);
  const verdict = getInstitutionalVerdict(state, performance, health);
  const attribution = buildOutcomeAttribution(state, snapshot, health);

  return Object.freeze({
    recommendationId: snapshot.recommendationId,
    snapshot,
    state,
    lifecycleState: lifecycle?.state ?? null,
    verdict,
    performance,
    targets,
    attribution,
    exitReason: resolveExitReason(state),
    targetAchieved: resolveTargetAchieved(targets),
    lifecycleBadge: state,
    expectedHoldingPeriod: snapshot.expectedHoldingPeriod,
    strategy: snapshot.strategy,
    recommendationDate: snapshot.generatedAt,
    currentHealth: health?.current.currentHealth ?? null,
    originalConviction: snapshot.originalConviction,
    evaluatedAt,
  });
}

export class RecommendationOutcomeEngine {
  private readonly assessments = new Map<string, RecommendationOutcomeAssessment>();

  evaluate(
    input: EvaluateRecommendationOutcomeInput
  ): RecommendationOutcomeAssessment {
    const assessment = evaluateRecommendationOutcome(input);
    this.assessments.set(assessment.recommendationId, assessment);
    return assessment;
  }

  get(recommendationId: string): RecommendationOutcomeAssessment | undefined {
    return this.assessments.get(recommendationId);
  }

  list(): RecommendationOutcomeAssessment[] {
    return [...this.assessments.values()].sort(
      (a, b) =>
        Date.parse(b.evaluatedAt) - Date.parse(a.evaluatedAt) ||
        b.recommendationId.localeCompare(a.recommendationId)
    );
  }

  listRunning(): RecommendationOutcomeAssessment[] {
    return this.list().filter((item) =>
      ["Pending Entry", "Entry Triggered", "Running", "Trailing"].includes(
        item.state
      )
    );
  }

  listCompleted(): RecommendationOutcomeAssessment[] {
    return this.list().filter(
      (item) =>
        !["Pending Entry", "Entry Triggered", "Running", "Trailing"].includes(
          item.state
        )
    );
  }

  summary(): RecommendationOutcomeSummary {
    return summarizeRecommendationOutcomes(this.list());
  }

  clear(): void {
    this.assessments.clear();
  }
}

export type {
  RecommendationSnapshot,
  LivingRecommendation,
  RecommendationHealthAssessment,
  RecommendationPricePathInput,
  InstitutionalVerdict,
};
