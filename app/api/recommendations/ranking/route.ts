import { NextResponse } from "next/server";
import { loadOpportunityEngineState } from "@/services/opportunityEngine";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { resolveCachedIntelligence } from "@/lib/market-orchestrator/dashboardContext";
import {
  assertPublishedConsumerIntegrity,
  loadPublishedRecommendations,
  validatePublishedIntegrity,
} from "@/lib/recommendations/published/server";
import { runInstitutionalRanking } from "@/lib/recommendations/institutional-ranking";

export const dynamic = "force-dynamic";

/**
 * GET /api/recommendations/ranking
 * Institutional Ranking Engine v2 diagnostics.
 * Read-only — does not mutate Published SSOT or Quality Gate.
 */
export async function GET() {
  try {
    const state = await loadOpportunityEngineState();
    const marketIntelligence =
      getCachedMarketIntelligenceSnapshot() ?? resolveCachedIntelligence();
    const published = await loadPublishedRecommendations(state);
    if (published) {
      validatePublishedIntegrity(published, state);
    }
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

    const recommendations = published?.recommendations ?? [];
    const report = runInstitutionalRanking(recommendations, {
      breadthScore: marketIntelligence?.context?.breadthScore ?? null,
      asOf: published?.generatedAt ?? state.lastScannedAt ?? null,
    });

    const serialize = (rec: (typeof report.ranked)[number] | null) =>
      rec
        ? {
            id: rec.id,
            symbol: rec.symbol,
            company: rec.company,
            primaryStrategy: rec.primaryStrategy,
            primaryStrategyId: rec.primaryStrategyId,
            conviction: rec.conviction,
            riskReward: rec.riskReward,
            institutionalRank: rec.institutionalRank,
            rankReason: rec.rankReason,
            expectedWinRate: rec.expectedWinRate,
            expectedExpectancy: rec.expectedExpectancy,
            confidence: rec.rankingConfidence,
            confidenceScore: rec.confidenceScore,
            rankingFactors: rec.rankingFactors,
          }
        : null;

    return NextResponse.json({
      generatedAt: report.generatedAt,
      candidateCount: report.candidateCount,
      closedOutcomesUsed: report.closedOutcomesUsed,
      rankingFactors: report.rankingFactors,
      topRanked: serialize(report.highest),
      lowestRanked: serialize(report.lowest),
      top10: report.top10.map(serialize),
      highest: serialize(report.highest),
      lowest: serialize(report.lowest),
      rankingDistribution: report.scoreDistribution,
      scoreDistribution: report.scoreDistribution,
      rankingReasons: report.highest?.rankReason ?? [],
      expectedWinRate:
        report.highest?.expectedWinRate ?? report.top10[0]?.expectedWinRate ?? null,
      expectedExpectancy:
        report.highest?.expectedExpectancy ??
        report.top10[0]?.expectedExpectancy ??
        null,
      notes: report.notes,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build institutional ranking report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
