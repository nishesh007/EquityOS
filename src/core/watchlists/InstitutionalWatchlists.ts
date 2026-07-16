/**
 * Institutional Watchlist Platform — executive hub (Sprint 10B.R1–R2).
 */

import { BUILTIN_WATCHLIST_DEFINITIONS } from "./WatchlistDefinition";
import {
  WATCHLIST_EMPTY,
  WATCHLIST_SURFACE_ROUTES,
  type WatchlistRecord,
} from "./WatchlistModels";
import {
  ensureDefaultWatchlists,
  getMetrics,
  getWatchlistEngine,
  getWatchlistPlatformView,
  getWatchlists,
  resetWatchlistEngine,
  type WatchlistEngineContext,
} from "./WatchlistEngine";
import {
  getWatchlistCacheCount,
  registerBuiltinWatchlistDefinitions,
} from "./WatchlistRegistry";
import type { WatchlistPlatformView } from "./WatchlistPresentationModels";
import type { WatchlistMetricsBundle } from "./WatchlistMetrics";
import {
  getSmartWatchlistEngine,
  getSmartWatchlistHealth,
  resetSmartWatchlistEngine,
  SPRINT_10B_R2_FROZEN,
} from "./smart";

export const INSTITUTIONAL_WATCHLIST_EMPTY = WATCHLIST_EMPTY;

export const SPRINT_10B_R1_FROZEN = true;

export interface InstitutionalWatchlistHealth {
  ready: boolean;
  watchlistCount: number;
  pinnedCount: number;
  favoriteCount: number;
  archivedCount: number;
  builtinCount: number;
  companyCount: number;
  cacheCount: number;
  activeWatchlistId: string;
  emptyMessage: string;
  sprint10BR1Frozen: boolean;
  dynamicCount: number;
  smartReady: boolean;
  recommendationCount: number;
  sprint10BR2Frozen: boolean;
  surfaceHints: typeof WATCHLIST_SURFACE_ROUTES;
}

export interface InstitutionalWatchlistSummary {
  health: InstitutionalWatchlistHealth;
  view: WatchlistPlatformView;
  activeMetrics: WatchlistMetricsBundle;
}

export class InstitutionalWatchlists {
  ensureDefaults(now?: Date | null): WatchlistRecord[] {
    registerBuiltinWatchlistDefinitions();
    const records = ensureDefaultWatchlists(now);
    getSmartWatchlistEngine().ensureBuiltinDynamicWatchlists(now);
    return records;
  }

  getHealth(context?: WatchlistEngineContext | null): InstitutionalWatchlistHealth {
    const engine = getWatchlistEngine();
    const records = getWatchlists({ includeArchived: true });
    const activeRecords = records.filter((r) => r.status === "active");
    const archived = records.filter((r) => r.status === "archived");
    const pinned = activeRecords.filter((r) => r.pinned);
    const favorites = activeRecords.filter((r) => r.favorite);
    const active = engine.getActiveWatchlist();
    const metrics = active ? getMetrics(active.id, context) : getMetrics(null, context);
    const smart = getSmartWatchlistHealth();

    const ready = activeRecords.length > 0;
    return {
      ready,
      watchlistCount: activeRecords.length,
      pinnedCount: pinned.length,
      favoriteCount: favorites.length,
      archivedCount: archived.length,
      builtinCount: BUILTIN_WATCHLIST_DEFINITIONS.length,
      companyCount: metrics.companies,
      cacheCount: getWatchlistCacheCount(),
      activeWatchlistId: active?.id ?? "",
      emptyMessage: ready ? "" : WATCHLIST_EMPTY.noWatchlists,
      sprint10BR1Frozen: SPRINT_10B_R1_FROZEN,
      dynamicCount: smart.dynamicCount,
      smartReady: smart.ready,
      recommendationCount: smart.recommendationCount,
      sprint10BR2Frozen: SPRINT_10B_R2_FROZEN,
      surfaceHints: { ...WATCHLIST_SURFACE_ROUTES },
    };
  }

  getSummary(context?: WatchlistEngineContext | null): InstitutionalWatchlistSummary {
    const health = this.getHealth(context);
    const view = getWatchlistPlatformView(context);
    const activeMetrics = view.active
      ? getMetrics(view.active.id, context)
      : getMetrics(null, context);
    return { health, view, activeMetrics };
  }

  getView(context?: WatchlistEngineContext | null): WatchlistPlatformView {
    return getWatchlistPlatformView(context);
  }
}

let hubInstance: InstitutionalWatchlists | null = null;

export function getInstitutionalWatchlists(): InstitutionalWatchlists {
  if (!hubInstance) hubInstance = new InstitutionalWatchlists();
  return hubInstance;
}

export function resetInstitutionalWatchlists(): void {
  resetWatchlistEngine();
  resetSmartWatchlistEngine();
  hubInstance = null;
}

export function isSprint10BR1Frozen(): boolean {
  return SPRINT_10B_R1_FROZEN;
}

export function getInstitutionalWatchlistHealth(
  context?: WatchlistEngineContext | null
): InstitutionalWatchlistHealth {
  return getInstitutionalWatchlists().getHealth(context);
}

export function getInstitutionalWatchlistSummary(
  context?: WatchlistEngineContext | null
): InstitutionalWatchlistSummary {
  return getInstitutionalWatchlists().getSummary(context);
}
