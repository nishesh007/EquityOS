/**
 * Central Market Data Orchestrator — granular dashboard loaders.
 * Page SSR must never await the full aggregate; each Suspense slot
 * calls only the slice it needs.
 */

import { cache } from "react";
import { fetchUpcomingResults } from "@/services/marketData";
import { ensureOpportunityEngineHydrated } from "@/lib/opportunity-engine/store";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import { selectRecommendationsWithFallback } from "@/lib/recommendations";
import type { SharedRecommendation } from "@/lib/recommendations";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import {
  getDashboardContext,
  resolveCachedIntelligence,
} from "./dashboardContext";
import {
  memoizedFetchMarketNews,
  memoizedFetchPortfolioSummary,
  memoizedFetchWatchlist,
} from "./memoizedReads";
import type { DashboardMarketSnapshot } from "./types";
import type {
  MarketNews,
  PortfolioSummary as DomainPortfolioSummary,
  UpcomingResult,
  WatchlistItem,
} from "@/types";

function toSharedSnapshot(intelligence: MarketIntelligenceSnapshot | null) {
  if (!intelligence) return undefined;
  return {
    regime: intelligence.regime.regime,
    marketTrend: intelligence.context.marketTrend,
    riskMode: intelligence.context.riskMode,
    confidence: intelligence.confidence,
  };
}

/**
 * Above-fold market strip — indices + pulse + cached breadth/MI only.
 * Never runs trading pipeline, OE scan, heatmap, or portfolio engines.
 */
export const loadDashboardAboveFold = cache(async function loadDashboardAboveFold() {
  return getDashboardContext();
});

/**
 * Persisted OE recommendations — hydrate store + cached MI only.
 * Never awaits OE scan, MI pipeline, portfolio, watchlist, or heatmap.
 */
export const loadDashboardRecommendations = cache(
  async function loadDashboardRecommendations(): Promise<SharedRecommendation[]> {
    const intelligence =
      getCachedMarketIntelligenceSnapshot() ?? resolveCachedIntelligence();
    const state = await ensureOpportunityEngineHydrated();
    return selectRecommendationsWithFallback(
      state,
      toSharedSnapshot(intelligence)
    );
  }
);

/** Portfolio holdings summary — isolated Suspense slice. */
export const loadDashboardPortfolio = cache(
  async function loadDashboardPortfolio(): Promise<DomainPortfolioSummary> {
    return memoizedFetchPortfolioSummary();
  }
);

/** Watchlist items — isolated Suspense slice. */
export const loadDashboardWatchlist = cache(
  async function loadDashboardWatchlist(): Promise<WatchlistItem[]> {
    return memoizedFetchWatchlist();
  }
);

/** Verified news feed — isolated Suspense slice. */
export const loadDashboardNews = cache(
  async function loadDashboardNews(): Promise<MarketNews[]> {
    return memoizedFetchMarketNews();
  }
);

/** Upcoming results calendar — isolated Suspense slice. */
export const loadDashboardUpcomingResults = cache(
  async function loadDashboardUpcomingResults(): Promise<UpcomingResult[]> {
    return fetchUpcomingResults();
  }
);

/**
 * Full aggregate — retained for non-dashboard callers / diagnostics.
 * Dashboard page must not await this on the critical SSR path.
 */
async function loadDashboardMarketSnapshot(): Promise<DashboardMarketSnapshot> {
  const [
    dashboardContext,
    portfolio,
    watchlist,
    recommendations,
    news,
    upcomingResults,
  ] = await Promise.all([
    loadDashboardAboveFold(),
    loadDashboardPortfolio(),
    loadDashboardWatchlist(),
    loadDashboardRecommendations(),
    loadDashboardNews(),
    loadDashboardUpcomingResults(),
  ]);

  return {
    market: {
      indices: dashboardContext.indices,
      pulse: dashboardContext.pulse,
    },
    context: dashboardContext.intelligence.context,
    breadth: dashboardContext.breadth,
    heatmap: null,
    portfolio,
    watchlist: {
      items: watchlist,
    },
    opportunities: {
      recommendations,
    },
    intelligence: dashboardContext.intelligence,
    news,
    upcomingResults,
    timestamp: dashboardContext.timestamp,
  };
}

export const getDashboardMarketSnapshot = cache(
  function getDashboardMarketSnapshot(): Promise<DashboardMarketSnapshot> {
    return loadDashboardMarketSnapshot();
  }
);
