/**
 * Research Workspace bridge — platform wiring for Sprint 10A.R1.
 * Reuses existing routes; does not rebuild Sprint 9 engines.
 */

import {
  WORKSPACE_EMPTY,
  createWorkspace,
  getActiveWorkspace,
  getResearchWorkspaceView,
  getWorkspaceMetrics,
  listRecentWorkspaces,
  listWorkspaces,
  openWorkspace,
  type ResearchWorkspaceMetrics,
  type ResearchWorkspaceRecord,
  type ResearchWorkspaceView,
} from "@/src/core/research/workspace";

export type ResearchWorkspaceHealth = {
  ready: boolean;
  workspaceCount: number;
  openSessions: number;
  pinned: number;
  researchCount: number;
  activeWorkspaceId: string;
  emptyMessage: string;
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
    return {
      ready: workspaces.length > 0 || !metrics.empty,
      workspaceCount: metrics.workspaceCount,
      openSessions: metrics.openSessions,
      pinned: metrics.pinned,
      researchCount: metrics.researchCount,
      activeWorkspaceId: active?.id ?? metrics.activeWorkspaceId,
      emptyMessage: metrics.empty
        ? WORKSPACE_EMPTY.noWorkspace
        : WORKSPACE_EMPTY.awaitingResearch,
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
      activeWorkspaceId: "",
      emptyMessage: WORKSPACE_EMPTY.noWorkspace,
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

export function ensureDefaultResearchWorkspace(options?: {
  name?: string;
  ticker?: string | null;
}): ResearchWorkspaceRecord {
  const active = getActiveWorkspace();
  if (active) return openWorkspace(active.id, { ticker: options?.ticker });
  return createWorkspace({
    name: options?.name ?? "Institutional Research Workspace",
    ticker: options?.ticker,
  });
}

export function fetchResearchWorkspaceMetrics(): ResearchWorkspaceMetrics {
  return getWorkspaceMetrics();
}

export function fetchRecentResearchWorkspaces(limit = 8): ResearchWorkspaceRecord[] {
  return listRecentWorkspaces(limit);
}

export {
  WORKSPACE_EMPTY,
  createWorkspace,
  openWorkspace,
  listWorkspaces,
  getWorkspaceMetrics,
};
