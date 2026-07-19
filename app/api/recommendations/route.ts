import { NextRequest, NextResponse } from "next/server";
import {
  getOpportunityState,
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

  const state = getOpportunityState();
  const [recommendations, marketIntelligence] = await Promise.all([
    Promise.resolve(listRecommendationHistory(state, requestedStatus)),
    getMarketIntelligenceSnapshot(),
  ]);

  const enriched = recommendations.map((rec, index) => {
    const candidate = rec.candidate;
    return {
      ...rec,
      eligible: candidate?.pipelineEligible ?? null,
      eligibilityScore: candidate?.eligibilityScore ?? null,
      opportunityScore: candidate?.opportunityScore ?? null,
      opportunityRank: index + 1,
      marketRegime:
        candidate?.marketRegime ?? state.pipeline?.regime ?? marketIntelligence.regime.regime,
      marketTrend:
        candidate?.marketTrend ??
        state.pipeline?.marketTrend ??
        marketIntelligence.context.marketTrend,
      riskMode:
        candidate?.riskMode ??
        state.pipeline?.riskMode ??
        marketIntelligence.context.riskMode,
      confidence:
        candidate?.pipelineConfidence ??
        candidate?.confidencePercent ??
        marketIntelligence.confidence,
      reasons: candidate?.eligibleReasons ?? [],
      rejectedReasons: candidate?.rejectedReasons ?? [],
      strategy:
        candidate?.strategySignal?.strategy ?? candidate?.strategyName ?? null,
      strategyId:
        candidate?.strategySignal?.strategyId ?? candidate?.strategyId ?? null,
      signal: candidate?.strategySignal?.signal ?? null,
      entry: candidate?.strategySignal?.entry ?? null,
      sl: candidate?.strategySignal?.stopLoss ?? null,
      target: candidate?.strategySignal?.target ?? null,
      evidence: candidate?.strategySignal?.evidence ?? [],
      strategySignals: candidate?.strategySignals ?? [],
    };
  });

  return NextResponse.json({
    recommendations: enriched,
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
