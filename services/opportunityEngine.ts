import { getOpportunityEngineState } from "@/lib/opportunity-engine/store";
import {
  SCAN_INTERVAL_MS,
  type OpportunityEngineState,
  type ScanResult,
} from "@/lib/opportunity-engine/types";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import {
  selectRecommendationsWithFallback,
  type SharedMarketSnapshot,
  type SharedRecommendation,
} from "@/lib/recommendations";
import {
  getCachedMarketIntelligenceSnapshot,
} from "@/services/marketIntelligence";

export interface OpportunityEngineBundle {
  state: OpportunityEngineState;
  marketIntelligence: MarketIntelligenceSnapshot;
}

function getOpportunityState(): OpportunityEngineState {
  return getOpportunityEngineState();
}

/** Shared regime/context for fallback recommendations (never recalculates). */
export function toSharedSnapshot(
  intelligence: MarketIntelligenceSnapshot | null
): SharedMarketSnapshot | undefined {
  if (!intelligence) return undefined;
  return {
    regime: intelligence.regime.regime,
    marketTrend: intelligence.context.marketTrend,
    riskMode: intelligence.context.riskMode,
    confidence: intelligence.confidence,
  };
}

/**
 * Read persisted OE store only — never starts a scan.
 * Safe for SSR Suspense slots and dashboard first paint.
 */
export async function ensureOpportunityEngineState(): Promise<OpportunityEngineState> {
  return getOpportunityState();
}

/** Sync store peek — dashboard SSR / Suspense loaders. */
export function peekOpportunityEngineState(): OpportunityEngineState {
  return getOpportunityState();
}

export async function fetchSharedRecommendationsFresh(
  limit?: number
): Promise<SharedRecommendation[]> {
  const state = getOpportunityState();
  // Cache-only MI — never run trading pipeline on recommendation reads.
  const { resolveCachedIntelligence } = await import(
    "@/lib/market-orchestrator/dashboardContext"
  );
  const marketIntelligence =
    getCachedMarketIntelligenceSnapshot() ?? resolveCachedIntelligence();
  const recommendations = selectRecommendationsWithFallback(
    state,
    toSharedSnapshot(marketIntelligence)
  );
  return typeof limit === "number"
    ? recommendations.slice(0, limit)
    : recommendations;
}

export function fetchRecommendationForSymbol(
  symbol: string
): SharedRecommendation | null {
  const normalized = symbol.trim().toUpperCase();
  return (
    selectRecommendationsWithFallback(
      getOpportunityState(),
      toSharedSnapshot(getCachedMarketIntelligenceSnapshot())
    ).find(
      (recommendation) => recommendation.symbol.toUpperCase() === normalized
    ) ?? null
  );
}

export function fetchRecommendationsForSymbols(
  symbols: readonly string[]
): Map<string, SharedRecommendation> {
  const wanted = new Set(symbols.map((symbol) => symbol.toUpperCase()));
  return new Map(
    selectRecommendationsWithFallback(
      getOpportunityState(),
      toSharedSnapshot(getCachedMarketIntelligenceSnapshot())
    )
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
 * Does not start an OE scan or MI pipeline.
 */
export async function fetchOpportunityEngineBundle(): Promise<OpportunityEngineBundle> {
  const state = getOpportunityState();
  const { resolveCachedIntelligence } = await import(
    "@/lib/market-orchestrator/dashboardContext"
  );
  const marketIntelligence =
    getCachedMarketIntelligenceSnapshot() ?? resolveCachedIntelligence();
  return { state, marketIntelligence };
}

/**
 * Force scan through Trading Pipeline → Eligibility → Opportunity Score.
 * Engine module is loaded on demand — keeps page compile graphs lighter.
 * Coalesces with any in-flight scan (force does not fork a second universe run).
 */
export async function triggerOpportunityScan(): Promise<
  ScanResult & { marketIntelligence: MarketIntelligenceSnapshot }
> {
  const { runOpportunityScan } = await import("@/lib/opportunity-engine/engine");
  const result = await runOpportunityScan(true);
  const { resolveCachedIntelligence } = await import(
    "@/lib/market-orchestrator/dashboardContext"
  );
  const marketIntelligence =
    getCachedMarketIntelligenceSnapshot() ?? resolveCachedIntelligence();
  return { ...result, marketIntelligence };
}

let backgroundScan: Promise<OpportunityEngineState> | null = null;
let lastBackgroundScanRequestedAt = 0;
const BACKGROUND_SCAN_DEBOUNCE_MS = 30_000;

/**
 * Post-hydration / idle kick — never await on SSR.
 * At most one in-flight scan; debounced across remounts and duplicate page loads.
 * Also starts the Continuous Engine scheduler (once) so intervals run only after
 * a client has hydrated — never from process boot.
 */
export function requestBackgroundOpportunityScan(options?: {
  /** Ignore freshness window (manual refresh). Still coalesces in-flight. */
  force?: boolean;
}): void {
  // Continuous Engine: start interval ticks only after first post-hydrate request.
  void import("@/lib/opportunity-engine/scheduler")
    .then(({ startOpportunityScheduler, isOpportunitySchedulerStarted }) => {
      if (!isOpportunitySchedulerStarted()) {
        startOpportunityScheduler();
      }
    })
    .catch(() => undefined);

  const now = Date.now();
  if (
    !options?.force &&
    now - lastBackgroundScanRequestedAt < BACKGROUND_SCAN_DEBOUNCE_MS
  ) {
    return;
  }

  const current = getOpportunityState();
  if (current.isScanning) return;

  const lastScan = current.lastScannedAt
    ? Date.parse(current.lastScannedAt)
    : Number.NaN;
  const isFresh =
    Number.isFinite(lastScan) && now - lastScan < SCAN_INTERVAL_MS;
  if (!options?.force && isFresh && !categoriesAreEmpty(current)) {
    return;
  }

  if (backgroundScan) return;

  lastBackgroundScanRequestedAt = now;
  backgroundScan = triggerOpportunityScan()
    .then((result) => result.state)
    .catch((error) => {
      console.warn("[OpportunityEngine] Background scan failed:", error);
      return getOpportunityState();
    })
    .finally(() => {
      backgroundScan = null;
    });
}

function categoriesAreEmpty(state: OpportunityEngineState): boolean {
  return Object.values(state.categories).every((list) => list.length === 0);
}

export { getSchedulerHealth } from "@/lib/opportunity-engine/scheduler-health";
export type {
  SchedulerHealth,
  SchedulerStatus,
  SchedulerMarketState,
  DataFreshnessLevel,
} from "@/lib/opportunity-engine/scheduler-health";
