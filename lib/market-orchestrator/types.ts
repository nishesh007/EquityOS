/**
 * Central Market Data Orchestrator — type contracts.
 */

import type { MarketHeatmapSnapshot } from "@/lib/market-heatmap";
import type {
  MarketContextView,
  MarketIntelligenceSnapshot,
  MarketRegimeView,
} from "@/lib/market-intelligence";
import type { SharedRecommendation } from "@/lib/recommendations";
import type { MarketSessionEnvelope } from "@/lib/market/market-state-types";
import type { MarketStatus } from "@/lib/market/session";
import type {
  MarketBreadth as DomainMarketBreadth,
  MarketIndex,
  MarketNews,
  MarketPulse,
  PortfolioSummary as DomainPortfolioSummary,
  UpcomingResult,
  WatchlistItem,
} from "@/types";

/**
 * Thin index/pulse slice for dashboard above-fold.
 */
export interface MarketCoreSnapshot {
  indices: MarketIndex[];
  pulse: MarketPulse;
}

/** @deprecated Use MarketCoreSnapshot — kept for dashboard compatibility. */
export type MarketIndicesPulse = MarketCoreSnapshot;

/** Market context view (trend, breadth, risk mode). */
export type MarketContext = MarketContextView;

/** Market breadth / internals aggregate. */
export type MarketBreadth = DomainMarketBreadth;

/** Sector / market heatmap aggregate. */
export type MarketHeatmapData = MarketHeatmapSnapshot;

/** Shared market intelligence (context + regime). */
export type MarketIntelligence = MarketIntelligenceSnapshot;

/**
 * Canonical Markets page snapshot.
 * Every Markets widget consumes only this object and shares `timestamp`.
 */
export interface MarketSnapshot {
  indices: MarketIndex[];
  pulse: MarketPulse;
  intelligence: MarketIntelligenceSnapshot | null;
  breadth: DomainMarketBreadth;
  heatmap: MarketHeatmapSnapshot | null;
  /** Page-level as-of — the only timestamp Markets UI may display. */
  timestamp: string;
  marketStatus: MarketStatus;
  marketStatusLabel: string;
  /** NSE trading session owner (YYYY-MM-DD). */
  tradingDate: string;
  /** Session envelope — freshness + validation for all market modules. */
  session: MarketSessionEnvelope;
}

/** @deprecated Alias — prefer MarketSnapshot. */
export type InstitutionalMarketSnapshot = MarketSnapshot;

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

/**
 * Dashboard entry aggregate — single source of truth for server-side widgets.
 */
export interface DashboardMarketSnapshot {
  market: MarketCoreSnapshot;
  context: MarketContext;
  breadth: MarketBreadth;
  /** Null when deferred to client LazyMarketHeatmap fetch. */
  heatmap: MarketHeatmapData | null;
  portfolio: PortfolioSummary;
  watchlist: WatchlistSummary;
  opportunities: OpportunitySummary;
  intelligence: MarketIntelligence;
  news: MarketNews[];
  upcomingResults: UpcomingResult[];
  timestamp: string;
}

export type { MarketRegimeView };
