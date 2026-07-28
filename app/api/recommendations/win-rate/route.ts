import { NextResponse } from "next/server";
import { loadOpportunityEngineState } from "@/services/opportunityEngine";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { resolveCachedIntelligence } from "@/lib/market-orchestrator/dashboardContext";
import {
  assertPublishedConsumerIntegrity,
  loadPublishedRecommendations,
  validatePublishedIntegrity,
} from "@/lib/recommendations/published/server";
import { buildWinRateFilterReport } from "@/lib/recommendations/win-rate-filter";

export const dynamic = "force-dynamic";

/**
 * GET /api/recommendations/win-rate
 * Historical Win Rate Filter diagnostics (completed paper outcomes only).
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

    const report = buildWinRateFilterReport(published?.recommendations ?? [], {
      market: {
        breadthScore: marketIntelligence?.context?.breadthScore ?? null,
        asOf: published?.generatedAt ?? state.lastScannedAt ?? null,
      },
    });

    return NextResponse.json({
      generatedAt: report.generatedAt,
      candidateCount: report.candidateCount,
      minSample: report.minSample,
      top: report.top,
      recommendations: report.recommendations.map((r) => ({
        recommendation: {
          id: r.recommendationId,
          symbol: r.symbol,
          company: r.company,
          primaryStrategy: r.primaryStrategy,
          conviction: r.conviction,
          riskReward: r.riskReward,
          institutionalRank: r.institutionalRank,
        },
        historicalWinRate: r.showExpectedWinRate ? r.expectedWinRate : null,
        expectedWinRate: r.showExpectedWinRate ? r.expectedWinRate : null,
        sampleSize: r.sampleSize,
        estimated: r.estimated,
        showExpectedWinRate: r.showExpectedWinRate,
        display: r.showExpectedWinRate
          ? {
              expectedWinRate: r.expectedWinRate,
              sampleSize: r.sampleSize,
            }
          : {
              aiConfidence: r.aiConfidence,
              historicalConfidence: r.historicalConfidence,
              sampleSize: r.sampleSize,
              reason: r.winRateSuppressedReason,
            },
      })),
      notes: report.notes,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build win-rate filter report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
