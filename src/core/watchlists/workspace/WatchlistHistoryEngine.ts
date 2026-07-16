/**
 * Watchlist History Engine — workspace event history (Sprint 10B.R7).
 * Composes R4 activity timeline; no duplicated event store.
 */

import { getWatchlistTimeline, recordTimelineEvent } from "./WatchlistActivityTimeline";
import {
  WORKSPACE_PRODUCTIVITY_EMPTY,
  WORKSPACE_HISTORY_KINDS,
  emptyWorkspaceHistory,
  safeInstitutionalText,
  type InstitutionalWorkspaceContext,
  type WorkspaceHistoryEntry,
  type WorkspaceHistoryKind,
  type WorkspaceHistoryView,
} from "./WorkspacePresentationModels";

const history: WorkspaceHistoryEntry[] = [];
let seq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

const kindToTimeline: Partial<Record<WorkspaceHistoryKind, string>> = {
  created: "added",
  modified: "added",
  ai_updated: "ai_recommendation",
  research_updated: "research_updated",
  alert_triggered: "alert_triggered",
  archived: "removed",
};

export function recordWorkspaceHistoryEvent(input: {
  watchlistId: string;
  kind: WorkspaceHistoryKind | string;
  summary: string;
  actor?: string | null;
  ticker?: string | null;
  now?: Date | null;
}): WorkspaceHistoryEntry {
  seq += 1;
  const entry: WorkspaceHistoryEntry = {
    id: `wsh-${seq}-${Date.now()}`,
    watchlistId: safeInstitutionalText(input.watchlistId, "").toLowerCase(),
    kind: input.kind,
    summary: safeInstitutionalText(input.summary, input.kind),
    at: stamp(input.now),
    actor: safeInstitutionalText(input.actor, "analyst"),
  };
  history.unshift(entry);
  if (history.length > 150) history.length = 150;

  const timelineKind = kindToTimeline[input.kind as WorkspaceHistoryKind];
  if (timelineKind) {
    recordTimelineEvent({
      watchlistId: entry.watchlistId,
      kind: timelineKind as "added",
      ticker: input.ticker,
      summary: entry.summary,
      actor: entry.actor,
      now: input.now,
    });
  }

  return entry;
}

export function getWorkspaceHistory(
  context?: InstitutionalWorkspaceContext | null
): WorkspaceHistoryView {
  const watchlistId = safeInstitutionalText(context?.watchlistId, "").toLowerCase();
  const entries = history.filter((e) => {
    if (!watchlistId) return true;
    return e.watchlistId === watchlistId;
  });

  if (entries.length === 0) {
    return emptyWorkspaceHistory();
  }

  return {
    entries: [...entries],
    empty: false,
    emptyMessage: WORKSPACE_PRODUCTIVITY_EMPTY.noTimeline,
  };
}

export function getWorkspaceTimeline(
  context?: InstitutionalWorkspaceContext | null
): WorkspaceHistoryView {
  const watchlistId = safeInstitutionalText(context?.watchlistId, "").toLowerCase();
  const timeline = getWatchlistTimeline({
    watchlistId,
    symbols: context?.symbols,
    now: context?.now,
  });

  const timelineEntries: WorkspaceHistoryEntry[] = timeline.entries.map((e) => ({
    id: e.id,
    watchlistId: e.watchlistId,
    kind: e.kind,
    summary: e.summary,
    at: e.at,
    actor: e.actor,
  }));

  const merged = [...getWorkspaceHistory(context).entries, ...timelineEntries]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 50);

  if (merged.length === 0) {
    return emptyWorkspaceHistory();
  }

  return {
    entries: merged,
    empty: false,
    emptyMessage: WORKSPACE_PRODUCTIVITY_EMPTY.noTimeline,
  };
}

export function resetWorkspaceHistory(): void {
  history.length = 0;
  seq = 0;
}

export { WORKSPACE_HISTORY_KINDS };

export class WatchlistHistoryEngine {
  recordWorkspaceHistoryEvent = recordWorkspaceHistoryEvent;
  getWorkspaceHistory = getWorkspaceHistory;
  getWorkspaceTimeline = getWorkspaceTimeline;
}
