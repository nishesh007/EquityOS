import { NextRequest, NextResponse } from "next/server";
import {
  listRecommendationHistory,
  type RecommendationRecordStatus,
} from "@/lib/opportunity-engine";
import {
  wireHealthDashboard,
  wireLearningHistory,
  wireOutcomeDashboard,
  wireRecommendationHistory,
  wireReplayHistory,
  wireWorkspaceHistory,
} from "@/src/core/recommendations";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { getStrategyPlatformStatus } from "@/src/modules/strategies";
import { selectSharedRecommendations } from "@/lib/recommendations";
import { ensureOpportunityEngineState } from "@/services/opportunityEngine";

const STATUSES = new Set<RecommendationRecordStatus>([
  "ACTIVE",
  "EXPIRED",
  "INVALIDATED",
  "ARCHIVED",
]);

export async function GET(request: NextRequest) {
  const requestedStatus = request.nextUrl.searchParams
    .get("status")
    ?.toUpperCase() as RecommendationRecordStatus | undefined;

  if (requestedStatus && !STATUSES.has(requestedStatus)) {
    return NextResponse.json(
      { error: `Unsupported recommendation status: ${requestedStatus}` },
      { status: 400 }
    );
  }

  const state = await ensureOpportunityEngineState();
  const [recommendations, marketIntelligence] = await Promise.all([
    Promise.resolve(listRecommendationHistory(state, requestedStatus)),
    getMarketIntelligenceSnapshot(),
  ]);

  const sharedRecommendations =
    !requestedStatus || requestedStatus === "ACTIVE"
      ? selectSharedRecommendations(state)
      : [];

  return NextResponse.json({
    recommendations: sharedRecommendations,
    history: recommendations,
    marketIntelligence,
    strategyPlatform: getStrategyPlatformStatus(),
    pipeline: state.pipeline ?? null,
    eligibility: {
      eligibleStrategyCount: state.pipeline?.eligibleStrategyCount ?? 0,
      rejectedStrategyCount: state.pipeline?.rejectedStrategyCount ?? 0,
      strategies: state.pipeline?.eligibleStrategies ?? [],
      regime: state.pipeline?.regime ?? marketIntelligence.regime.regime,
      confidence: state.pipeline?.confidence ?? marketIntelligence.confidence,
    },
    context: marketIntelligence.context,
    regime: marketIntelligence.regime,
    confidence: marketIntelligence.confidence,
    lifecycle: wireRecommendationHistory(),
    health: wireHealthDashboard(),
    replay: wireReplayHistory(),
    outcomes: wireOutcomeDashboard(),
    learning: wireLearningHistory(),
    workspace: wireWorkspaceHistory(),
  });
}
