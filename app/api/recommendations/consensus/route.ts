import { NextResponse } from "next/server";
import { loadOpportunityEngineState } from "@/services/opportunityEngine";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { resolveCachedIntelligence } from "@/lib/market-orchestrator/dashboardContext";
import {
  assertPublishedConsumerIntegrity,
  loadPublishedRecommendations,
  validatePublishedIntegrity,
} from "@/lib/recommendations/published/server";
import { buildConsensusReport } from "@/lib/recommendations/consensus";

export const dynamic = "force-dynamic";

/**
 * GET /api/recommendations/consensus
 * Consensus Recommendation Engine v1 diagnostics.
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
        {
          error: "Published recommendations failed integrity validation.",
          reason: consumer.reason,
        },
        { status: 409 }
      );
    }

    const report = buildConsensusReport(published?.recommendations ?? [], {
      market: {
        breadthScore: marketIntelligence?.context?.breadthScore ?? null,
        asOf: published?.generatedAt ?? state.lastScannedAt ?? null,
      },
    });

    return NextResponse.json({
      generatedAt: report.generatedAt,
      candidateCount: report.candidateCount,
      baseWeights: report.baseWeights,
      recommendations: report.recommendations,
      top5: report.top5,
      notes: report.notes,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build consensus report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
