import { NextResponse } from "next/server";
import { loadOpportunityEngineState } from "@/services/opportunityEngine";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { resolveCachedIntelligence } from "@/lib/market-orchestrator/dashboardContext";
import {
  assertPublishedConsumerIntegrity,
  loadPublishedRecommendations,
  validatePublishedIntegrity,
} from "@/lib/recommendations/published/server";
import { buildRecommendationLeaderboard } from "@/lib/institutional-intelligence";
import { runRecommendationCalibration } from "@/lib/recommendations/calibration";

export const dynamic = "force-dynamic";

/**
 * GET /api/recommendations/leaderboard
 */
export async function GET() {
  try {
    const state = await loadOpportunityEngineState();
    const marketIntelligence =
      getCachedMarketIntelligenceSnapshot() ?? resolveCachedIntelligence();
    const published = await loadPublishedRecommendations(state);
    if (published) validatePublishedIntegrity(published, state);
    const consumer = assertPublishedConsumerIntegrity("api", published, state);
    if (consumer.status === "rejected") {
      return NextResponse.json(
        { error: "Published recommendations failed integrity validation.", reason: consumer.reason },
        { status: 409 }
      );
    }

    const calibration = runRecommendationCalibration();
    const leaderboard = buildRecommendationLeaderboard(
      published?.recommendations ?? [],
      {
        breadthScore: marketIntelligence?.context?.breadthScore ?? null,
        asOf: published?.generatedAt ?? state.lastScannedAt ?? null,
        calibrationConfidence: calibration.confidence,
      }
    );

    return NextResponse.json(leaderboard);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build recommendation leaderboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
