/**
 * Central Market Data Orchestrator.
 * Aggregates existing dashboard services once; no new calculations or data transforms.
 * Summary widgets (Snapshot / Pulse / Intelligence) use lightweight dashboardContext —
 * never runTradingPipeline() or fetchMarketBreadth() on the render path.
 * Heatmap is resolved once as a shared snapshot and passed to MarketHeatmap as initial.
 */

import {
  fetchMarketNews,
  fetchPortfolioSummary,
  fetchUpcomingResults,
  fetchWatchlist,
} from "@/services/marketData";
import {
  ensureOpportunityEngineState,
  toSharedSnapshot,
} from "@/services/opportunityEngine";
import { selectRecommendationsWithFallback } from "@/lib/recommendations";
import { dedupeInFlight } from "./cache";
import { getDashboardContext } from "./dashboardContext";
import { getSharedDashboardHeatmap } from "./heatmap";
import type { DashboardMarketSnapshot } from "./types";

const DASHBOARD_SNAPSHOT_KEY = "dashboard-market-snapshot";

/**
 * Recommendations for the dashboard — reuse persisted OE state + cached MI.
 * Does not await getMarketIntelligenceSnapshot() / trading pipeline.
 */
async function loadDashboardRecommendations(
  intelligence: DashboardMarketSnapshot["intelligence"]
) {
  const state = await ensureOpportunityEngineState();
  return selectRecommendationsWithFallback(
    state,
    toSharedSnapshot(intelligence)
  );
}

/**
 * Load and aggregate existing dashboard market services.
 * Lightweight dashboardContext supplies indices, pulse, cached breadth, and cached MI.
 * Heatmap runs once via shared snapshot; dashboard widgets reuse that object (no second engine).
 */
async function loadDashboardMarketSnapshot(): Promise<DashboardMarketSnapshot> {
  const dashboardContext = await getDashboardContext();

  const [heatmap, portfolio, watchlist, recommendations, news, upcomingResults] =
    await Promise.all([
      getSharedDashboardHeatmap(),
      fetchPortfolioSummary(),
      fetchWatchlist(),
      loadDashboardRecommendations(dashboardContext.intelligence),
      fetchMarketNews(),
      fetchUpcomingResults(),
    ]);

  return {
    market: {
      indices: dashboardContext.indices,
      pulse: dashboardContext.pulse,
    },
    context: dashboardContext.intelligence.context,
    breadth: dashboardContext.breadth,
    heatmap,
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

/**
 * Dashboard entry point — central market data snapshot.
 * Concurrent callers share one in-flight Promise (request deduplication only).
 */
export function getDashboardMarketSnapshot(): Promise<DashboardMarketSnapshot> {
  return dedupeInFlight(DASHBOARD_SNAPSHOT_KEY, loadDashboardMarketSnapshot);
}
