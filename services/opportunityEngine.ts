import type { IntradayIdea, SwingTradeIdea } from "@/types";
import {
  getOpportunityState,
  runOpportunityScan,
  type OpportunityCandidate,
  type OpportunityEngineState,
  type ScanResult,
} from "@/lib/opportunity-engine";
import { buildIntradayOpportunities } from "@/lib/opportunity-engine/ranking";

export async function fetchOpportunityEngineState(): Promise<OpportunityEngineState> {
  return getOpportunityState();
}

export async function triggerOpportunityScan(): Promise<ScanResult> {
  return runOpportunityScan(true);
}

export { getSchedulerHealth } from "@/lib/opportunity-engine/scheduler-health";
export type {
  SchedulerHealth,
  SchedulerStatus,
  SchedulerMarketState,
  DataFreshnessLevel,
} from "@/lib/opportunity-engine/scheduler-health";

export function mapToIntradayIdeas(candidates: OpportunityCandidate[]): IntradayIdea[] {
  return candidates.map((candidate) => ({
    symbol: candidate.symbol,
    company: candidate.company,
    side: candidate.side,
    entry: candidate.entryZone.low,
    stopLoss: candidate.stopLoss,
    target: candidate.target1,
    riskReward: candidate.riskReward,
    conviction: candidate.aiConvictionScore,
    timeHorizon: candidate.timeHorizon ?? "1–4 hours",
    quote: candidate.quote,
  }));
}

export function mapToSwingTradeIdeas(candidates: OpportunityCandidate[]): SwingTradeIdea[] {
  return candidates.map((candidate) => ({
    symbol: candidate.symbol,
    company: candidate.company,
    side: candidate.side,
    entryLow: candidate.entryZone.low,
    entryHigh: candidate.entryZone.high,
    stopLoss: candidate.stopLoss,
    targets: [candidate.target1, candidate.target2],
    technicalScore: candidate.aiConvictionScore,
    fundamentalScore: candidate.confidencePercent,
    quote: candidate.quote,
  }));
}

export async function fetchEngineIntradayIdeas(): Promise<IntradayIdea[]> {
  const state = await fetchOpportunityEngineState();
  return mapToIntradayIdeas(buildIntradayOpportunities(state));
}

export async function fetchEngineSwingTradeIdeas(): Promise<SwingTradeIdea[]> {
  const state = await fetchOpportunityEngineState();
  return mapToSwingTradeIdeas(state.categories.swing);
}

