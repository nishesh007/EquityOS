/**
 * Institutional Screener Workspace — orchestrator (Sprint 9D.R7).
 * Composes saved screens, history, comparison, research bridge, timeline.
 */

import { safeScreenText } from "../ScreenModels";
import { listTemplates } from "../strategy/StrategyLibrary";
import {
  archiveSavedScreen,
  favoriteSavedScreen,
  listFavoriteSavedScreens,
  listPinnedSavedScreens,
  listRecentSavedScreens,
  listSavedScreens,
  loadScreen,
  pinSavedScreen,
  resetSavedScreens,
  saveScreen,
  type SaveScreenInput,
} from "./SavedScreenEngine";
import {
  compareScreens,
  type ComparableSide,
} from "./ScreenComparisonEngine";
import {
  listHistory,
  recordRun,
  resetHistory,
  type RecordRunInput,
} from "./ScreenHistoryEngine";
import {
  openResearch,
  type OpenResearchOptions,
} from "./ResearchBridgeEngine";
import {
  getTimeline,
  type TimelineSnapshot,
} from "./ScreenTimelineEngine";
import {
  emptyWorkspaceView,
  normalizeWorkspaceActivity,
  normalizeWorkspaceCard,
  WORKSPACE_EMPTY,
  type QuickAction,
  type ResearchBridgeTarget,
  type SavedScreenRecord,
  type ScreenComparisonResult,
  type ScreenTimelineEntry,
  type WorkspaceActivity,
  type WorkspaceCard,
  type WorkspaceView,
} from "./WorkspacePresentationModels";

const activityLog: WorkspaceActivity[] = [];
const MAX_ACTIVITY = 50;

function pushActivity(action: string, target: string): void {
  const entry = normalizeWorkspaceActivity({
    id: `act-${Date.now()}-${activityLog.length}`,
    action: safeScreenText(action, "activity"),
    target: safeScreenText(target, "—"),
    at: new Date().toISOString(),
    empty: false,
  });
  activityLog.unshift(entry);
  if (activityLog.length > MAX_ACTIVITY) activityLog.length = MAX_ACTIVITY;
}

function toCard(
  record: SavedScreenRecord,
  kind: WorkspaceCard["kind"]
): WorkspaceCard {
  const actions: QuickAction[] = ["open_research", "compare", "export"];
  if (!record.pinned) actions.push("pin");
  if (!record.favorite) actions.push("favorite");
  if (!record.archived) actions.push("archive");
  return normalizeWorkspaceCard({
    id: record.id,
    title: record.name,
    subtitle: `${record.topTickers.slice(0, 3).join(", ") || "—"} · trust ${record.trustAvg}`,
    kind,
    tags: record.tags,
    quickActions: actions,
    empty: false,
  });
}

export class ScreenWorkspace {
  getWorkspaceView(): WorkspaceView {
    const recent = listRecentSavedScreens(8).map((r) => toCard(r, "recent"));
    const pinned = listPinnedSavedScreens().map((r) => toCard(r, "pinned"));
    const favorites = listFavoriteSavedScreens().map((r) =>
      toCard(r, "favorite")
    );
    const savedResults = listSavedScreens().map((r) => toCard(r, "saved"));

    let sharedTemplates: WorkspaceCard[] = [];
    try {
      sharedTemplates = listTemplates().map((t) =>
        normalizeWorkspaceCard({
          id: t.id,
          title: t.name,
          subtitle: safeScreenText(t.description, "Shared template"),
          kind: "template",
          tags: t.tags ?? [],
          quickActions: ["compare", "open_research", "export"],
          empty: false,
        })
      );
    } catch {
      sharedTemplates = [];
    }

    const recentActivity = activityLog.slice(0, 20);
    /** Empty until the user has saved a screen or recorded activity (templates alone don't clear). */
    const empty = savedResults.length === 0 && recentActivity.length === 0;

    if (empty) {
      const base = emptyWorkspaceView(WORKSPACE_EMPTY.awaitingFirstScan);
      return {
        ...base,
        sharedTemplates,
      };
    }

    return {
      recentScreens: recent,
      pinned,
      favorites,
      savedResults,
      sharedTemplates,
      recentActivity,
      empty: false,
      emptyMessage: WORKSPACE_EMPTY.awaitingFirstScan,
    };
  }

