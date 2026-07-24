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
import { getStrategyPlatformStatus } from "@/src/modules/strategies";
import { selectRecommendationsWithFallback, selectInstitutionalStrategyDashboard } from "@/lib/recommendations";
import {
  peekOpportunityEngineState,
  toSharedSnapshot,
} from "@/services/opportunityEngine";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import {
  resolveCachedIntelligence,
} from "@/lib/market-orchestrator/dashboardContext";

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

  // Store + cached MI only — never await OE scan or MI pipeline on this GET.
  const state = peekOpportunityEngineState();
  const marketIntelligence =
    getCachedMarketIntelligenceSnapshot() ?? resolveCachedIntelligence();
  const recommendations = requestedStatus
    ? listRecommendationHistory(state, requestedStatus)
    : [];

  const sharedRecommendations =
    !requestedStatus || requestedStatus === "ACTIVE"
      ? selectRecommendationsWithFallback(
          state,
          toSharedSnapshot(marketIntelligence)
        )
      : [];

  const strategyDashboard =
    !requestedStatus || requestedStatus === "ACTIVE"
      ? selectInstitutionalStrategyDashboard(
          state,
          toSharedSnapshot(marketIntelligence)
        )
      : [];

  return NextResponse.json({
    recommendations: sharedRecommendations,
    strategyDashboard,
    history: requestedStatus ? recommendations : listRecommendationHistory(state),
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
