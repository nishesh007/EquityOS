/**
 * Research Workspace bridge — platform wiring for Sprint 10A.R1–R2.
 * Reuses existing routes; does not rebuild Sprint 9 engines.
 */

import {
  WORKSPACE_EMPTY,
  LAYOUT_EMPTY,
  createWorkspace,
  getActiveWorkspace,
  getResearchWorkspaceView,
  getWorkspaceMetrics,
  getMultiTabWorkspaceView,
  getWorkspaceHistory,
  listRecentWorkspaces,
  listWorkspaces,
  listOpenTabs,
  openWorkspace,
  openTab,
  ensurePersistedWorkspace,
  restoreSession,
  type ResearchWorkspaceMetrics,
  type ResearchWorkspaceRecord,
  type ResearchWorkspaceView,
  type MultiTabWorkspaceView,
  type WorkspaceHistoryView,
} from "@/src/core/research/workspace";

export type ResearchWorkspaceHealth = {
  ready: boolean;
  workspaceCount: number;
  openSessions: number;
  pinned: number;
  researchCount: number;
  openTabs: number;
  activeWorkspaceId: string;
  emptyMessage: string;
  layoutEmptyMessage: string;
  surface: {
    research: string;
    dashboard: string;
    company: string;
    results: string;
  };
};

/** Health/status bridge for /research, /, /company, /results. */
export function fetchResearchWorkspaceHealth(): ResearchWorkspaceHealth {
  try {
    const metrics = getWorkspaceMetrics();
    const active = getActiveWorkspace();
    const workspaces = listWorkspaces({ includeArchived: true });
    const openTabs = active ? listOpenTabs(active.id).length : 0;
    return {
      ready: workspaces.length > 0 || !metrics.empty,
      workspaceCount: metrics.workspaceCount,
      openSessions: metrics.openSessions,
      pinned: metrics.pinned,
      researchCount: metrics.researchCount,
      openTabs,
      activeWorkspaceId: active?.id ?? metrics.activeWorkspaceId,
      emptyMessage: metrics.empty
        ? WORKSPACE_EMPTY.noWorkspace
        : WORKSPACE_EMPTY.awaitingResearch,
      layoutEmptyMessage:
        openTabs > 0 ? LAYOUT_EMPTY.awaitingWorkspace : LAYOUT_EMPTY.noOpenTabs,
      surface: {
        research: "/research",
        dashboard: "/",
        company: "/company",
        results: "/results",
      },
    };
  } catch {
    return {
      ready: false,
      workspaceCount: 0,
      openSessions: 0,
      pinned: 0,
      researchCount: 0,
      openTabs: 0,
      activeWorkspaceId: "",
      emptyMessage: WORKSPACE_EMPTY.noWorkspace,
      layoutEmptyMessage: LAYOUT_EMPTY.awaitingWorkspace,
      surface: {
        research: "/research",
        dashboard: "/",
        company: "/company",
        results: "/results",
      },
    };
  }
}

export function fetchResearchWorkspaceView(): ResearchWorkspaceView {
  try {
    return getResearchWorkspaceView();
  } catch {
    return getResearchWorkspaceView();
  }
}

export function fetchMultiTabWorkspaceView(
  workspaceId?: string | null
): MultiTabWorkspaceView {
  const active = getActiveWorkspace();
  const id = workspaceId ?? active?.id ?? "";
  return getMultiTabWorkspaceView(id);
}

export function fetchWorkspaceHistory(): WorkspaceHistoryView {
  return getWorkspaceHistory();
}

export function ensureDefaultResearchWorkspace(options?: {
  name?: string;
  ticker?: string | null;
}): ResearchWorkspaceRecord {
  const active = getActiveWorkspace();
  const workspace = active
    ? openWorkspace(active.id, { ticker: options?.ticker })
    : createWorkspace({
        name: options?.name ?? "Institutional Research Workspace",
        ticker: options?.ticker,
      });

  if (!workspace.empty) {
    ensurePersistedWorkspace(workspace.id, { ticker: options?.ticker });
    const tabs = listOpenTabs(workspace.id);
    if (tabs.length === 0) {
      openTab({
        workspaceId: workspace.id,
        kind: "research",
        ticker: options?.ticker,
      });
      if (options?.ticker) {
        openTab({
          workspaceId: workspace.id,
          kind: "company",
          ticker: options.ticker,
        });
      }
    }
  }

  return workspace;
}

export function restoreResearchWorkspaceSession(
  workspaceId?: string | null
): ReturnType<typeof restoreSession> {
  const active = getActiveWorkspace();
  const id = workspaceId ?? active?.id ?? "";
  return restoreSession(id);
}

export function fetchResearchWorkspaceMetrics(): ResearchWorkspaceMetrics {
  return getWorkspaceMetrics();
}

export function fetchRecentResearchWorkspaces(limit = 8): ResearchWorkspaceRecord[] {
  return listRecentWorkspaces(limit);
}

export {
  WORKSPACE_EMPTY,
  LAYOUT_EMPTY,
  createWorkspace,
  openWorkspace,
  listWorkspaces,
  getWorkspaceMetrics,
  openTab,
  closeTab,
  duplicateTab,
  pinTab,
  saveLayout,
  restoreLayout,
  restoreSession,
  getWorkspaceHistory,
} from "@/src/core/research/workspace";
