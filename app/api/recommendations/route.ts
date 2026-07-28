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
import { loadOpportunityEngineState } from "@/services/opportunityEngine";
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
import {
  assertPublishedConsumerIntegrity,
  loadPublishedRecommendations,
  validatePublishedIntegrity,
} from "@/lib/recommendations/published/server";
import { filledSlotCount } from "@/lib/recommendations";
import { enrichRankedRecommendations } from "@/lib/institutional-intelligence/enrich";
import {
  applyVerificationEngine,
  filterPublishableRecommendations,
  selectVerifiedConsensusStrategyDashboard,
} from "@/lib/recommendations/verification";
import { runRecommendationCalibration } from "@/lib/recommendations/calibration";

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

  const state = await loadOpportunityEngineState();
  const marketIntelligence =
    getCachedMarketIntelligenceSnapshot() ?? resolveCachedIntelligence();

  const published = await loadPublishedRecommendations(state);
  if (published) {
    validatePublishedIntegrity(published, state);
  }

  const apiConsumer = assertPublishedConsumerIntegrity("api", published, state);
  if (apiConsumer.status === "rejected") {
    return NextResponse.json(
      {
        error: "Published recommendations failed integrity validation.",
        reason: apiConsumer.reason,
      },
      { status: 409 }
    );
  }

  const sharedRecommendations =
    !requestedStatus || requestedStatus === "ACTIVE"
      ? (published?.recommendations ?? [])
      : [];

  const rankingMarket = {
    breadthScore: marketIntelligence?.context?.breadthScore ?? null,
    asOf: published?.generatedAt ?? state.lastScannedAt ?? null,
    regime: marketIntelligence?.regime?.regime ?? null,
    marketTrend:
      marketIntelligence?.context?.marketTrend ??
      marketIntelligence?.regime?.regime ??
      null,
  };
  const verifiedRecommendations = applyVerificationEngine(
    sharedRecommendations,
    rankingMarket
  );
  const publishableRecommendations = filterPublishableRecommendations(
    verifiedRecommendations
  );
  const calibration = runRecommendationCalibration();
  const winRateById = new Map(
    publishableRecommendations.map((r) => [r.id, r] as const)
  );
  const enrichedRecommendations = enrichRankedRecommendations(
    publishableRecommendations,
    {
      ...rankingMarket,
      calibrationConfidence: calibration.confidence,
    }
  ).map((rec) => {
    const wr = winRateById.get(rec.id);
    const sampleSize = wr?.sampleSize ?? 0;
    const showExpectedWinRate = sampleSize >= 30;
    return {
      ...rec,
      expectedWinRate: wr?.expectedWinRate ?? rec.expectedWinRate,
      sampleSize,
      expectedWinRateEstimated: wr?.expectedWinRateEstimated ?? true,
      showExpectedWinRate,
      aiConfidence: Math.max(rec.confidence, rec.conviction),
      historicalConfidence: Math.round(
        (wr?.rankingConfidence ?? rec.rankingConfidence ?? 0) * 100
      ),
      winRateSuppressedReason: showExpectedWinRate
        ? null
        : "Historical dataset is insufficient for statistically meaningful win-rate estimation.",
      verificationStatus: wr?.verificationStatus,
      verificationScore: wr?.verificationScore,
      verificationReasons: wr?.verificationReasons,
    };
  });
  const strategyDashboard =
    publishableRecommendations.length > 0
      ? selectVerifiedConsensusStrategyDashboard(
          sharedRecommendations,
          published?.generatedAt ??
            state.lastScannedAt ??
            new Date(0).toISOString(),
          rankingMarket
        )
      : (published?.strategyDashboard ?? []);
  const recommendationCount = filledSlotCount(strategyDashboard);

  const freshness = buildRecommendationFreshness(
    state,
    Math.max(sharedRecommendations.length, recommendationCount)
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
      publishedScanId: published?.scanId ?? null,
      publishedVersion: published?.recommendationVersion ?? null,
    }
  );

  return NextResponse.json({
    recommendations: enrichedRecommendations,
    strategyDashboard,
    published: published
      ? {
          sessionId: published.sessionId,
          scanId: published.scanId,
          generatedAt: published.generatedAt,
          recommendationVersion: published.recommendationVersion,
        }
      : null,
    history: requestedStatus
      ? listRecommendationHistory(state, requestedStatus)
      : listRecommendationHistory(state),
    generatedAt: published?.generatedAt ?? freshness.generatedAt,
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
