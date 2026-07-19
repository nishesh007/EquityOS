import {
  getOpportunityState,
  runOpportunityScan,
  SCAN_INTERVAL_MS,
  type OpportunityEngineState,
  type ScanResult,
} from "@/lib/opportunity-engine";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import {
  selectRecommendationsWithFallback,
  type SharedRecommendation,
} from "@/lib/recommendations";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";

export interface OpportunityEngineBundle {
  state: OpportunityEngineState;
  marketIntelligence: MarketIntelligenceSnapshot;
}

export async function fetchSharedRecommendationsFresh(
  limit?: number
): Promise<SharedRecommendation[]> {
  const state = await ensureOpportunityEngineState();
  const recommendations = selectRecommendationsWithFallback(state);
  return typeof limit === "number"
    ? recommendations.slice(0, limit)
    : recommendations;
}

export function fetchRecommendationForSymbol(
  symbol: string
): SharedRecommendation | null {
  const normalized = symbol.trim().toUpperCase();
  return (
    selectRecommendationsWithFallback(getOpportunityState()).find(
      (recommendation) => recommendation.symbol.toUpperCase() === normalized
    ) ?? null
  );
}

export function fetchRecommendationsForSymbols(
  symbols: readonly string[]
): Map<string, SharedRecommendation> {
  const wanted = new Set(symbols.map((symbol) => symbol.toUpperCase()));
  return new Map(
    selectRecommendationsWithFallback(getOpportunityState())
      .filter((recommendation) => wanted.has(recommendation.symbol.toUpperCase()))
      .map((recommendation) => [
        recommendation.symbol.toUpperCase(),
        recommendation,
      ])
  );
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
 *
 * Recovery: when the last scan is stale but the Opportunity Engine already
 * holds candidates, return them immediately and refresh in the background so
 * Dashboard / Watchlist / Portfolio never go empty while Strategy Engine
 * re-executes.
 */
export async function ensureOpportunityEngineState(): Promise<OpportunityEngineState> {
  const current = getOpportunityState();
  const lastScan = current.lastScannedAt
    ? Date.parse(current.lastScannedAt)
    : Number.NaN;
  const isFresh =
    Number.isFinite(lastScan) &&
    Date.now() - lastScan < SCAN_INTERVAL_MS;
  if (isFresh) {
    return current;
  }

  if (!freshnessScan) {
    freshnessScan = triggerOpportunityScan()
      .then((result) => result.state)
      .finally(() => {
        freshnessScan = null;
      });
  }

  const hasCandidates = Object.values(current.categories).some(
    (candidates) => candidates.length > 0
  );
  if (hasCandidates) {
    return current;
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


