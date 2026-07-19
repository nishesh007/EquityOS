import type { IntradayIdea, SwingTradeIdea } from "@/types";
import {
  getOpportunityState,
  runOpportunityScan,
  SCAN_INTERVAL_MS,
  type OpportunityCandidate,
  type OpportunityEngineState,
  type ScanResult,
} from "@/lib/opportunity-engine";
import { buildIntradayOpportunities } from "@/lib/opportunity-engine/ranking";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import {
  selectSharedRecommendations,
  type SharedRecommendation,
} from "@/lib/recommendations";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";

export interface OpportunityEngineBundle {
  state: OpportunityEngineState;
  marketIntelligence: MarketIntelligenceSnapshot;
}

export async function fetchOpportunityEngineState(): Promise<OpportunityEngineState> {
  return ensureOpportunityEngineState();
}

export function fetchSharedRecommendations(
  limit?: number
): SharedRecommendation[] {
  const recommendations = selectSharedRecommendations(getOpportunityState());
  return typeof limit === "number"
    ? recommendations.slice(0, limit)
    : recommendations;
}

export async function fetchSharedRecommendationsFresh(
  limit?: number
): Promise<SharedRecommendation[]> {
  const state = await ensureOpportunityEngineState();
  const recommendations = selectSharedRecommendations(state);
  return typeof limit === "number"
    ? recommendations.slice(0, limit)
    : recommendations;
}

export function fetchRecommendationForSymbol(
  symbol: string
): SharedRecommendation | null {
  const normalized = symbol.trim().toUpperCase();
  return (
    selectSharedRecommendations(getOpportunityState()).find(
      (recommendation) => recommendation.symbol.toUpperCase() === normalized
    ) ?? null
  );
}

export function fetchRecommendationsForSymbols(
  symbols: readonly string[]
): Map<string, SharedRecommendation> {
  const wanted = new Set(symbols.map((symbol) => symbol.toUpperCase()));
  return new Map(
    selectSharedRecommendations(getOpportunityState())
      .filter((recommendation) => wanted.has(recommendation.symbol.toUpperCase()))
      .map((recommendation) => [
        recommendation.symbol.toUpperCase(),
        recommendation,
      ])
  );
}

export function fetchStandardizedStrategySignals(
  limit = 8
): OpportunityCandidate[] {
  return Object.values(getOpportunityState().categories)
    .flat()
    .filter((candidate) => candidate.strategySignal !== undefined)
    .sort(
      (left, right) =>
        (right.opportunityScore ?? 0) - (left.opportunityScore ?? 0)
    )
    .slice(0, limit);
}

export function fetchSwingPositionStrategyCandidates(
  limit = 8
): OpportunityCandidate[] {
  const state = getOpportunityState();
  return [
    ...state.categories.swing,
    ...state.categories.breakout,
    ...state.categories.momentum,
    ...state.categories.ai_high_conviction,
  ]
    .filter((candidate) => candidate.strategyConsensus !== undefined)
    .sort(
      (left, right) =>
        (right.frameworkScore ?? right.opportunityScore ?? 0) -
        (left.frameworkScore ?? left.opportunityScore ?? 0)
    )
    .slice(0, limit);
}

export function fetchWatchlistStrategyMatches(
  symbols: readonly string[]
): Map<string, OpportunityCandidate> {
  const wanted = new Set(symbols.map((symbol) => symbol.toUpperCase()));
  const matches = new Map<string, OpportunityCandidate>();
  for (const candidate of Object.values(getOpportunityState().categories).flat()) {
    const symbol = candidate.symbol.toUpperCase();
    if (!wanted.has(symbol) || !candidate.strategySignal) continue;
    const existing = matches.get(symbol);
    if (
      !existing ||
      (candidate.opportunityScore ?? 0) > (existing.opportunityScore ?? 0)
    ) {
      matches.set(symbol, candidate);
    }
  }
  return matches;
}

/**
 * Opportunity Engine + shared Market Context / Regime snapshot.
 * Context is computed once via marketIntelligence — never duplicated here.
 */
export async function fetchOpportunityEngineBundle(): Promise<OpportunityEngineBundle> {
  const [state, marketIntelligence] = await Promise.all([
    ensureOpportunityEngineState(),
    getMarketIntelligenceSnapshot(),
  ]);
  return { state, marketIntelligence };
}

/**
 * Force scan through Trading Pipeline → Eligibility → Opportunity Score.
 * marketIntelligence is refreshed with the same shared pipeline cache.
 */
export async function triggerOpportunityScan(): Promise<
  ScanResult & { marketIntelligence: MarketIntelligenceSnapshot }
> {
  const result = await runOpportunityScan(true);
  // Prefer engine-persisted pipeline; refresh shared snapshot without double force
  // when the scan already warmed the trading pipeline cache.
  const marketIntelligence = await getMarketIntelligenceSnapshot({
    forceRefresh: false,
  });
  return { ...result, marketIntelligence };
}

let freshnessScan: Promise<OpportunityEngineState> | null = null;

/**
 * Ensures consumers share one fresh scan instead of launching per-surface
 * Strategy Engine executions.
 */
export async function ensureOpportunityEngineState(): Promise<OpportunityEngineState> {
  const current = getOpportunityState();
  const lastScan = current.lastScannedAt
    ? Date.parse(current.lastScannedAt)
    : Number.NaN;
  if (
    Number.isFinite(lastScan) &&
    Date.now() - lastScan < SCAN_INTERVAL_MS
  ) {
    return current;
  }
  if (!freshnessScan) {
    freshnessScan = triggerOpportunityScan()
      .then((result) => result.state)
      .finally(() => {
        freshnessScan = null;
      });
  }
  return freshnessScan;
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

