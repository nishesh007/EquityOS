/**
 * Institutional Research Workspace — multi-tab layout public exports (Sprint 10A.R2).
 * Extends R1 foundation; does not rebuild research engines.
 */

export {
  LAYOUT_EMPTY,
  TAB_KINDS,
  TAB_KIND_LABELS,
  DOCK_REGIONS,
  LAYOUT_PRESETS,
  emptyTab,
  normalizeTab,
  emptyDockPane,
  normalizeDockPane,
  emptyDockLayout,
  normalizeDockLayout,
  emptySavedLayout,
  normalizeSavedLayout,
  emptyHistoryEntry,
  normalizeHistoryEntry,
  emptyHistoryView,
  emptyPersistedSession,
  emptyMultiTabView,
  resolveTabRoute,
  tabKindToPanel,
  normalizeTabKind,
  normalizePreset,
} from "./LayoutPresentationModels";
export type {
  LayoutEmptyMessage,
  WorkspaceTabKind,
  DockRegion,
  LayoutPresetId,
  WorkspaceTab,
  DockPaneState,
  DockLayoutState,
  SavedWorkspaceLayout,
  WorkspaceHistoryEntry,
  WorkspaceHistoryView,
  PersistedWorkspaceSession,
  MultiTabWorkspaceView,
} from "./LayoutPresentationModels";

export {
  openTab as openTabRaw,
  closeTab as closeTabRaw,
  duplicateTab as duplicateTabRaw,
  pinTab as pinTabRaw,
  restoreTab,
  reorderTabs,
  focusTab,
  getTab,
  getActiveTab,
  listOpenTabs,
  listClosedTabs,
  listAllTabs,
  setTabScroll,
  setTabFilters,
  resetTabs,
  WorkspaceTabEngine,
} from "./WorkspaceTabEngine";
export type { OpenTabInput } from "./WorkspaceTabEngine";

export {
  createDockLayout,
  getDockLayout,
  ensureDockLayout,
  dockTab,
  resizePane,
  collapsePane,
  fullscreenPane,
  setDockSnapshot,
  resetDocks,
  WorkspaceDockEngine,
} from "./WorkspaceDockEngine";

export {
  applyLayoutPreset,
  saveLayout as saveLayoutRaw,
  restoreLayout as restoreLayoutRaw,
  getSavedLayout,
  listSavedLayouts,
  getDefaultLayouts,
  resetSavedLayouts,
  WorkspaceLayoutEngine,
} from "./WorkspaceLayoutEngine";

export {
  setWorkspaceFocus,
  getFocusedWorkspaceId,
  focusWorkspaceTab,
  focusDockRegion,
  clearFocus,
  resetFocus,
  WorkspaceFocusEngine,
} from "./WorkspaceFocusEngine";

export {
  recordHistory,
  getWorkspaceHistory as readWorkspaceHistory,
  listRecentCompanies,
  listRecentResearch,
  listRecentLayouts,
  listNavigationHistory,
  resetHistory,
  WorkspaceHistoryEngine,
} from "./WorkspaceHistoryEngine";

export {
  persistSession,
  getPersistedSession,
  restoreSession as restoreSessionRaw,
  restoreLastSession,
  ensurePersistedWorkspace,
  resetPersistence,
  WorkspacePersistenceEngine,
} from "./WorkspacePersistenceEngine";

import { LAYOUT_EMPTY, emptyMultiTabView } from "./LayoutPresentationModels";
import type {
  MultiTabWorkspaceView,
  PersistedWorkspaceSession,
  SavedWorkspaceLayout,
  WorkspaceHistoryView,
  WorkspaceTab,
  WorkspaceTabKind,
} from "./LayoutPresentationModels";
import type { OpenTabInput as TabInput } from "./WorkspaceTabEngine";
import {
  closeTab as closeTabRaw,
  duplicateTab as duplicateTabRaw,
  listOpenTabs,
  openTab as openTabRaw,
  pinTab as pinTabRaw,
  getActiveTab,
  resetTabs,
} from "./WorkspaceTabEngine";
import { ensureDockLayout, getDockLayout, dockTab, resetDocks } from "./WorkspaceDockEngine";
import {
  listSavedLayouts,
  restoreLayout as restoreLayoutRaw,
  saveLayout as saveLayoutRaw,
  resetSavedLayouts,
} from "./WorkspaceLayoutEngine";
import {
  getWorkspaceHistory as readHistory,
  recordHistory,
  resetHistory,
} from "./WorkspaceHistoryEngine";
import {
  persistSession,
  restoreSession as restoreSessionRaw,
  resetPersistence,
} from "./WorkspacePersistenceEngine";
import { resetFocus } from "./WorkspaceFocusEngine";

/** Public API — Sprint 10A.R2 */

