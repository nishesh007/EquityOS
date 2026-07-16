/**
 * Watchlist Activity Timeline (Sprint 10B.R4).
 */

import {
  WORKSPACE_EMPTY,
  safeWorkspaceText,
  type TimelineEventKind,
  type WatchlistTimelineEntry,
  type WatchlistTimelineView,
  type WatchlistWorkspaceContext,
} from "./WatchlistWorkspaceModels";

const timeline: WatchlistTimelineEntry[] = [];
let seq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

export function recordTimelineEvent(input: {
  watchlistId: string;
  kind: TimelineEventKind;
  ticker?: string | null;
  summary: string;
  actor?: string | null;
  now?: Date | null;
}): WatchlistTimelineEntry {
  seq += 1;
  const entry: WatchlistTimelineEntry = {
    id: `tl-${seq}-${Date.now()}`,
    watchlistId: safeWorkspaceText(input.watchlistId, "").toLowerCase(),
    kind: input.kind,
    ticker: safeWorkspaceText(input.ticker, "").toUpperCase(),
    summary: safeWorkspaceText(input.summary, input.kind),
    at: stamp(input.now),
    actor: safeWorkspaceText(input.actor, "system"),
  };
  timeline.unshift(entry);
  if (timeline.length > 100) timeline.length = 100;
  return entry;
}

export function getWatchlistTimeline(
  context?: WatchlistWorkspaceContext | null
): WatchlistTimelineView {
  const watchlistId = safeWorkspaceText(context?.watchlistId, "").toLowerCase();
  const entries = timeline.filter((e) => {
    if (!watchlistId) return true;
    return e.watchlistId === watchlistId;
  });

  if (entries.length === 0) {
    return {
      entries: [],
      empty: true,
      emptyMessage: WORKSPACE_EMPTY.noActivity,
    };
  }

  return {
    entries: [...entries],
    empty: false,
    emptyMessage: WORKSPACE_EMPTY.noActivity,
  };
}

export function resetWatchlistTimeline(): void {
  timeline.length = 0;
  seq = 0;
}
