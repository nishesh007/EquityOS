/**
 * Central Market Data Orchestrator — type contracts.
 * Concrete service return types so the dashboard page can pass slices through unchanged.
 */

import type { MarketHeatmapSnapshot } from "@/lib/market-heatmap";
import type {
  MarketContextView,
  MarketIntelligenceSnapshot,
} from "@/lib/market-intelligence";
import type { SharedRecommendation } from "@/lib/recommendations";
import type {
  MarketBreadth as DomainMarketBreadth,
  MarketIndex,
  MarketNews,
  MarketPulse,
  PortfolioSummary as DomainPortfolioSummary,
  UpcomingResult,
  WatchlistItem,
} from "@/types";

/** Index / pulse surface for the dashboard market snapshot. */
export interface MarketSnapshot {
  indices: MarketIndex[];
  pulse: MarketPulse;
}

/** Market context view (trend, breadth, risk mode). */
export type MarketContext = MarketContextView;

/** Market breadth / internals aggregate. */
export type MarketBreadth = DomainMarketBreadth;

/** Sector / market heatmap aggregate. */
export type MarketHeatmapData = MarketHeatmapSnapshot;

/** Portfolio holdings summary. */
export type PortfolioSummary = DomainPortfolioSummary;

/** Watchlist summary. */
export interface WatchlistSummary {
  items: WatchlistItem[];
}

/** Opportunity / recommendation summary. */
export interface OpportunitySummary {
  recommendations: SharedRecommendation[];
}

/** Shared market intelligence (context + regime). */
export type MarketIntelligence = MarketIntelligenceSnapshot;

/**
 * Dashboard entry aggregate — single source of truth for server-side widgets.
 */
export interface DashboardMarketSnapshot {
  market: MarketSnapshot;
  context: MarketContext;
  breadth: MarketBreadth;
  heatmap: MarketHeatmapData;
  portfolio: PortfolioSummary;
  watchlist: WatchlistSummary;
  opportunities: OpportunitySummary;
  intelligence: MarketIntelligence;
  news: MarketNews[];
  upcomingResults: UpcomingResult[];
  timestamp: string;
}
