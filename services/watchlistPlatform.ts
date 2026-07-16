/**
 * Institutional Watchlist Platform bridge — Sprint 10B.R1–R2.
 */

import {
  WATCHLIST_EMPTY,
  ensureDefaultWatchlists,
  getInstitutionalWatchlistHealth,
  getInstitutionalWatchlistSummary,
  getSmartWatchlistView,
  getWatchlistPlatformView,
  isSprint10BR1Frozen,
  isSprint10BR2Frozen,
  type InstitutionalWatchlistHealth,
  type InstitutionalWatchlistSummary,
  type SmartWatchlistView,
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
      dynamicCount: 0,
      smartReady: false,
      recommendationCount: 0,
      sprint10BR2Frozen: isSprint10BR2Frozen(),
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

export function fetchSmartWatchlistView(
  context?: WatchlistEngineContext | null
): SmartWatchlistView {
  ensureDefaultWatchlists(context?.now);
  return getSmartWatchlistView({ now: context?.now });
}

export function formatWatchlistPlatformSubtitle(
  health: WatchlistPlatformHealth
): string {
  if (!health.ready) {
    return health.emptyMessage || WATCHLIST_EMPTY.noWatchlists;
  }
  const frozen = [
    health.sprint10BR1Frozen ? "10B.R1 FROZEN" : "",
    health.sprint10BR2Frozen ? "10B.R2 FROZEN" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const smart =
    health.smartReady && health.dynamicCount > 0
      ? ` · ${health.dynamicCount} dynamic`
      : "";
  return `${health.watchlistCount} watchlists · ${health.pinnedCount} pinned · ${health.favoriteCount} favorites · ${health.companyCount} companies${smart}${frozen ? ` · ${frozen}` : ""}`;
}
