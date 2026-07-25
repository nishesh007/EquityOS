/**
 * Lightweight dashboard context for summary widgets.
 * Reuses indices, pulse, and cached breadth / regime / MI snapshots.
 * Never invokes fetchMarketBreadth() or runTradingPipeline().
 */

import { cache } from "react";
import {
  cacheKey,
  getCachedSync,
  getStaleCachedSync,
  seedCache,
  CACHE_TTL,
} from "@/lib/cache";
import { readLastBreadthSnapshot } from "@/lib/market-breadth/last-snapshot";
import {
  serializeContextRegimeSnapshot,
  serializePipelineSnapshot,
} from "@/lib/market-intelligence/serialize";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import {
  getCachedMarketIntelligenceSnapshot,
} from "@/services/marketIntelligence";
import { emptyMarketBreadth } from "@/services/emptyMarketBreadth";
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
import {
  memoizedFetchMarketIndices,
  memoizedFetchMarketPulse,
} from "./memoizedReads";

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
 * React cache() ensures one resolution per dashboard RSC request.
 */
export const resolveCachedIntelligence = cache(
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
);

function isUsableBreadth(breadth: MarketBreadth): boolean {
  const movers =
    (breadth.gainers?.length ?? 0) +
    (breadth.losers?.length ?? 0) +
    (breadth.mostActive?.length ?? 0);
  const participation = breadth.advances + breadth.declines + breadth.unchanged;
  return (
    movers > 0 ||
    participation > 0 ||
    (breadth.sectors?.length ?? 0) > 0 ||
    ((breadth.totalStocks ?? 0) > 0 && (breadth.quotedStocks ?? 0) > 0)
  );
}

/**
 * Peek TTL / stale / previous-session breadth only. Never calls fetchMarketBreadth().
 */
function resolveCachedBreadthSummary(): MarketBreadth {
  const mem =
    getCachedSync<MarketBreadth>(BREADTH_CACHE_KEY) ??
    getStaleCachedSync<MarketBreadth>(BREADTH_CACHE_KEY);
  if (mem && isUsableBreadth(mem)) return mem;

  const disk = readLastBreadthSnapshot("nse");
  if (disk && isUsableBreadth(disk)) {
    seedCache(BREADTH_CACHE_KEY, disk, CACHE_TTL.FIFTEEN_MINUTES);
    return disk;
  }

  return mem ?? emptyMarketBreadth;
}

async function loadDashboardContext(): Promise<DashboardContext> {
  const [indices, pulse] = await Promise.all([
    memoizedFetchMarketIndices(),
    memoizedFetchMarketPulse(),
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
 * Dashboard summary entry — React cache() per RSC request + in-flight coalesce.
 */
export const getDashboardContext = cache(
  function getDashboardContext(): Promise<DashboardContext> {
    return dedupeInFlight(DASHBOARD_CONTEXT_KEY, loadDashboardContext);
  }
);
