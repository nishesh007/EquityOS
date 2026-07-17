import { NextRequest, NextResponse } from "next/server";
import {
  getOpportunityState,
  replayRecommendation,
} from "@/lib/opportunity-engine";
import {
  wireHealthReplay,
  wireRecommendationReplay,
} from "@/src/core/recommendations";

type RouteContext = {
  params: Promise<{ recommendationId: string }>;
};

/**
 * Replays the immutable recommendation exactly as generated, plus R2
 * lifecycle timeline / progress and R3 health / conviction drift.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { recommendationId } = await context.params;
  const recommendation = replayRecommendation(
    getOpportunityState(),
    recommendationId
  );
  const lifecycle = wireRecommendationReplay(recommendationId);
  const health = wireHealthReplay(recommendationId);

  if (!recommendation && lifecycle.recommendation.empty && health.card.empty) {
    return NextResponse.json(
      { error: "Recommendation not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ recommendation, lifecycle, health });
}
