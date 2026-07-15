/**
 * Institutional Earnings Dashboard — public exports (Sprint 9B.R5).
 */

export type {
  AttentionLevel,
  PriorityTier,
  DashboardSortKey,
  SmartFilterId,
  EarningsScorecard,
  RankedEarningsItem,
  EarningsDashboardMetrics,
  EarningsDashboardFilters,
  EarningsDashboardQuery,
  EarningsDashboardViewModel,
  RankedCardPresentation,
} from "./EarningsDashboardModels";

export { DASHBOARD_EMPTY } from "./EarningsDashboardModels";

export { buildEarningsScorecard } from "./EarningsImpactScore";
export {
  computePriorityBoost,
  applyPriorityBoost,
  isHighConvictionItem,
} from "./EarningsPriorityEngine";
export {
  buildDashboardMetrics,
  toRankedCardPresentation,
  presentDashboardPage,
} from "./EarningsDashboardPresenter";

export {
  EarningsDashboardEngine,
  getEarningsDashboardEngine,
  resetEarningsDashboardEngine,
  getDashboard,
  getHighConvictionEarnings,
} from "./EarningsDashboardEngine";

import {
  getHighConvictionEarnings,
  getPortfolioEarningsRanked,
  getWatchlistEarningsRanked,
  getRankedEarningsPublic,
} from "./EarningsDashboardEngine";
import { filterEarnings as applyDashboardFilters } from "./EarningsFilterEngine";
import { sortEarnings as applyDashboardSort } from "./EarningsRankingEngine";
import type {
  DashboardSortKey,
  EarningsDashboardFilters,
  RankedEarningsItem,
} from "./EarningsDashboardModels";

/** Public API — getRankedEarnings() */
export function getRankedEarnings(
  sortBy: DashboardSortKey = "institutional_rank",
  now = new Date()
): RankedEarningsItem[] {
  return getRankedEarningsPublic(sortBy, now);
}

/** Public API — getPortfolioEarnings() */
export function getPortfolioEarnings(
  now = new Date()
): RankedEarningsItem[] {
  return getPortfolioEarningsRanked(now);
}

/** Public API — getWatchlistEarnings() */
export function getWatchlistEarnings(
  now = new Date()
): RankedEarningsItem[] {
  return getWatchlistEarningsRanked(now);
}

/** Public API — filterEarnings() */
export function filterEarnings(
  items: readonly RankedEarningsItem[],
  filters: EarningsDashboardFilters = {},
  now = new Date()
): RankedEarningsItem[] {
  return applyDashboardFilters(items, filters, now);
}

/** Public API — sortEarnings() */
export function sortEarnings(
  items: readonly RankedEarningsItem[],
  sortBy: DashboardSortKey = "institutional_rank"
): RankedEarningsItem[] {
  return applyDashboardSort(items, sortBy);
}

export { getHighConvictionEarnings as getAiHighConvictionEarnings };
