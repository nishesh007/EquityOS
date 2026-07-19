import { NextResponse } from "next/server";
import { fetchOpportunityEngineBundle } from "@/services/opportunityEngine";
import { getStrategyPlatformStatus } from "@/src/modules/strategies";

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
      strategy: c.strategySignal?.strategy ?? c.strategyName ?? null,
      strategyId: c.strategySignal?.strategyId ?? c.strategyId ?? null,
      signal: c.strategySignal?.signal ?? null,
      entry: c.strategySignal?.entry ?? null,
      sl: c.strategySignal?.stopLoss ?? null,
      target: c.strategySignal?.target ?? null,
      evidence: c.strategySignal?.evidence ?? [],
      strategySignals: c.strategySignals ?? [],
      agreement: c.strategyConsensus?.agreementPercent ?? null,
      conflict: c.strategyConsensus?.conflictPercent ?? null,
      supportingStrategies: c.strategyConsensus?.supportingStrategies ?? [],
      opposingStrategies: c.strategyConsensus?.opposingStrategies ?? [],
      frameworkScore: c.frameworkScore ?? null,
      combinedVerdict: c.strategyConsensus?.combinedVerdict ?? null,
      longTermRanking: c.longTermRanking ?? null,
    })),
    context: bundle.marketIntelligence.context,
    regime: bundle.marketIntelligence.regime,
    confidence: bundle.marketIntelligence.confidence,
  });
}
