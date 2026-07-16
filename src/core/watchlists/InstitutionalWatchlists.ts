/**
 * Institutional Watchlist Platform — executive hub (Sprint 10B.R1–R8).
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
import type { WatchlistIntelligenceContext } from "./intelligence";
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
import {
  getWatchlistIntelligenceHealth,
  resetWatchlistIntelligence,
  SPRINT_10B_R3_FROZEN,
} from "./intelligence";
import {
  getWatchlistWorkspaceHealth,
  resetWatchlistWorkspace,
  SPRINT_10B_R4_FROZEN,
} from "./workspace";
import {
  getWatchlistAnalyticsHealth,
  resetWatchlistAnalytics,
  SPRINT_10B_R5_FROZEN,
} from "./analytics";
import {
  getWatchlistCopilotHealth,
  resetWatchlistCopilot,
  SPRINT_10B_R6_FROZEN,
} from "./copilot";
import {
  getInstitutionalWorkspaceHealth,
  SPRINT_10B_R7_FROZEN,
} from "./workspace";
import {
  getExecutiveWatchlistHealth,
  resetExecutiveWatchlistStack,
  SPRINT_10B_R8_FROZEN,
  WATCHLIST_PLATFORM_STATUS,
} from "./executive";

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
  intelligenceReady: boolean;
  opportunityCount: number;
  insightBuckets: number;
  sprint10BR3Frozen: boolean;
  workspaceReady: boolean;
  actionCount: number;
  timelineCount: number;
  sprint10BR4Frozen: boolean;
  analyticsReady: boolean;
  benchmarkCount: number;
  overallGrade: string;
  sprint10BR5Frozen: boolean;
  copilotReady: boolean;
  decisionCount: number;
  suggestionCount: number;
  sprint10BR6Frozen: boolean;
  institutionalWorkspaceReady: boolean;
  savedWatchlistCount: number;
  workspaceTimelineCount: number;
  sprint10BR7Frozen: boolean;
  executiveReady: boolean;
  executiveHealthScore: number;
  sprint10BFrozen: boolean;
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
    const intel = getWatchlistIntelligenceHealth({
      watchlistId: active?.id,
      symbols: active?.symbols ?? [],
      snapshots: context?.snapshots,
      now: context?.now,
    } satisfies WatchlistIntelligenceContext);
    const workspace = getWatchlistWorkspaceHealth({
      watchlistId: active?.id,
      symbols: active?.symbols ?? [],
      snapshots: context?.snapshots,
      workspaceId: context?.watchlistId,
      now: context?.now,
    });
    const analytics = getWatchlistAnalyticsHealth({
      watchlistId: active?.id,
      symbols: active?.symbols ?? [],
      snapshots: context?.snapshots,
      workspaceId: context?.watchlistId,
      now: context?.now,
    });
    const copilot = getWatchlistCopilotHealth({
      watchlistId: active?.id,
      symbols: active?.symbols ?? [],
      snapshots: context?.snapshots,
      workspaceId: context?.watchlistId,
      now: context?.now,
    });
    const institutional = getInstitutionalWorkspaceHealth({
      watchlistId: active?.id,
      symbols: active?.symbols ?? [],
      snapshots: context?.snapshots,
      workspaceId: context?.watchlistId,
      now: context?.now,
    });
    const executive = getExecutiveWatchlistHealth({
      snapshots: context?.snapshots,
      now: context?.now,
    });

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
      intelligenceReady: intel.ready,
      opportunityCount: intel.opportunityCount,
      insightBuckets: intel.insightBuckets,
      sprint10BR3Frozen: SPRINT_10B_R3_FROZEN,
      workspaceReady: workspace.ready,
      actionCount: workspace.actionCount,
      timelineCount: workspace.timelineCount,
      sprint10BR4Frozen: SPRINT_10B_R4_FROZEN,
      analyticsReady: analytics.ready,
      benchmarkCount: analytics.benchmarkCount,
      overallGrade: analytics.overallGrade,
      sprint10BR5Frozen: SPRINT_10B_R5_FROZEN,
      copilotReady: copilot.ready,
      decisionCount: copilot.decisionCount,
      suggestionCount: copilot.suggestionCount,
      sprint10BR6Frozen: SPRINT_10B_R6_FROZEN,
      institutionalWorkspaceReady: institutional.ready,
      savedWatchlistCount: institutional.savedCount,
      workspaceTimelineCount: institutional.timelineCount,
      sprint10BR7Frozen: SPRINT_10B_R7_FROZEN,
      executiveReady: !executive.empty,
      executiveHealthScore: executive.overallHealthScore,
      sprint10BFrozen: WATCHLIST_PLATFORM_STATUS.frozen,
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
  resetWatchlistIntelligence();
  resetWatchlistWorkspace();
  resetWatchlistAnalytics();
  resetWatchlistCopilot();
  resetExecutiveWatchlistStack();
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
