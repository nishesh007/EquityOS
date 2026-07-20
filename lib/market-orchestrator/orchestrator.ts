/**
 * Central Market Data Orchestrator.
 * Aggregates existing dashboard services once; no new calculations or data transforms.
 */

import {
  fetchMarketIndices,
  fetchMarketNews,
  fetchPortfolioSummary,
  fetchUpcomingResults,
  fetchWatchlist,
} from "@/services/marketData";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { fetchSharedRecommendationsFresh } from "@/services/opportunityEngine";
import {
  fetchMarketBreadth,
  fetchMarketHeatmap,
  fetchMarketPulse,
} from "@/services/researchDashboardData";
import { dedupeInFlight } from "./cache";
import type { DashboardMarketSnapshot } from "./types";

const DASHBOARD_SNAPSHOT_KEY = "dashboard-market-snapshot";

/**
 * Load and aggregate existing dashboard market services exactly once.
 * Passes service results through unchanged — no recalculation.
 */
async function loadDashboardMarketSnapshot(): Promise<DashboardMarketSnapshot> {
  const [
    indices,
    pulse,
    breadth,
    heatmap,
    portfolio,
    watchlist,
    recommendations,
    intelligence,
    news,
    upcomingResults,
  ] = await Promise.all([
    fetchMarketIndices(),
    fetchMarketPulse(),
    fetchMarketBreadth(),
    fetchMarketHeatmap(),
    fetchPortfolioSummary(),
    fetchWatchlist(),
    fetchSharedRecommendationsFresh(),
    getMarketIntelligenceSnapshot(),
    fetchMarketNews(),
    fetchUpcomingResults(),
  ]);

  return {
    market: {
      indices,
      pulse,
    },
    context: intelligence.context,
    breadth,
    heatmap,
    portfolio,
    watchlist: {
      items: watchlist,
    },
    opportunities: {
      recommendations,
    },
    intelligence,
    news,
    upcomingResults,
    timestamp: intelligence.timestamp,
  };
}

/**
 * Dashboard entry point — central market data snapshot.
 * Concurrent callers share one in-flight Promise (request deduplication only).
 */
export function getDashboardMarketSnapshot(): Promise<DashboardMarketSnapshot> {
  return dedupeInFlight(DASHBOARD_SNAPSHOT_KEY, loadDashboardMarketSnapshot);
}
