import { NextResponse } from "next/server";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { getStrategyPlatformStatus } from "@/src/modules/strategies";
import {
  POSITION_STRATEGY_IDS,
  SWING_STRATEGY_IDS,
} from "@/lib/opportunity-engine/swing-position-catalog";
import { selectRecommendationsWithFallback } from "@/lib/recommendations";
import { ensureOpportunityEngineState } from "@/services/opportunityEngine";

/**
 * GET /api/research
 * Research Workspace payload backed by Strategy Engine Swing/Position outputs.
 */
export async function GET() {
  const [state, marketIntelligence] = await Promise.all([
    ensureOpportunityEngineState(),
    getMarketIntelligenceSnapshot(),
  ]);

  return NextResponse.json({
    marketIntelligence,
    strategyPlatform: getStrategyPlatformStatus(),
    suites: {
      swing: [...SWING_STRATEGY_IDS],
      position: [...POSITION_STRATEGY_IDS],
    },
    recommendations: selectRecommendationsWithFallback(state),
    context: marketIntelligence.context,
    regime: marketIntelligence.regime,
    confidence: marketIntelligence.confidence,
  });
}
