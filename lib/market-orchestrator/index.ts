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
  InstitutionalMarketSnapshot,
  MarketCoreSnapshot,
  MarketBreadth,
  MarketContext,
  MarketHeatmapData,
  MarketIntelligence,
  MarketSnapshot,
  OpportunitySummary,
  PortfolioSummary,
  WatchlistSummary,
} from "./types";

export {
  loadMarketSnapshot,
  loadMarketSnapshotUncached,
  loadInstitutionalMarketSnapshot,
  getCachedMarketSnapshot,
  clearMarketSnapshotCache,
  MARKET_SNAPSHOT_TTL_MS,
} from "./marketsSnapshot";
export { assertUniformMarketSnapshotTimestamp } from "./marketsSnapshotGuard";
export {
  MARKETS_REFRESH_MS_OPEN,
  getMarketsRefreshIntervalMs,
  resolveMarketsRefreshMode,
} from "./marketsRefreshPolicy";
export { compareDashboardMarketsIntelligence } from "./dashboard-markets-parity";
export type { IntelligenceParityResult } from "./dashboard-markets-parity";
