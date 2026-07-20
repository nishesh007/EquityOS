/**
 * Lightweight dashboard context for summary widgets.
 * Reuses indices, pulse, and cached breadth / regime / MI snapshots.
 * Never invokes fetchMarketBreadth() or runTradingPipeline().
 */

import { cacheKey, getCachedSync, getStaleCachedSync } from "@/lib/cache";
import {
  serializeContextRegimeSnapshot,
  serializePipelineSnapshot,
} from "@/lib/market-intelligence/serialize";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import { fetchMarketIndices } from "@/services/marketData";
import {
  getCachedMarketIntelligenceSnapshot,
} from "@/services/marketIntelligence";
import {
  fetchMarketPulse,
  marketBreadth as emptyMarketBreadth,
} from "@/services/researchDashboardData";
import {
  getMarketContextService,
  type InstitutionalMarketContext,
} from "@/src/modules/marketContext";
import {
  getMarketRegimeService,
  type MarketRegime,
} from "@/src/modules/marketRegime";
import {
  createFallbackPipelineResult,
  getTradingPipelineService,
} from "@/src/modules/tradingPipeline";
import type { MarketBreadth, MarketIndex, MarketPulse } from "@/types";
import { dedupeInFlight } from "./cache";

const DASHBOARD_CONTEXT_KEY = "dashboard-context";
const BREADTH_CACHE_KEY = cacheKey("market-breadth", "nse");

/**
 * Lightweight summary surface for Market Snapshot / Market Pulse / MI strip.
 */
export interface DashboardContext {
  indices: MarketIndex[];
  pulse: MarketPulse;
  /** Cached breadth summary only — never computed on this path. */
  breadth: MarketBreadth;
  intelligence: MarketIntelligenceSnapshot;
  timestamp: string;
}

/**
 * Resolve intelligence from warm caches only (MI → pipeline → context+regime → fallback).
 * Does not run the trading pipeline or refresh market context.
 */
function resolveCachedIntelligence(): MarketIntelligenceSnapshot {
  const mi = getCachedMarketIntelligenceSnapshot();
  if (mi) return mi;

  const pipeline = getTradingPipelineService().getCachedResult();
  if (pipeline) return serializePipelineSnapshot(pipeline);

  const institutional: InstitutionalMarketContext | null =
    getMarketContextService().getCachedInstitutionalContext();
  const regime: MarketRegime | null =
    getMarketRegimeService().getCachedRegime();
  if (institutional && regime) {
    return serializeContextRegimeSnapshot(institutional, regime);
  }

  return serializePipelineSnapshot(
    createFallbackPipelineResult(
      new Date(),
      "Dashboard summary using neutral fallback — full pipeline not invoked."
    )
  );
}

/**
 * Peek TTL / stale breadth cache only. Never calls fetchMarketBreadth().
 */
function resolveCachedBreadthSummary(): MarketBreadth {
  return (
    getCachedSync<MarketBreadth>(BREADTH_CACHE_KEY) ??
    getStaleCachedSync<MarketBreadth>(BREADTH_CACHE_KEY) ??
    emptyMarketBreadth
  );
}

async function loadDashboardContext(): Promise<DashboardContext> {
  const [indices, pulse] = await Promise.all([
    fetchMarketIndices(),
    fetchMarketPulse(),
  ]);

  const intelligence = resolveCachedIntelligence();
  const breadth = resolveCachedBreadthSummary();

  return {
    indices,
    pulse,
    breadth,
    intelligence,
    timestamp: intelligence.timestamp,
  };
}

/**
 * Dashboard summary entry — request-scoped dedupe only.
 * Concurrent callers share one in-flight Promise.
 */
export function getDashboardContext(): Promise<DashboardContext> {
  return dedupeInFlight(DASHBOARD_CONTEXT_KEY, loadDashboardContext);
}
