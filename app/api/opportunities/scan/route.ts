import { NextResponse } from "next/server";
import { triggerOpportunityScan } from "@/services/opportunityEngine";

/**
 * POST /api/opportunities/scan
 * Forces a scan through Trading Pipeline → Eligibility → Opportunity Score.
 */
export async function POST() {
  const result = await triggerOpportunityScan();
  const state = result.state;
  const ranked = Object.values(state.categories)
    .flat()
    .slice()
    .sort(
      (a, b) =>
        (b.opportunityScore ?? b.aiConvictionScore) -
        (a.opportunityScore ?? a.aiConvictionScore)
    );

  return NextResponse.json({
    success: true,
    state,
    durationMs: result.durationMs,
    symbolsScanned: result.symbolsScanned,
    added: result.added,
    removed: result.removed,
    updated: result.updated,
    marketIntelligence: result.marketIntelligence,
    pipeline: state.pipeline ?? null,
    eligibility: {
      eligibleStrategyCount: state.pipeline?.eligibleStrategyCount ?? 0,
      rejectedStrategyCount: state.pipeline?.rejectedStrategyCount ?? 0,
      strategies: state.pipeline?.eligibleStrategies ?? [],
      regime: state.pipeline?.regime ?? null,
      confidence: state.pipeline?.confidence ?? null,
    },
    ranking: ranked.map((c, index) => ({
      id: c.id,
      symbol: c.symbol,
      category: c.category,
      rank: c.rank,
      opportunityRank: index + 1,
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
    context: result.marketIntelligence.context,
    regime: result.marketIntelligence.regime,
    confidence: result.marketIntelligence.confidence,
  });
}
