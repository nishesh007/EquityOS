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
import {
  selectRecommendationsWithFallback,
  selectInstitutionalStrategyDashboard,
} from "@/lib/recommendations";
import {
  loadOpportunityEngineState,
  toSharedSnapshot,
} from "@/services/opportunityEngine";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { resolveCachedIntelligence } from "@/lib/market-orchestrator/dashboardContext";
import {
  countCategoryCandidates,
  logPipelineStages,
} from "@/lib/opportunity-engine/pipeline-telemetry";
import {
  getPersistenceSource,
  peekMemoryPersistedData,
} from "@/lib/opportunity-engine/persistence";
import { buildRecommendationFreshness } from "@/lib/opportunity-engine/recommendation-freshness";

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

  // Hydrate Postgres → .data → /tmp → memory. Never await OE scan on this GET.
  const state = await loadOpportunityEngineState();
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

  const freshness = buildRecommendationFreshness(
    state,
    sharedRecommendations.length
  );

  logPipelineStages(
    "GET /api/recommendations",
    {
      universeReceived: state.universeSize,
      quotesReceived: 0,
      metricsScanned: state.lastScanMetrics?.symbolsScanned ?? 0,
      shortlisted: 0,
      rawCandidates: countCategoryCandidates(state.categories),
      pipelinePassed: countCategoryCandidates(state.categories),
      scoredStored: countCategoryCandidates(state.categories),
      recommendationsStored: state.recommendations?.length ?? 0,
      apiReturned: sharedRecommendations.length,
    },
    {
      memoryPopulated: Boolean(peekMemoryPersistedData()?.state),
      persistenceSource: getPersistenceSource(),
      tradingDate: state.tradingDate,
      lastScannedAt: state.lastScannedAt,
      stale: freshness.stale,
      staleReason: freshness.staleReason,
    }
  );

  return NextResponse.json({
    recommendations: sharedRecommendations,
    strategyDashboard,
    history: requestedStatus
      ? recommendations
      : listRecommendationHistory(state),
    // Closed-market contract: serve latest successful scan with stale markers.
    generatedAt: freshness.generatedAt,
    marketDate: freshness.marketDate,
    stale: freshness.stale,
    staleReason: freshness.staleReason,
    freshness,
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
