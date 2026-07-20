/**
 * React request memoization for dashboard pure reads.
 * cache() dedupes identical calls within one RSC request only —
 * does not replace lib/cache TTL, does not persist across requests.
 * Mutable / write paths (e.g. fetchUpcomingResults) are intentionally excluded.
 */

import { cache } from "react";
import {
  fetchMarketIndices as fetchMarketIndicesImpl,
  fetchMarketNews as fetchMarketNewsImpl,
  fetchPortfolioSummary as fetchPortfolioSummaryImpl,
  fetchWatchlist as fetchWatchlistImpl,
} from "@/services/marketData";
import {
  fetchMarketBreadth as fetchMarketBreadthImpl,
  fetchMarketHeatmap as fetchMarketHeatmapImpl,
  fetchMarketPulse as fetchMarketPulseImpl,
} from "@/services/researchDashboardData";

/** Dashboard-scoped request memo for market indices. */
export const memoizedFetchMarketIndices = cache(fetchMarketIndicesImpl);

/** Dashboard-scoped request memo for market pulse. */
export const memoizedFetchMarketPulse = cache(fetchMarketPulseImpl);

/** Dashboard-scoped request memo for portfolio summary. */
export const memoizedFetchPortfolioSummary = cache(fetchPortfolioSummaryImpl);

/** Dashboard-scoped request memo for watchlist. */
export const memoizedFetchWatchlist = cache(fetchWatchlistImpl);

/** Dashboard-scoped request memo for verified market news. */
export const memoizedFetchMarketNews = cache(fetchMarketNewsImpl);

/** Dashboard-scoped request memo for market heatmap. */
export const memoizedFetchMarketHeatmap = cache(fetchMarketHeatmapImpl);

/** Dashboard-scoped request memo for market breadth. */
export const memoizedFetchMarketBreadth = cache(fetchMarketBreadthImpl);
