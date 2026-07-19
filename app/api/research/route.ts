import { NextResponse } from "next/server";
import { getOpportunityState } from "@/lib/opportunity-engine";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { getStrategyPlatformStatus } from "@/src/modules/strategies";
import {
  POSITION_STRATEGY_IDS,
  SWING_STRATEGY_IDS,
} from "@/lib/opportunity-engine/swing-position-catalog";

/**
 * GET /api/research
 * Research Workspace payload backed by Strategy Engine Swing/Position outputs.
 */
export async function GET() {
  const [state, marketIntelligence] = await Promise.all([
    Promise.resolve(getOpportunityState()),
    getMarketIntelligenceSnapshot(),
  ]);

  const candidates = [
    ...state.categories.swing,
    ...state.categories.breakout,
    ...state.categories.momentum,
    ...state.categories.ai_high_conviction,
  ]
    .filter((candidate) => candidate.strategySignal)
    .sort(
      (left, right) =>
        (right.frameworkScore ?? right.opportunityScore ?? 0) -
        (left.frameworkScore ?? left.opportunityScore ?? 0)
    );

  return NextResponse.json({
    marketIntelligence,
    strategyPlatform: getStrategyPlatformStatus(),
    suites: {
      swing: [...SWING_STRATEGY_IDS],
      position: [...POSITION_STRATEGY_IDS],
    },
    ideas: candidates.map((candidate, index) => ({
      id: candidate.id,
      symbol: candidate.symbol,
      company: candidate.company,
      category: candidate.category,
      rank: index + 1,
      primaryStrategy: candidate.strategyConsensus?.primaryStrategy ?? candidate.strategyName,
      supportingStrategies:
        candidate.strategyConsensus?.supportingStrategies ?? [],
      opposingStrategies: candidate.strategyConsensus?.opposingStrategies ?? [],
      agreement: candidate.strategyConsensus?.agreementPercent ?? null,
      conflict: candidate.strategyConsensus?.conflictPercent ?? null,
      opportunityScore: candidate.opportunityScore ?? null,
      frameworkScore: candidate.frameworkScore ?? null,
      confidence: candidate.confidencePercent,
      conviction: candidate.strategyConsensus?.conviction ?? null,
      reasons: candidate.eligibleReasons ?? [],
      evidence: candidate.strategySignal?.evidence ?? [],
      frameworks: {
        technical: candidate.strategyConsensus?.technicalFramework ?? [],
        fundamental: candidate.strategyConsensus?.fundamentalFramework ?? [],
        valuation: candidate.strategyConsensus?.valuationFramework ?? [],
        growth: candidate.strategyConsensus?.growthFramework ?? [],
      },
      combinedVerdict: candidate.strategyConsensus?.combinedVerdict ?? null,
      longTermRanking: candidate.longTermRanking ?? null,
      strategySignals: candidate.strategySignals ?? [],
      signal: candidate.strategySignal ?? null,
    })),
    context: marketIntelligence.context,
    regime: marketIntelligence.regime,
    confidence: marketIntelligence.confidence,
  });
}
