/**
 * Watchlist Workspace — public exports & orchestrator (Sprint 10B.R4–R7).
 */

export {
  WORKSPACE_EMPTY,
  ACTION_CENTER_ACTIONS,
  TIMELINE_EVENT_KINDS,
  WATCHLIST_WORKSPACE_ROUTES,
  safeWorkspaceText,
  emptyPortfolioBridge,
  emptyWatchlistWorkspace,
} from "./WatchlistWorkspaceModels";
export type {
  WorkspaceEmptyMessage,
  ActionCenterActionId,
  TimelineEventKind,
  WatchlistWorkspaceContext,
  PortfolioBridgeView,
  WatchlistAlertItem,
  WatchlistAlertsView,
  WatchlistResearchLink,
  WatchlistResearchView,
  WatchlistActionItem,
  WatchlistActionsView,
  WatchlistTimelineEntry,
  WatchlistTimelineView,
  WatchlistCollaborator,
  WatchlistComment,
  WatchlistCollaborationView,
  WatchlistWorkspaceView,
} from "./WatchlistWorkspaceModels";

export {
  getPortfolioBridge,
  moveToPortfolio,
  wasMovedToPortfolio,
  resetPortfolioBridge,
} from "./PortfolioWatchlistBridge";

export {
  getWatchlistAlerts,
  dismissWatchlistAlert,
  snoozeWatchlistAlert,
  pinWatchlistAlert,
  resetWatchlistAlertBridge,
} from "./WatchlistAlertBridge";

export { getWatchlistResearch, resetWatchlistResearchBridge } from "./WatchlistResearchBridge";

export {
  getWatchlistActions,
  executeWatchlistAction,
} from "./WatchlistActionCenter";

export {
  recordTimelineEvent,
  getWatchlistTimeline,
  resetWatchlistTimeline,
} from "./WatchlistActivityTimeline";

export {
  shareWatchlist,
  addWatchlistComment,
  getCollaborationView,
  resetWatchlistCollaboration,
  WatchlistCollaborationEngine,
} from "./WatchlistCollaborationEngine";

import { getWatchlistRecord } from "../WatchlistRegistry";
import { getPortfolioBridge, resetPortfolioBridge } from "./PortfolioWatchlistBridge";
import { getWatchlistAlerts, resetWatchlistAlertBridge } from "./WatchlistAlertBridge";
import { getWatchlistResearch } from "./WatchlistResearchBridge";
import { getWatchlistActions } from "./WatchlistActionCenter";
import { getWatchlistTimeline, resetWatchlistTimeline } from "./WatchlistActivityTimeline";
import { getCollaborationView, resetWatchlistCollaboration } from "./WatchlistCollaborationEngine";
import { resetWorkspaceHistory } from "./WatchlistHistoryEngine";
import { resetRecentActivity } from "./WatchlistRecentActivity";
import { resetInstitutionalWorkspace } from "./WatchlistWorkspaceEngine";
import {
  WORKSPACE_EMPTY,
  emptyWatchlistWorkspace,
  safeWorkspaceText,
  type WatchlistWorkspaceContext,
  type WatchlistWorkspaceView,
} from "./WatchlistWorkspaceModels";

export const SPRINT_10B_R4_FROZEN = true;

export function isSprint10BR4Frozen(): boolean {
  return SPRINT_10B_R4_FROZEN;
}

export function getWatchlistWorkspace(
  context?: WatchlistWorkspaceContext | null
): WatchlistWorkspaceView {
  const watchlistId = safeWorkspaceText(context?.watchlistId, "");
  const record = watchlistId ? getWatchlistRecord(watchlistId) : null;
  const symbols = context?.symbols ?? record?.symbols ?? [];

  if (!watchlistId && !symbols.length) {
    return emptyWatchlistWorkspace();
  }

  const ctx: WatchlistWorkspaceContext = {
    ...context,
    watchlistId: watchlistId || record?.id,
    symbols,
  };

  const portfolio = getPortfolioBridge(ctx);
  const alerts = getWatchlistAlerts(ctx);
  const research = getWatchlistResearch(ctx);
  const actions = getWatchlistActions(ctx);
  const timeline = getWatchlistTimeline(ctx);
  const collaboration = getCollaborationView(watchlistId || record?.id || "");

  const empty =
    portfolio.empty &&
    alerts.empty &&
    research.empty &&
    actions.empty &&
    timeline.empty;

  return {
    watchlistId: watchlistId || record?.id || "",
    portfolio,
    alerts,
    research,
    actions,
    timeline,
    collaboration,
    empty,
    emptyMessage: empty ? WORKSPACE_EMPTY.noActivity : WORKSPACE_EMPTY.noActivity,
    surfaceHints: {
      watchlist: "/watchlist",
      dashboard: "/",
      research: "/research",
      results: "/results",
      company: "/company",
      portfolio: "/portfolio",
    },
  };
}

