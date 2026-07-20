/**
 * Central Market Data Orchestrator — foundation.
 * Aggregates existing services once; no new calculations or data transforms.
 */

import {
  fetchMarketIndices,
  fetchPortfolioSummary,
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
  ] = await Promise.all([
    fetchMarketIndices(),
    fetchMarketPulse(),
    fetchMarketBreadth(),
    fetchMarketHeatmap(),
    fetchPortfolioSummary(),
    fetchWatchlist(),
    fetchSharedRecommendationsFresh(),
    getMarketIntelligenceSnapshot(),
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
    timestamp: intelligence.timestamp,
  };
}

/**
 * Future dashboard entry point — central market data snapshot.
 * Concurrent callers share one in-flight Promise (request deduplication only).
 */
export function getDashboardMarketSnapshot(): Promise<DashboardMarketSnapshot> {
  return dedupeInFlight(DASHBOARD_SNAPSHOT_KEY, loadDashboardMarketSnapshot);
}
