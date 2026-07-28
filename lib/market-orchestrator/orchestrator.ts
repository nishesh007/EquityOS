/**
 * Central Market Data Orchestrator — granular dashboard loaders.
 * Above-fold market strip uses the canonical Market Snapshot
 * (same Context / Regime / timestamp as the Markets page).
 */

import { cache } from "react";
import { fetchUpcomingResults } from "@/services/marketData";
import { ensureOpportunityEngineHydrated } from "@/lib/opportunity-engine/store";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import { selectRecommendationsWithFallback } from "@/lib/recommendations";
import {
  loadPublishedRecommendationsList,
} from "@/lib/recommendations/published/server";
import type { SharedRecommendation } from "@/lib/recommendations";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import {
  getDashboardContext,
  resolveCachedIntelligence,
} from "./dashboardContext";
import {
  getCachedMarketSnapshot,
} from "./marketsSnapshot";
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
 * Above-fold market strip — canonical Market Snapshot (shared with Markets).
 */
export const loadDashboardAboveFold = cache(async function loadDashboardAboveFold() {
  return getDashboardContext();
});

/**
 * Persisted OE recommendations — prefer warm canonical snapshot intelligence.
 */
export const loadDashboardRecommendations = cache(
  async function loadDashboardRecommendations(): Promise<SharedRecommendation[]> {
    const state = await ensureOpportunityEngineHydrated();
    const published = await loadPublishedRecommendationsList(state);
    if (published.length > 0) return published;

    const intelligence =
      getCachedMarketSnapshot()?.intelligence ??
      getCachedMarketIntelligenceSnapshot() ??
      resolveCachedIntelligence();
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
