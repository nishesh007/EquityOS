import { NextRequest, NextResponse } from "next/server";
import { loadOpportunityEngineState } from "@/services/opportunityEngine";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { resolveCachedIntelligence } from "@/lib/market-orchestrator/dashboardContext";
import {
  assertPublishedConsumerIntegrity,
  loadPublishedRecommendations,
  validatePublishedIntegrity,
} from "@/lib/recommendations/published/server";
import {
  buildKellyPositionSizing,
  buildKellyPositionSizingReport,
} from "@/lib/institutional-intelligence";
import { loadExpectancyTables } from "@/lib/institutional-intelligence/shared";

export const dynamic = "force-dynamic";

/**
 * GET /api/recommendations/position-sizing
 * Optional ?recommendationId=... for a single advisory sizing.
 * Kelly / Half / Quarter — never auto-applied.
 */
export async function GET(request: NextRequest) {
  try {
    const state = await loadOpportunityEngineState();
    const published = await loadPublishedRecommendations(state);
    if (published) validatePublishedIntegrity(published, state);
    const consumer = assertPublishedConsumerIntegrity("api", published, state);
    if (consumer.status === "rejected") {
      return NextResponse.json(
        { error: "Published recommendations failed integrity validation.", reason: consumer.reason },
        { status: 409 }
      );
    }

    const recommendations = published?.recommendations ?? [];
    const tables = loadExpectancyTables(
      published?.generatedAt ?? state.lastScannedAt
    );
    const recommendationId =
      request.nextUrl.searchParams.get("recommendationId")?.trim() ?? "";

    if (recommendationId) {
      const rec = recommendations.find((r) => r.id === recommendationId);
      if (!rec) {
        return NextResponse.json(
          { error: "Recommendation not found", recommendationId },
          { status: 404 }
        );
      }
      const advice = buildKellyPositionSizing(rec, tables);
      return NextResponse.json(advice);
    }

    void getCachedMarketIntelligenceSnapshot;
    void resolveCachedIntelligence;
    return NextResponse.json(buildKellyPositionSizingReport(recommendations, tables));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build position sizing advice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
