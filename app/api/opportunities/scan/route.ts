import { NextResponse } from "next/server";
import { triggerOpportunityScan } from "@/services/opportunityEngine";
import { getStrategyPlatformStatus } from "@/src/modules/strategies";
import { selectRecommendationsWithFallback } from "@/lib/recommendations";

/**
 * POST /api/opportunities/scan
 * Forces a scan through Trading Pipeline → Eligibility → Opportunity Score.
 */
export async function POST() {
  const result = await triggerOpportunityScan();
  const state = result.state;

  return NextResponse.json({
    success: true,
    state,
    recommendations: selectRecommendationsWithFallback(state),
    durationMs: result.durationMs,
    symbolsScanned: result.symbolsScanned,
    added: result.added,
    removed: result.removed,
    updated: result.updated,
    marketIntelligence: result.marketIntelligence,
    strategyPlatform: getStrategyPlatformStatus(),
    pipeline: state.pipeline ?? null,
    eligibility: {
      eligibleStrategyCount: state.pipeline?.eligibleStrategyCount ?? 0,
      rejectedStrategyCount: state.pipeline?.rejectedStrategyCount ?? 0,
      strategies: state.pipeline?.eligibleStrategies ?? [],
      regime: state.pipeline?.regime ?? null,
      confidence: state.pipeline?.confidence ?? null,
    },
    context: result.marketIntelligence.context,
    regime: result.marketIntelligence.regime,
    confidence: result.marketIntelligence.confidence,
  });
}
