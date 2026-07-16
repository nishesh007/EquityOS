/**
 * Watchlist Recent Activity — productivity & quick access (Sprint 10B.R7).
 */

import { listWatchlists } from "./SavedWatchlistEngine";
import { recordWorkspaceHistoryEvent } from "./WatchlistHistoryEngine";
import {
  QUICK_ACTIONS,
  WORKSPACE_PRODUCTIVITY_EMPTY,
  emptyProductivityView,
  safeInstitutionalText,
  type InstitutionalWorkspaceContext,
  type ProductivityView,
  type QuickActionId,
  type RecentActivityItem,
} from "./WorkspacePresentationModels";

const recentIds: string[] = [];
const activityLog: RecentActivityItem[] = [];

function touchRecent(watchlistId: string, name: string, action: string, now?: Date | null): void {
  const id = watchlistId.toLowerCase();
  const idx = recentIds.indexOf(id);
  if (idx >= 0) recentIds.splice(idx, 1);
  recentIds.unshift(id);
  if (recentIds.length > 20) recentIds.length = 20;

  activityLog.unshift({
    watchlistId: id,
    name,
    action,
    at: (now ?? new Date()).toISOString(),
  });
  if (activityLog.length > 50) activityLog.length = 50;
}

export function trackWatchlistActivity(input: {
  watchlistId: string;
  name: string;
  action: string;
  now?: Date | null;
}): void {
  touchRecent(input.watchlistId, input.name, input.action, input.now);
}

export function getProductivityView(
  context?: InstitutionalWorkspaceContext | null
): ProductivityView {
  const saved = listWatchlists({ includeArchived: false });
  if (saved.empty) {
    return emptyProductivityView(WORKSPACE_PRODUCTIVITY_EMPTY.noSavedWatchlists);
  }

  const query = safeInstitutionalText(context?.searchQuery, "").toLowerCase();
  const searchResults = query
    ? saved.items.filter(
        (w) =>
          w.name.toLowerCase().includes(query) ||
          w.symbols.some((s) => s.toLowerCase().includes(query))
      )
    : [];

  const pinnedWatchlists = saved.items.filter((w) => w.pinned);
  const favoriteWatchlists = saved.items.filter((w) => w.favorite);
  const recentWatchlists = recentIds
    .map((id) => saved.items.find((w) => w.id === id))
    .filter((w): w is NonNullable<typeof w> => !!w)
    .slice(0, 8);

  const shortcuts: Record<string, string> = {
    "Ctrl+K": "Quick search",
    "Ctrl+S": "Save watchlist",
    "Ctrl+P": "Pin watchlist",
    "Ctrl+D": "Duplicate watchlist",
    "Ctrl+R": "Open research",
  };

  const quickActions: QuickActionId[] = [...QUICK_ACTIONS];

  if (
    recentWatchlists.length === 0 &&
    pinnedWatchlists.length === 0 &&
    favoriteWatchlists.length === 0 &&
    activityLog.length === 0
  ) {
    return {
      recentWatchlists: saved.items.slice(0, 5),
      pinnedWatchlists,
      favoriteWatchlists,
      searchResults,
      quickActions,
      shortcuts,
      recentActivity: [],
      empty: favoriteWatchlists.length === 0,
      emptyMessage:
        favoriteWatchlists.length === 0
          ? WORKSPACE_PRODUCTIVITY_EMPTY.noFavorites
          : WORKSPACE_PRODUCTIVITY_EMPTY.noActivity,
    };
  }

  return {
    recentWatchlists: recentWatchlists.length ? recentWatchlists : saved.items.slice(0, 5),
    pinnedWatchlists,
    favoriteWatchlists,
    searchResults,
    quickActions,
    shortcuts,
    recentActivity: [...activityLog].slice(0, 20),
    empty: false,
    emptyMessage: WORKSPACE_PRODUCTIVITY_EMPTY.noActivity,
  };
}

export function logExportedWatchlist(
  watchlistId: string,
  name: string,
  now?: Date | null
): void {
  trackWatchlistActivity({
    watchlistId,
    name,
    action: "exported",
    now,
  });
  recordWorkspaceHistoryEvent({
    watchlistId,
    kind: "exported",
    summary: `Exported watchlist ${name}`,
    now,
  });
}

export function resetRecentActivity(): void {
  recentIds.length = 0;
  activityLog.length = 0;
}

export class WatchlistRecentActivity {
  getProductivityView = getProductivityView;
  trackWatchlistActivity = trackWatchlistActivity;
}
