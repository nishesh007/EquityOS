/**
 * Central Market Data Orchestrator — public surface.
 * Dashboard page streams via granular loaders + Suspense slots.
 * Prefer loadDashboard* helpers over getDashboardMarketSnapshot().
 */

export {
  getDashboardMarketSnapshot,
  loadDashboardAboveFold,
  loadDashboardRecommendations,
  loadDashboardPortfolio,
  loadDashboardWatchlist,
  loadDashboardNews,
  loadDashboardUpcomingResults,
} from "./orchestrator";
export { getDashboardContext, resolveCachedIntelligence } from "./dashboardContext";
export type { DashboardContext } from "./dashboardContext";

export type {
  DashboardMarketSnapshot,
  MarketBreadth,
  MarketContext,
  MarketHeatmapData,
  MarketIntelligence,
  MarketSnapshot,
  OpportunitySummary,
  PortfolioSummary,
  WatchlistSummary,
} from "./types";
