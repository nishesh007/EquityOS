import { NextRequest, NextResponse } from "next/server";
import {
  getOpportunityState,
  replayRecommendation,
} from "@/lib/opportunity-engine";
import {
  getRecommendationReplay,
  wireHealthReplay,
  wireRecommendationReplay,
  wireReplaySurface,
} from "@/src/core/recommendations";

type RouteContext = {
  params: Promise<{ recommendationId: string }>;
};

/**
 * Replays the immutable recommendation exactly as generated, plus R2
 * lifecycle, R3 health / conviction drift, and R4 decision journal / audit.
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

  if (
    !recommendation &&
    lifecycle.recommendation.empty &&
    health.card.empty &&
    accountability.card.empty
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
  });
}
