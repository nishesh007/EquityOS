import { NextResponse } from "next/server";
import { fetchOpportunityEngineBundle } from "@/services/opportunityEngine";

/**
 * GET /api/opportunities
 * Returns Opportunity Engine state enriched with Trading Pipeline ranking.
 */
export async function GET() {
  const bundle = await fetchOpportunityEngineBundle();
  const state = bundle.state;
  const ranked = Object.values(state.categories)
    .flat()
    .slice()
    .sort(
      (a, b) =>
        (b.opportunityScore ?? b.aiConvictionScore) -
        (a.opportunityScore ?? a.aiConvictionScore)
    )
    .map((c, index) => ({
      ...c,
      opportunityRank: index + 1,
    }));

  return NextResponse.json({
    ...state,
    marketIntelligence: bundle.marketIntelligence,
    pipeline: state.pipeline ?? null,
    eligibility: {
      eligibleStrategyCount: state.pipeline?.eligibleStrategyCount ?? 0,
      rejectedStrategyCount: state.pipeline?.rejectedStrategyCount ?? 0,
      strategies: state.pipeline?.eligibleStrategies ?? [],
      regime: state.pipeline?.regime ?? bundle.marketIntelligence.regime.regime,
      confidence:
        state.pipeline?.confidence ?? bundle.marketIntelligence.confidence,
    },
    ranking: ranked.map((c) => ({
      id: c.id,
      symbol: c.symbol,
      category: c.category,
      rank: c.rank,
      opportunityRank: c.opportunityRank,
      opportunityScore: c.opportunityScore ?? null,
      eligibilityScore: c.eligibilityScore ?? null,
      aiConvictionScore: c.aiConvictionScore,
      confidence: c.confidencePercent,
      pipelineEligible: c.pipelineEligible ?? null,
      marketRegime: c.marketRegime ?? null,
      marketTrend: c.marketTrend ?? null,
      riskMode: c.riskMode ?? null,
      reasons: c.eligibleReasons ?? [],
      rejectedReasons: c.rejectedReasons ?? [],
    })),
    context: bundle.marketIntelligence.context,
    regime: bundle.marketIntelligence.regime,
    confidence: bundle.marketIntelligence.confidence,
  });
}
