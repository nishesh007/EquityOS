import { NextResponse } from "next/server";
import { loadOpportunityEngineState } from "@/services/opportunityEngine";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { resolveCachedIntelligence } from "@/lib/market-orchestrator/dashboardContext";
import {
  assertPublishedConsumerIntegrity,
  loadPublishedRecommendations,
  validatePublishedIntegrity,
} from "@/lib/recommendations/published/server";
import { buildInstitutionalHealthReport } from "@/lib/institutional-intelligence";
import { runRecommendationCalibration } from "@/lib/recommendations/calibration";

export const dynamic = "force-dynamic";

/**
 * GET /api/system/institutional-health
 * Diagnostics across Market State, QG, Calibration, Replay, Outcomes, Ranking, etc.
 */
export async function GET() {
  try {
    const state = await loadOpportunityEngineState();
    const marketIntelligence =
      getCachedMarketIntelligenceSnapshot() ?? resolveCachedIntelligence();
    const published = await loadPublishedRecommendations(state);
    if (published) {
      try {
        validatePublishedIntegrity(published, state);
      } catch {
        // Health endpoint still reports degraded integrity rather than 409.
      }
    }
    const consumer = assertPublishedConsumerIntegrity("api", published, state);
    const calibration = runRecommendationCalibration();

    let databaseOk = true;
    try {
      // Soft probe — presence of tradingDate / persistence path is enough here.
      databaseOk = Boolean(state);
    } catch {
      databaseOk = false;
    }

    const report = buildInstitutionalHealthReport({
      state,
      published,
      breadthScore: marketIntelligence?.context?.breadthScore ?? null,
      consumerSyncOk: consumer.status !== "rejected",
      databaseOk,
      calibrationConfidence: calibration.confidence,
    });

    return NextResponse.json(report);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build institutional health report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
