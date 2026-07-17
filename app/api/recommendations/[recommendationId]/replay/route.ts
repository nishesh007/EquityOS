import { NextRequest, NextResponse } from "next/server";
import {
  getOpportunityState,
  replayRecommendation,
} from "@/lib/opportunity-engine";
import {
  getRecommendationOutcome,
  getRecommendationReplay,
  wireHealthReplay,
  wireLearningReplay,
  wireOutcomeReplay,
  wireRecommendationReplay,
  wireReplaySurface,
  wireWorkspaceReplay,
} from "@/src/core/recommendations";

type RouteContext = {
  params: Promise<{ recommendationId: string }>;
};

/**
 * Replays the immutable recommendation with R2 lifecycle, R3 health,
 * R4 decision journal / audit, R5 lifecycle-complete outcomes, R6 learning,
 * and R7 institutional workspace.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { recommendationId } = await context.params;
  const recommendation = replayRecommendation(
    getOpportunityState(),
    recommendationId
  );
  const lifecycle = wireRecommendationReplay(recommendationId);
  const health = wireHealthReplay(recommendationId);
  const accountability = wireReplaySurface(recommendationId);
  const decisionReplay = getRecommendationReplay(recommendationId);
  const outcomes = wireOutcomeReplay(recommendationId);
  const outcome = getRecommendationOutcome(recommendationId);

  if (
    !recommendation &&
    lifecycle.recommendation.empty &&
    health.card.empty &&
    accountability.card.empty &&
    outcomes.row.empty
  ) {
    return NextResponse.json(
      { error: "Recommendation not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    recommendation,
    lifecycle,
    health,
    replay: accountability,
    decisionJournal: decisionReplay?.journal ?? null,
    audit: decisionReplay?.audit ?? null,
    comparison: decisionReplay?.comparison ?? null,
    lessons: decisionReplay?.lessons ?? [],
    outcomes,
    learning: wireLearningReplay(),
    workspace: wireWorkspaceReplay(),
    institutionalVerdict: outcome?.verdict ?? outcomes.row.finalGrade,
    expectedHoldingPeriod: outcome?.expectedHoldingPeriod ?? null,
  });
}