export function openTab(input: TabInput): WorkspaceTab {
  const tab = openTabRaw(input);
  if (!tab.empty) {
    ensureDockLayout(tab.workspaceId);
    dockTab(tab.workspaceId, tab.id, "center");
    recordHistory({
      kind: tab.kind === "company" ? "company" : tab.kind === "research" ? "research" : "tab",
      label: tab.title,
      target: tab.ticker ?? tab.id,
      route: tab.route,
    });
  }
  return tab;
}

export function closeTab(id: string): WorkspaceTab {
  return closeTabRaw(id);
}

export function duplicateTab(id: string): WorkspaceTab {
  const tab = duplicateTabRaw(id);
  if (!tab.empty) {
    dockTab(tab.workspaceId, tab.id, "center");
    recordHistory({
      kind: "tab",
      label: tab.title,
      target: tab.id,
      route: tab.route,
    });
  }
  return tab;
}

export function pinTab(id: string, pinned = true): WorkspaceTab {
  return pinTabRaw(id, pinned);
}

export function saveLayout(input: {
  workspaceId: string;
  name?: string | null;
  preset?: SavedWorkspaceLayout["preset"] | null;
}): SavedWorkspaceLayout {
  const layout = saveLayoutRaw(input);
  if (!layout.empty) {
    persistSession(layout.workspaceId, {
      layoutId: layout.id,
      preset: layout.preset,
    });
    recordHistory({
      kind: "layout",
      label: layout.name,
      target: layout.id,
      route: "/research",
    });
  }
  return layout;
}

export function restoreLayout(layoutId: string): SavedWorkspaceLayout {
  const layout = restoreLayoutRaw(layoutId);
  if (!layout.empty) {
    recordHistory({
      kind: "layout",
      label: `Restore ${layout.name}`,
      target: layout.id,
      route: "/research",
    });
  }
  return layout;
}

export function restoreSession(workspaceId: string): PersistedWorkspaceSession {
  return restoreSessionRaw(workspaceId);
}

export function getWorkspaceHistory(limit = 40): WorkspaceHistoryView {
  return readHistory(limit);
}

export function getMultiTabWorkspaceView(
  workspaceId: string
): MultiTabWorkspaceView {
  try {
    const wid = workspaceId.trim().toLowerCase();
    if (!wid) return emptyMultiTabView(LAYOUT_EMPTY.awaitingWorkspace);

    const tabs = listOpenTabs(wid);
    const active = getActiveTab(wid);
    const history = readHistory();
    const savedLayouts = listSavedLayouts(wid);
    const dock = getDockLayout(wid);

    if (tabs.length === 0 && savedLayouts.length === 0) {
      return {
        ...emptyMultiTabView(LAYOUT_EMPTY.noOpenTabs),
        history,
        savedLayouts,
        dock,
        empty: true,
        emptyMessage:
          history.empty ? LAYOUT_EMPTY.noSessionHistory : LAYOUT_EMPTY.noOpenTabs,
      };
    }

    return {
      tabs,
      activeTabId: active?.id ?? null,
      dock,
      savedLayouts,
      history,
      persistence: null,
      empty: tabs.length === 0,
      emptyMessage:
        tabs.length === 0 ? LAYOUT_EMPTY.noOpenTabs : LAYOUT_EMPTY.awaitingWorkspace,
      surfaceHints: {
        research: "/research",
        dashboard: "/",
        company: "/company",
        results: "/results",
      },
    };
  } catch {
    return emptyMultiTabView(LAYOUT_EMPTY.awaitingWorkspace);
  }
}

export function resetLayoutEngines(): void {
  resetTabs();
  resetDocks();
  resetSavedLayouts();
  resetHistory();
  resetPersistence();
  resetFocus();
}

export function openTabByKind(
  workspaceId: string,
  kind: WorkspaceTabKind,
  ticker?: string | null
): WorkspaceTab {
  return openTab({ workspaceId, kind, ticker });
}

export function openCompanyTab(
  workspaceId: string,
  ticker: string,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "company", ticker, now });
}

export function openResearchTab(
  workspaceId: string,
  ticker?: string | null,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "research", ticker, now });
}

export function openEarningsTab(
  workspaceId: string,
  ticker?: string | null,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "earnings", ticker, now });
}

export function openAlertsTab(
  workspaceId: string,
  ticker?: string | null,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "alerts", ticker, now });
}

export function openScreenerTab(
  workspaceId: string,
  ticker?: string | null,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "screener", ticker, now });
}

export function openPortfolioTab(
  workspaceId: string,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "portfolio", now });
}

export function openOpportunityTab(
  workspaceId: string,
  ticker?: string | null,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "opportunity", ticker, now });
}

export function openNotesTab(
  workspaceId: string,
  ticker?: string | null,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "notes", ticker, now });
}
