/**
 * Institutional Watchlist Platform bridge — Sprint 10B.R1.
 * Wires core watchlists into /watchlist, /dashboard, /research, /results, /company.
 */

import {
  WATCHLIST_EMPTY,
  ensureDefaultWatchlists,
  getInstitutionalWatchlistHealth,
  getInstitutionalWatchlistSummary,
  getWatchlistPlatformView,
  isSprint10BR1Frozen,
  type InstitutionalWatchlistHealth,
  type InstitutionalWatchlistSummary,
  type WatchlistEngineContext,
  type WatchlistPlatformView,
} from "@/src/core/watchlists";

export type WatchlistPlatformHealth = InstitutionalWatchlistHealth;

export function fetchWatchlistPlatformHealth(
  context?: WatchlistEngineContext | null
): WatchlistPlatformHealth {
  try {
    ensureDefaultWatchlists(context?.now);
    return getInstitutionalWatchlistHealth(context);
  } catch {
    return {
      ready: false,
      watchlistCount: 0,
      pinnedCount: 0,
      favoriteCount: 0,
      archivedCount: 0,
      builtinCount: 0,
      companyCount: 0,
      cacheCount: 0,
      activeWatchlistId: "",
      emptyMessage: WATCHLIST_EMPTY.noWatchlists,
      sprint10BR1Frozen: isSprint10BR1Frozen(),
      surfaceHints: {
        watchlist: "/watchlist",
        dashboard: "/",
        research: "/research",
        results: "/results",
        company: "/company",
      },
    };
  }
}

export function fetchWatchlistPlatformView(
  context?: WatchlistEngineContext | null
): WatchlistPlatformView {
  ensureDefaultWatchlists(context?.now);
  return getWatchlistPlatformView(context);
}

export function fetchInstitutionalWatchlistSummary(
  context?: WatchlistEngineContext | null
): InstitutionalWatchlistSummary {
  ensureDefaultWatchlists(context?.now);
  return getInstitutionalWatchlistSummary(context);
}

export function formatWatchlistPlatformSubtitle(
  health: WatchlistPlatformHealth
): string {
  if (!health.ready) {
    return health.emptyMessage || WATCHLIST_EMPTY.noWatchlists;
  }
  const frozen = health.sprint10BR1Frozen ? " · 10B.R1 FROZEN" : "";
  return `${health.watchlistCount} watchlists · ${health.pinnedCount} pinned · ${health.favoriteCount} favorites · ${health.companyCount} companies${frozen}`;
}
