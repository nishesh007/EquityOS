/**
 * Central Market Data Orchestrator.
 * Aggregates existing dashboard services once; no new calculations or data transforms.
 * Breadth is resolved once as a shared snapshot before dependent intelligence/context loads.
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
  fetchMarketHeatmap,
  fetchMarketPulse,
} from "@/services/researchDashboardData";
import { getSharedDashboardBreadth } from "./breadth";
import { dedupeInFlight } from "./cache";
import type { DashboardMarketSnapshot } from "./types";

const DASHBOARD_SNAPSHOT_KEY = "dashboard-market-snapshot";

/**
 * Load and aggregate existing dashboard market services.
 * Breadth runs once first so Market Context / Intelligence reuse the same cached object.
 */
async function loadDashboardMarketSnapshot(): Promise<DashboardMarketSnapshot> {
  // Shared breadth snapshot — sole orchestrator-owned breadth fetch for this request.
  const breadth = await getSharedDashboardBreadth();

  const [
    indices,
    pulse,
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