  saveScreen(input: SaveScreenInput): SavedScreenRecord {
    const record = saveScreen(input);
    pushActivity("save_screen", record.name);
    return record;
  }

  loadScreen(id: string): SavedScreenRecord | null {
    const record = loadScreen(id);
    if (record) pushActivity("load_screen", record.name);
    return record;
  }

  listSavedScreens(options?: {
    includeArchived?: boolean;
    pinnedOnly?: boolean;
    favoriteOnly?: boolean;
    recentOnly?: boolean;
  }): SavedScreenRecord[] {
    return listSavedScreens(options);
  }

  compareScreens(
    left: ComparableSide,
    right: ComparableSide
  ): ScreenComparisonResult {
    const result = compareScreens(left, right);
    pushActivity("compare_screens", result.summary);
    return result;
  }

  openResearch(
    ticker: string,
    options?: OpenResearchOptions
  ): ResearchBridgeTarget | ResearchBridgeTarget[] {
    const target = openResearch(ticker, options);
    pushActivity(
      "open_research",
      Array.isArray(target) ? ticker : target.label
    );
    return target;
  }

  getTimeline(
    target: string,
    snapshots: TimelineSnapshot[],
    options?: { screenId?: string | null }
  ): ScreenTimelineEntry[] {
    return getTimeline(target, snapshots, options);
  }

  archiveScreen(id: string, archived = true): SavedScreenRecord | null {
    const record = archiveSavedScreen(id, archived);
    if (record) pushActivity("archive_screen", record.name);
    return record;
  }

  favoriteScreen(id: string, favorite = true): SavedScreenRecord | null {
    const record = favoriteSavedScreen(id, favorite);
    if (record) pushActivity("favorite_screen", record.name);
    return record;
  }

  pinScreen(id: string, pinned = true): SavedScreenRecord | null {
    const record = pinSavedScreen(id, pinned);
    if (record) pushActivity("pin_screen", record.name);
    return record;
  }

  recordHistory(input: RecordRunInput) {
    const run = recordRun(input);
    pushActivity("record_run", run.id);
    return run;
  }

  listHistory(
    options?: Parameters<typeof listHistory>[0]
  ) {
    return listHistory(options);
  }
}

let defaultWorkspace: ScreenWorkspace | null = null;

export function getScreenWorkspace(): ScreenWorkspace {
  if (!defaultWorkspace) {
    defaultWorkspace = new ScreenWorkspace();
  }
  return defaultWorkspace;
}

export function resetScreenWorkspace(): void {
  resetSavedScreens();
  resetHistory();
  activityLog.length = 0;
  defaultWorkspace = null;
}

/** Convenience singleton helpers */
export function getWorkspaceView(): WorkspaceView {
  return getScreenWorkspace().getWorkspaceView();
}

export function saveScreenWorkspace(
  input: SaveScreenInput
): SavedScreenRecord {
  return getScreenWorkspace().saveScreen(input);
}

export function loadScreenWorkspace(
  id: string
): SavedScreenRecord | null {
  return getScreenWorkspace().loadScreen(id);
}

export function listSavedScreensWorkspace(
  options?: Parameters<ScreenWorkspace["listSavedScreens"]>[0]
): SavedScreenRecord[] {
  return getScreenWorkspace().listSavedScreens(options);
}

export function compareScreensWorkspace(
  left: ComparableSide,
  right: ComparableSide
): ScreenComparisonResult {
  return getScreenWorkspace().compareScreens(left, right);
}

export function openResearchWorkspace(
  ticker: string,
  options?: OpenResearchOptions
): ResearchBridgeTarget | ResearchBridgeTarget[] {
  return getScreenWorkspace().openResearch(ticker, options);
}

export function getTimelineWorkspace(
  target: string,
  snapshots: TimelineSnapshot[],
  options?: { screenId?: string | null }
): ScreenTimelineEntry[] {
  return getScreenWorkspace().getTimeline(target, snapshots, options);
}

export function archiveScreenWorkspace(
  id: string,
  archived = true
): SavedScreenRecord | null {
  return getScreenWorkspace().archiveScreen(id, archived);
}

export function favoriteScreenWorkspace(
  id: string,
  favorite = true
): SavedScreenRecord | null {
  return getScreenWorkspace().favoriteScreen(id, favorite);
}

export function pinScreenWorkspace(
  id: string,
  pinned = true
): SavedScreenRecord | null {
  return getScreenWorkspace().pinScreen(id, pinned);
}
