/**
 * Institutional Watchlist Platform — orchestrator (Sprint 10B.R1).
 * Composes registry, metrics, and presentation. Reuses existing engines only.
 */

import type { WatchlistItemSnapshot } from "@/src/core/alerts/intelligence/AlertPresentationModels";
import { generateWatchlistAlerts } from "@/src/core/alerts/intelligence";
import {
  WATCHLIST_EMPTY,
  emptyWatchlistRecord,
  type CreateWatchlistInput,
  type UpdateWatchlistInput,
  type WatchlistQuery,
  type WatchlistRecord,
} from "./WatchlistModels";
import {
  archiveWatchlistRecord,
  cloneWatchlistRecord,
  createWatchlistRecord,
  deleteWatchlistRecord,
  duplicateWatchlistRecord,
  ensureBuiltinWatchlists,
  favoriteWatchlistRecord,
  getWatchlistRecord,
  pinWatchlistRecord,
  registerBuiltinWatchlistDefinitions,
  resetWatchlistRegistry,
  restoreWatchlistRecord,
  searchWatchlists,
  updateWatchlistRecord,
} from "./WatchlistRegistry";
import {
  computeWatchlistMetrics,
  getWatchlistMetricsExecutionMs,
  resetWatchlistMetrics,
  type WatchlistMetricsBundle,
} from "./WatchlistMetrics";
import {
  buildWatchlistPlatformView,
  emptyWatchlistPlatformView,
  type WatchlistPlatformView,
} from "./WatchlistPresentationModels";

export interface WatchlistEngineContext {
  snapshots?: Record<string, WatchlistItemSnapshot> | null;
  upcomingEarnings?: number | null;
  now?: Date | null;
}

let activeWatchlistId: string | null = null;
let engineInstance: WatchlistEngine | null = null;

export class WatchlistEngine {
  ensureDefaults(now?: Date | null): WatchlistRecord[] {
    registerBuiltinWatchlistDefinitions();
    const records = ensureBuiltinWatchlists(now);
    if (!activeWatchlistId && records.length > 0) {
      activeWatchlistId = records[0]!.id;
    }
    return records;
  }

  createWatchlist(input?: CreateWatchlistInput | null): WatchlistRecord {
    const record = createWatchlistRecord(input);
    if (!activeWatchlistId) activeWatchlistId = record.id;
    return record;
  }

  updateWatchlist(
    id: string,
    input?: UpdateWatchlistInput | null
  ): WatchlistRecord {
    return updateWatchlistRecord(id, input);
  }

  deleteWatchlist(id: string): boolean {
    const ok = deleteWatchlistRecord(id);
    if (ok && activeWatchlistId === id.toLowerCase()) {
      const remaining = searchWatchlists({ includeArchived: false });
      activeWatchlistId = remaining[0]?.id ?? null;
    }
    return ok;
  }

  cloneWatchlist(
    id: string,
    options?: { name?: string | null; now?: Date | null }
  ): WatchlistRecord {
    return cloneWatchlistRecord(id, options);
  }

  archiveWatchlist(id: string, now?: Date | null): WatchlistRecord {
    const record = archiveWatchlistRecord(id, now);
    if (activeWatchlistId === id.toLowerCase()) {
      activeWatchlistId = null;
    }
    return record;
  }

  restoreWatchlist(id: string, now?: Date | null): WatchlistRecord {
    const record = restoreWatchlistRecord(id, now);
    if (!record.empty) activeWatchlistId = record.id;
    return record;
  }

  getWatchlists(query?: WatchlistQuery | null): WatchlistRecord[] {
    return searchWatchlists(query);
  }

  getActiveWatchlist(): WatchlistRecord | null {
    if (!activeWatchlistId) return null;
    return getWatchlistRecord(activeWatchlistId);
  }

  setActiveWatchlist(id: string): WatchlistRecord | null {
    const record = getWatchlistRecord(id);
    if (!record || record.status !== "active") return null;
    activeWatchlistId = record.id;
    return record;
  }

  pinWatchlist(id: string, pinned = true, now?: Date | null): WatchlistRecord {
    return pinWatchlistRecord(id, pinned, now);
  }

  favoriteWatchlist(
    id: string,
    favorite = true,
    now?: Date | null
  ): WatchlistRecord {
    return favoriteWatchlistRecord(id, favorite, now);
  }

