/**
 * Central Market Data Orchestrator — public surface.
 * Infrastructure only; nothing should consume this yet (Prompt 1 of 12).
 */

export { getDashboardMarketSnapshot } from "./orchestrator";

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
