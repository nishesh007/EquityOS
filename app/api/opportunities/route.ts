import { NextResponse } from "next/server";
import {
  fetchOpportunityEngineBundle,
  toSharedSnapshot,
} from "@/services/opportunityEngine";
import { getStrategyPlatformStatus } from "@/src/modules/strategies";
import { selectRecommendationsWithFallback } from "@/lib/recommendations";

/**
 * GET /api/opportunities
 * Returns Opportunity Engine state enriched with Trading Pipeline ranking.
 */
export async function GET() {
  const bundle = await fetchOpportunityEngineBundle();
  const state = bundle.state;

  return NextResponse.json({
    ...state,
    recommendations: selectRecommendationsWithFallback(
      state,
      toSharedSnapshot(bundle.marketIntelligence)
    ),
    marketIntelligence: bundle.marketIntelligence,
    strategyPlatform: getStrategyPlatformStatus(),
    pipeline: state.pipeline ?? null,
    eligibility: {
      eligibleStrategyCount: state.pipeline?.eligibleStrategyCount ?? 0,
      rejectedStrategyCount: state.pipeline?.rejectedStrategyCount ?? 0,
      strategies: state.pipeline?.eligibleStrategies ?? [],
      regime: state.pipeline?.regime ?? bundle.marketIntelligence.regime.regime,
      confidence:
        state.pipeline?.confidence ?? bundle.marketIntelligence.confidence,
    },
    context: bundle.marketIntelligence.context,
    regime: bundle.marketIntelligence.regime,
    confidence: bundle.marketIntelligence.confidence,
  });
}
