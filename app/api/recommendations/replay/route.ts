import { NextRequest, NextResponse } from "next/server";
import { loadOpportunityEngineState } from "@/services/opportunityEngine";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { resolveCachedIntelligence } from "@/lib/market-orchestrator/dashboardContext";
import {
  assertPublishedConsumerIntegrity,
  loadPublishedRecommendations,
  validatePublishedIntegrity,
} from "@/lib/recommendations/published/server";
import { buildRecommendationReplay } from "@/lib/institutional-intelligence";
import { runRecommendationCalibration } from "@/lib/recommendations/calibration";

export const dynamic = "force-dynamic";

/**
 * GET /api/recommendations/replay?recommendationId=...
 * Complete recommendation lifecycle replay (read-only).
 */
export async function GET(request: NextRequest) {
  try {
    const recommendationId =
      request.nextUrl.searchParams.get("recommendationId")?.trim() ?? "";
    if (!recommendationId) {
      return NextResponse.json(
        { error: "recommendationId query param is required" },
        { status: 400 }
      );
    }

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
    const replay = buildRecommendationReplay({
      recommendationId,
      recommendations: published?.recommendations ?? [],
      breadthScore: marketIntelligence?.context?.breadthScore ?? null,
      calibrationConfidence: calibration.confidence,
    });

    if (!replay.found) {
      return NextResponse.json(
        { error: "Recommendation not found", recommendationId },
        { status: 404 }
      );
    }

    return NextResponse.json(replay);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build recommendation replay";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
