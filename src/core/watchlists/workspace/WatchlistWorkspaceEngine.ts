/**
 * Watchlist Workspace Engine — institutional productivity orchestrator (Sprint 10B.R7).
 */

import { WATCHLIST_SURFACE_ROUTES } from "../WatchlistModels";
import { listWatchlists } from "./SavedWatchlistEngine";
import { getWorkspaceHistory, getWorkspaceTimeline } from "./WatchlistHistoryEngine";
import { compareWatchlists } from "./WatchlistComparisonWorkspace";
import { getProductivityView } from "./WatchlistRecentActivity";
import { getWorkspaceResearchBridge } from "./WatchlistResearchBridge";
import {
  WORKSPACE_PRODUCTIVITY_EMPTY,
  emptyInstitutionalWorkspace,
  type InstitutionalWorkspaceBundle,
  type InstitutionalWorkspaceContext,
} from "./WorkspacePresentationModels";

export const SPRINT_10B_R7_FROZEN = true;

let engineInstance: WatchlistWorkspaceEngine | null = null;

export class WatchlistWorkspaceEngine {
  listWatchlists = listWatchlists;
  getWorkspaceTimeline = getWorkspaceTimeline;
  compareWatchlists = compareWatchlists;
  getProductivityView = getProductivityView;

  buildBundle(context?: InstitutionalWorkspaceContext | null): InstitutionalWorkspaceBundle {
    const saved = listWatchlists({ includeArchived: false });
    if (saved.empty && !context?.watchlistId) {
      return emptyInstitutionalWorkspace();
    }

    return {
      saved,
      history: getWorkspaceHistory(context),
      timeline: getWorkspaceTimeline(context),
      comparison: compareWatchlists(context),
      research: getWorkspaceResearchBridge(context),
      productivity: getProductivityView(context),
      empty: false,
      emptyMessage: WORKSPACE_PRODUCTIVITY_EMPTY.awaitingWorkspace,
      surfaceHints: { ...WATCHLIST_SURFACE_ROUTES, portfolio: "/portfolio" },
    };
  }
}

export function getInstitutionalWorkspaceEngine(): WatchlistWorkspaceEngine {
  if (!engineInstance) engineInstance = new WatchlistWorkspaceEngine();
  return engineInstance;
}

export function getInstitutionalWorkspace(
  context?: InstitutionalWorkspaceContext | null
): InstitutionalWorkspaceBundle {
  return getInstitutionalWorkspaceEngine().buildBundle(context);
}

export function resetInstitutionalWorkspace(): void {
  engineInstance = null;
}

export function isSprint10BR7Frozen(): boolean {
  return SPRINT_10B_R7_FROZEN;
}

export function getInstitutionalWorkspaceHealth(
  context?: InstitutionalWorkspaceContext | null
): {
  ready: boolean;
  savedCount: number;
  timelineCount: number;
  favoriteCount: number;
  pinnedCount: number;
  sprint10BR7Frozen: boolean;
  emptyMessage: string;
} {
  const bundle = getInstitutionalWorkspace(context);
  return {
    ready: !bundle.saved.empty || !bundle.empty,
    savedCount: bundle.saved.items.length,
    timelineCount: bundle.timeline.entries.length,
    favoriteCount: bundle.productivity.favoriteWatchlists.length,
    pinnedCount: bundle.productivity.pinnedWatchlists.length,
    sprint10BR7Frozen: SPRINT_10B_R7_FROZEN,
    emptyMessage: bundle.empty ? bundle.emptyMessage : "",
  };
}