  duplicateWatchlist(id: string, now?: Date | null): WatchlistRecord {
    return duplicateWatchlistRecord(id, now);
  }

  getMetrics(
    id?: string | null,
    context?: WatchlistEngineContext | null
  ): WatchlistMetricsBundle {
    const target = id
      ? getWatchlistRecord(id)
      : this.getActiveWatchlist();
    if (!target || target.empty) {
      return computeWatchlistMetrics({
        record: emptyWatchlistRecord(WATCHLIST_EMPTY.noWatchlists),
      });
    }

    const snapshots = context?.snapshots ?? buildSnapshotsFromSymbols(target.symbols);
    const alertBatch = generateWatchlistAlerts({
      items: Object.values(snapshots),
      now: context?.now ?? undefined,
    });

    return computeWatchlistMetrics({
      record: target,
      snapshots,
      alertCount: alertBatch.total,
      upcomingEarnings: context?.upcomingEarnings,
      now: context?.now,
    });
  }

  getPlatformView(context?: WatchlistEngineContext | null): WatchlistPlatformView {
    const records = this.getWatchlists({ includeArchived: true });
    const active = this.getActiveWatchlist();
    const metricsById = new Map<string, WatchlistMetricsBundle>();

    for (const record of records) {
      if (record.status === "deleted") continue;
      metricsById.set(
        record.id,
        this.getMetrics(record.id, {
          ...context,
          snapshots:
            context?.snapshots ??
            buildSnapshotsFromSymbols(record.symbols),
        })
      );
    }

    const activeMetrics = active ? metricsById.get(active.id) ?? null : null;
    return buildWatchlistPlatformView({
      records: records.filter((r) => r.status !== "deleted"),
      active,
      metrics: activeMetrics,
      metricsById,
    });
  }

  getExecutionMs(): number {
    return getWatchlistMetricsExecutionMs();
  }
}

function buildSnapshotsFromSymbols(
  symbols: readonly string[]
): Record<string, WatchlistItemSnapshot> {
  const out: Record<string, WatchlistItemSnapshot> = {};
  for (const symbol of symbols) {
    const key = symbol.toUpperCase();
    out[key] = {
      symbol: key,
      name: key,
      price: 0,
      changePercent: 0,
      convictionScore: null,
      trustScore: null,
    };
  }
  return out;
}

export function getWatchlistEngine(): WatchlistEngine {
  if (!engineInstance) engineInstance = new WatchlistEngine();
  return engineInstance;
}

export function resetWatchlistEngine(): void {
  resetWatchlistRegistry();
  resetWatchlistMetrics();
  activeWatchlistId = null;
  engineInstance = null;
}

export function createWatchlist(
  input?: CreateWatchlistInput | null
): WatchlistRecord {
  return getWatchlistEngine().createWatchlist(input);
}

export function updateWatchlist(
  id: string,
  input?: UpdateWatchlistInput | null
): WatchlistRecord {
  return getWatchlistEngine().updateWatchlist(id, input);
}

export function deleteWatchlist(id: string): boolean {
  return getWatchlistEngine().deleteWatchlist(id);
}

export function cloneWatchlist(
  id: string,
  options?: { name?: string | null; now?: Date | null }
): WatchlistRecord {
  return getWatchlistEngine().cloneWatchlist(id, options);
}

export function archiveWatchlist(
  id: string,
  now?: Date | null
): WatchlistRecord {
  return getWatchlistEngine().archiveWatchlist(id, now);
}

export function restoreWatchlist(
  id: string,
  now?: Date | null
): WatchlistRecord {
  return getWatchlistEngine().restoreWatchlist(id, now);
}

export function getWatchlists(query?: WatchlistQuery | null): WatchlistRecord[] {
  return getWatchlistEngine().getWatchlists(query);
}

export function getMetrics(
  id?: string | null,
  context?: WatchlistEngineContext | null
): WatchlistMetricsBundle {
  return getWatchlistEngine().getMetrics(id, context);
}

export function getWatchlistPlatformView(
  context?: WatchlistEngineContext | null
): WatchlistPlatformView {
  return getWatchlistEngine().getPlatformView(context);
}

export function ensureDefaultWatchlists(now?: Date | null): WatchlistRecord[] {
  return getWatchlistEngine().ensureDefaults(now);
}