export function getWatchlistWorkspaceHealth(context?: WatchlistWorkspaceContext | null): {
  ready: boolean;
  portfolioLinked: boolean;
  alertCount: number;
  actionCount: number;
  timelineCount: number;
  shared: boolean;
  sprint10BR4Frozen: boolean;
  emptyMessage: string;
} {
  const view = getWatchlistWorkspace(context);
  return {
    ready: !view.empty || view.portfolio.overlap.length > 0,
    portfolioLinked:
      view.portfolio.overlap.length > 0 ||
      view.portfolio.watchlistCandidates.length > 0,
    alertCount: view.alerts.existing.length + view.alerts.pinned.length,
    actionCount: view.actions.actions.length,
    timelineCount: view.timeline.entries.length,
    shared: view.collaboration.shared,
    sprint10BR4Frozen: SPRINT_10B_R4_FROZEN,
    emptyMessage: view.empty ? WORKSPACE_EMPTY.noActivity : "",
  };
}

export function resetWatchlistWorkspace(): void {
  resetPortfolioBridge();
  resetWatchlistAlertBridge();
  resetWatchlistTimeline();
  resetWatchlistCollaboration();
  resetWorkspaceHistory();
  resetRecentActivity();
  resetInstitutionalWorkspace();
}

/** Sprint 10B.R7 — institutional workspace, history, productivity */
export {
  WORKSPACE_PRODUCTIVITY_EMPTY,
  WORKSPACE_HISTORY_KINDS,
  QUICK_ACTIONS,
  emptyInstitutionalWorkspace,
} from "./WorkspacePresentationModels";
export type {
  WorkspaceProductivityEmptyMessage,
  WorkspaceHistoryKind,
  QuickActionId,
  InstitutionalWorkspaceContext,
  InstitutionalWorkspaceBundle,
  SavedWatchlistsView,
  WorkspaceHistoryView,
  WorkspaceComparisonView,
  WorkspaceResearchBridgeView,
  ProductivityView,
} from "./WorkspacePresentationModels";

export {
  saveWatchlist,
  loadWatchlist,
  listWatchlists,
  archiveWatchlist as archiveSavedWatchlist,
  restoreWatchlist as restoreSavedWatchlist,
  duplicateWatchlist,
  cloneWatchlist as cloneSavedWatchlist,
  renameWatchlist,
  pinWatchlist,
  favoriteWatchlist,
  SavedWatchlistEngine,
} from "./SavedWatchlistEngine";

export {
  recordWorkspaceHistoryEvent,
  getWorkspaceHistory,
  getWorkspaceTimeline,
  resetWorkspaceHistory,
  WatchlistHistoryEngine,
} from "./WatchlistHistoryEngine";

export {
  compareWatchlists,
  compareWatchlists as compareWorkspaceWatchlists,
  WatchlistComparisonWorkspace,
} from "./WatchlistComparisonWorkspace";

export {
  getProductivityView,
  trackWatchlistActivity,
  logExportedWatchlist,
  resetRecentActivity,
  WatchlistRecentActivity,
} from "./WatchlistRecentActivity";

export { getWorkspaceResearchBridge } from "./WatchlistResearchBridge";

export {
  WatchlistWorkspaceEngine,
  getInstitutionalWorkspaceEngine,
  getInstitutionalWorkspace,
  getInstitutionalWorkspaceHealth,
  resetInstitutionalWorkspace,
  isSprint10BR7Frozen,
  SPRINT_10B_R7_FROZEN,
} from "./WatchlistWorkspaceEngine";
