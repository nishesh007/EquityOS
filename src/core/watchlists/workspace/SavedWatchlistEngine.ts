/**
 * Saved Watchlist Engine — save, load, list (Sprint 10B.R7).
 * Composes R1 registry; no duplicated persistence logic.
 */

import {
  archiveWatchlistRecord,
  cloneWatchlistRecord,
  createWatchlistRecord,
  duplicateWatchlistRecord,
  favoriteWatchlistRecord,
  getWatchlistRecord,
  pinWatchlistRecord,
  restoreWatchlistRecord,
  updateWatchlistRecord,
} from "../WatchlistRegistry";
import { getWatchlists } from "../WatchlistEngine";
import type { WatchlistRecord } from "../WatchlistModels";
import { recordWorkspaceHistoryEvent } from "./WatchlistHistoryEngine";
import { trackWatchlistActivity } from "./WatchlistRecentActivity";
import {
  WORKSPACE_PRODUCTIVITY_EMPTY,
  emptySavedWatchlists,
  safeInstitutionalText,
  type SavedWatchlistItem,
  type SavedWatchlistsView,
} from "./WorkspacePresentationModels";

function toItem(record: WatchlistRecord): SavedWatchlistItem {
  return {
    id: record.id,
    name: record.metadata.name,
    symbols: [...record.symbols],
    pinned: record.pinned,
    favorite: record.favorite,
    status: record.status,
    updatedAt: record.metadata.updatedAt,
  };
}

export function saveWatchlist(input: {
  id?: string | null;
  name: string;
  symbols?: string[] | null;
  description?: string | null;
  pinned?: boolean | null;
  favorite?: boolean | null;
  now?: Date | null;
}): WatchlistRecord {
  const id = safeInstitutionalText(input.id, "").toLowerCase();
  const existing = id ? getWatchlistRecord(id) : null;

  const record = existing
    ? updateWatchlistRecord(id, {
        name: input.name,
        symbols: input.symbols ?? undefined,
        description: input.description ?? undefined,
        pinned: input.pinned ?? undefined,
        favorite: input.favorite ?? undefined,
        now: input.now,
      })
    : createWatchlistRecord({
        name: input.name,
        symbols: input.symbols ?? [],
        description: input.description ?? undefined,
        pinned: input.pinned ?? false,
        favorite: input.favorite ?? false,
        now: input.now,
      });

  recordWorkspaceHistoryEvent({
    watchlistId: record.id,
    kind: existing ? "modified" : "created",
    summary: existing
      ? `Modified watchlist ${record.metadata.name}`
      : `Created watchlist ${record.metadata.name}`,
    now: input.now,
  });

  trackWatchlistActivity({
    watchlistId: record.id,
    name: record.metadata.name,
    action: existing ? "modified" : "created",
    now: input.now,
  });

  return record;
}

export function loadWatchlist(id: string): WatchlistRecord | null {
  return getWatchlistRecord(safeInstitutionalText(id, "").toLowerCase());
}

export function listWatchlists(query?: {
  includeArchived?: boolean;
  pinnedOnly?: boolean;
  favoritesOnly?: boolean;
}): SavedWatchlistsView {
  let records = getWatchlists({
    includeArchived: query?.includeArchived ?? false,
  });

  if (query?.pinnedOnly) {
    records = records.filter((r) => r.pinned);
  }
  if (query?.favoritesOnly) {
    records = records.filter((r) => r.favorite);
  }

  if (records.length === 0) {
    return emptySavedWatchlists();
  }

  return {
    items: records.map(toItem),
    empty: false,
    emptyMessage: WORKSPACE_PRODUCTIVITY_EMPTY.noSavedWatchlists,
  };
}

export function archiveWatchlist(id: string, now?: Date | null): WatchlistRecord {
  const record = archiveWatchlistRecord(id, now);
  if (record.id) {
    recordWorkspaceHistoryEvent({
      watchlistId: record.id,
      kind: "archived",
      summary: `Archived watchlist ${record.metadata.name}`,
      now,
    });
  }
  return record;
}

export function restoreWatchlist(id: string, now?: Date | null): WatchlistRecord {
  const record = restoreWatchlistRecord(id, now);
  recordWorkspaceHistoryEvent({
    watchlistId: record.id,
    kind: "modified",
    summary: `Restored watchlist ${record.metadata.name}`,
    now,
  });
  return record;
}

export function duplicateWatchlist(id: string, now?: Date | null): WatchlistRecord {
  const record = duplicateWatchlistRecord(id, now);
  recordWorkspaceHistoryEvent({
    watchlistId: record.id,
    kind: "created",
    summary: `Duplicated watchlist ${record.metadata.name}`,
    now,
  });
  return record;
}

export function cloneWatchlist(
  id: string,
  options?: { name?: string | null; now?: Date | null }
): WatchlistRecord {
  const record = cloneWatchlistRecord(id, options);
  recordWorkspaceHistoryEvent({
    watchlistId: record.id,
    kind: "created",
    summary: `Cloned watchlist ${record.metadata.name}`,
    now: options?.now,
  });
  return record;
}

export function renameWatchlist(
  id: string,
  name: string,
  now?: Date | null
): WatchlistRecord {
  const record = updateWatchlistRecord(id, { name, now });
  recordWorkspaceHistoryEvent({
    watchlistId: record.id,
    kind: "modified",
    summary: `Renamed watchlist to ${name}`,
    now,
  });
  return record;
}

export function pinWatchlist(id: string, pinned = true, now?: Date | null): WatchlistRecord {
  return pinWatchlistRecord(id, pinned, now);
}

export function favoriteWatchlist(
  id: string,
  favorite = true,
  now?: Date | null
): WatchlistRecord {
  return favoriteWatchlistRecord(id, favorite, now);
}

export class SavedWatchlistEngine {
  saveWatchlist = saveWatchlist;
  loadWatchlist = loadWatchlist;
  listWatchlists = listWatchlists;
  archiveWatchlist = archiveWatchlist;
  restoreWatchlist = restoreWatchlist;
  duplicateWatchlist = duplicateWatchlist;
  cloneWatchlist = cloneWatchlist;
}
