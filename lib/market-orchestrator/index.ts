/**
 * Central Market Data Orchestrator — public surface.
 * Only app/page.tsx should import getDashboardMarketSnapshot().
 */

export { getDashboardMarketSnapshot } from "./orchestrator";
export { getDashboardContext } from "./dashboardContext";
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
