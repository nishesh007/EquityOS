/**
 * Institutional Research Workspace — orchestrator (Sprint 10A.R1).
 * Primary analyst working environment. Composes existing module routes only.
 */

import {
  WORKSPACE_EMPTY,
  emptyWorkspaceRecord,
  type CreateWorkspaceInput,
  type OpenWorkspaceOptions,
  type ResearchWorkspaceRecord,
  type WorkspacePanelId,
} from "./WorkspaceModels";
import {
  getLayout,
  persistLayout,
  setActivePanel,
  togglePanelVisibility,
  type WorkspaceLayoutState,
} from "./WorkspaceLayout";
import {
  archiveSession,
  closeSession,
  createSession,
  deleteSession,
  duplicateSession,
  favoriteSession,
  getSession,
  incrementResearchCount,
  listSessions,
  openSession,
  pinSession,
  renameSession,
  restoreSession,
  type ResearchSession,
} from "./WorkspaceSession";
import {
  archiveWorkspace as registryArchive,
  attachSession,
  closeWorkspace as registryClose,
  createWorkspace as registryCreate,
  deleteWorkspace as registryDelete,
  getActiveWorkspace,
  listRecentWorkspaces,
  listWorkspaces as registryList,
  openWorkspace as registryOpen,
  renameWorkspace as registryRename,
  resetRegistry,
  restoreWorkspace as registryRestore,
} from "./WorkspaceRegistry";
import {
  emptyWorkspaceMetrics,
  getWorkspaceMetrics as metricsGet,
  recordExecutionTime,
  resetMetrics,
  type ResearchWorkspaceMetrics,
} from "./WorkspaceMetrics";
import {
  emptyResearchWorkspaceView,
  normalizeWorkspaceActivity,
  sessionToCard,
  workspaceToCard,
  type ResearchWorkspaceView,
  type WorkspaceActivity,
} from "./WorkspacePresentationModels";
import { resetLayoutEngines } from "./layout";

const activityLog: WorkspaceActivity[] = [];
const MAX_ACTIVITY = 50;

function pushActivity(action: string, target: string): void {
  const entry = normalizeWorkspaceActivity({
    id: `act-${Date.now()}-${activityLog.length}`,
    action,
    target,
    at: new Date().toISOString(),
    empty: false,
  });
  activityLog.unshift(entry);
  if (activityLog.length > MAX_ACTIVITY) activityLog.length = MAX_ACTIVITY;
}

export class ResearchWorkspace {
  createWorkspace(input?: CreateWorkspaceInput | null): ResearchWorkspaceRecord {
    const started = Date.now();
    const record = registryCreate(input);
    if (!record.empty) {
      pushActivity("create_workspace", record.name);
    }
    recordExecutionTime(Date.now() - started);
    return record;
  }

  openWorkspace(
    id: string,
    options?: OpenWorkspaceOptions
  ): ResearchWorkspaceRecord {
    const started = Date.now();
    const record = registryOpen(id, options);
    if (!record.empty) {
      pushActivity("open_workspace", record.name);
    }
    recordExecutionTime(Date.now() - started);
    return record;
  }

  closeWorkspace(id: string, now?: Date | null): ResearchWorkspaceRecord {
    const record = registryClose(id, now);
    if (!record.empty) pushActivity("close_workspace", record.name);
    return record;
  }

  renameWorkspace(
    id: string,
    name: string,
    now?: Date | null
  ): ResearchWorkspaceRecord {
    const record = registryRename(id, name, now);
    if (!record.empty) pushActivity("rename_workspace", record.name);
    return record;
  }

  archiveWorkspace(id: string, now?: Date | null): ResearchWorkspaceRecord {
    const record = registryArchive(id, now);
    if (!record.empty) pushActivity("archive_workspace", record.name);
    return record;
  }

  restoreWorkspace(id: string, now?: Date | null): ResearchWorkspaceRecord {
    const record = registryRestore(id, now);
    if (!record.empty) pushActivity("restore_workspace", record.name);
    return record;
  }

  deleteWorkspace(id: string): boolean {
    const ok = registryDelete(id);
    if (ok) pushActivity("delete_workspace", id);
    return ok;
  }

  listWorkspaces(options?: {
    includeArchived?: boolean;
    includeDeleted?: boolean;
    activeOnly?: boolean;
  }): ResearchWorkspaceRecord[] {
    return registryList(options);
  }

  getWorkspaceMetrics(): ResearchWorkspaceMetrics {
    return metricsGet();
  }

  /** Session management — compose over WorkspaceSession. */
  openSession(id: string, now?: Date | null): ResearchSession | null {
    const session = openSession(id, now);
    if (session) pushActivity("open_session", session.name);
    return session;
  }

  closeSession(id: string, now?: Date | null): ResearchSession | null {
    const session = closeSession(id, now);
    if (session) pushActivity("close_session", session.name);
    return session;
  }

  duplicateSession(id: string, now?: Date | null): ResearchSession | null {
    const session = duplicateSession(id, now);
    if (session) {
      attachSession(session.workspaceId, session, now);
      pushActivity("duplicate_session", session.name);
    }
    return session;
  }

  pinSession(id: string, pinned = true, now?: Date | null): ResearchSession | null {
    const session = pinSession(id, pinned, now);
    if (session) pushActivity(pinned ? "pin_session" : "unpin_session", session.name);
    return session;
  }

  favoriteSession(
    id: string,
    favorite = true,
    now?: Date | null
  ): ResearchSession | null {
    const session = favoriteSession(id, favorite, now);
    if (session) {
      pushActivity(
        favorite ? "favorite_session" : "unfavorite_session",
        session.name
      );
    }
    return session;
  }

  renameSession(
    id: string,
    name: string,
    now?: Date | null
  ): ResearchSession | null {
    const session = renameSession(id, name, now);
    if (session) pushActivity("rename_session", session.name);
    return session;
  }

  archiveSession(id: string, now?: Date | null): ResearchSession | null {
    const session = archiveSession(id, now);
    if (session) pushActivity("archive_session", session.name);
    return session;
  }

  restoreSession(id: string, now?: Date | null): ResearchSession | null {
    const session = restoreSession(id, now);
    if (session) pushActivity("restore_session", session.name);
    return session;
  }

  deleteSession(id: string): boolean {
    const ok = deleteSession(id);
    if (ok) pushActivity("delete_session", id);
    return ok;
  }

  listSessions(options?: {
    workspaceId?: string | null;
    includeArchived?: boolean;
    pinnedOnly?: boolean;
    favoriteOnly?: boolean;
    openOnly?: boolean;
  }): ResearchSession[] {
    return listSessions(options);
  }

  createResearchSession(input: {
    workspaceId: string;
    name?: string | null;
    ticker?: string | null;
    now?: Date | null;
  }): ResearchSession {
    const session = createSession(input);
    if (!session.empty) {
      attachSession(input.workspaceId, session, input.now);
      pushActivity("create_session", session.name);
    }
    return session;
  }

  recordResearch(sessionId: string, now?: Date | null): ResearchSession | null {
    const session = incrementResearchCount(sessionId, 1, now);
    if (session) pushActivity("record_research", session.name);
    return session;
  }

  getLayout(workspaceId: string): WorkspaceLayoutState | null {
    return getLayout(workspaceId);
  }

  persistLayout(
    workspaceId: string,
    patch?: Partial<WorkspaceLayoutState> | null,
    now?: Date | null
  ): WorkspaceLayoutState {
    return persistLayout(workspaceId, patch, now);
  }

  setActivePanel(
    workspaceId: string,
    panel: WorkspacePanelId,
    now?: Date | null
  ): WorkspaceLayoutState {
    const layout = setActivePanel(workspaceId, panel, now);
    pushActivity("set_active_panel", panel);
    return layout;
  }

  togglePanel(
    workspaceId: string,
    panel: WorkspacePanelId,
    visible?: boolean,
    now?: Date | null
  ): WorkspaceLayoutState {
    return togglePanelVisibility(workspaceId, panel, visible, now);
  }

  getView(): ResearchWorkspaceView {
    try {
      const workspaces = registryList();
      const active = getActiveWorkspace();
      const recent = listRecentWorkspaces(8).map((w) => workspaceToCard(w, "recent"));
      const sessions = listSessions({
        workspaceId: active?.id,
        includeArchived: false,
      }).map(sessionToCard);
      const pinned = listSessions({ pinnedOnly: true }).map(sessionToCard);
      const favorites = listSessions({ favoriteOnly: true }).map(sessionToCard);
      const layout = active ? getLayout(active.id) : null;
      const metrics = metricsGet();

      if (workspaces.length === 0) {
        return emptyResearchWorkspaceView(WORKSPACE_EMPTY.noWorkspace);
      }

      if (!active) {
        const base = emptyResearchWorkspaceView(WORKSPACE_EMPTY.noActiveResearch);
        return {
          ...base,
          recent,
          metrics,
          recentActivity: activityLog.slice(0, 20),
          empty: recent.length === 0,
          emptyMessage:
            recent.length === 0
              ? WORKSPACE_EMPTY.noRecentSessions
              : WORKSPACE_EMPTY.noActiveResearch,
        };
      }

      const openSessions = sessions.filter((s) => !s.empty);
      if (openSessions.length === 0 && activityLog.length === 0) {
        return {
          ...emptyResearchWorkspaceView(WORKSPACE_EMPTY.awaitingResearch),
          active: workspaceToCard(active, "active"),
          recent,
          layout,
          panels: layout?.panels
            .filter((p) => p.visible)
            .map((p) => ({
              id: p.id,
              label: p.label,
              visible: p.visible,
              route: p.route,
            })) ?? [],
          metrics,
          empty: true,
          emptyMessage: WORKSPACE_EMPTY.awaitingResearch,
        };
      }

      return {
        active: workspaceToCard(active, "active"),
        recent,
        sessions,
        pinned,
        favorites,
        panels:
          layout?.panels
            .filter((p) => p.visible)
            .map((p) => ({
              id: p.id,
              label: p.label,
              visible: p.visible,
              route: p.route,
            })) ?? [],
        layout,
        metrics,
        recentActivity: activityLog.slice(0, 20),
        empty: false,
        emptyMessage: WORKSPACE_EMPTY.awaitingResearch,
        surfaceHints: {
          research: "/research",
          dashboard: "/",
          company: "/company",
          results: "/results",
        },
      };
    } catch {
      return emptyResearchWorkspaceView(WORKSPACE_EMPTY.noWorkspace);
    }
  }

  reset(): void {
    activityLog.length = 0;
    resetMetrics();
    resetRegistry();
    resetLayoutEngines();
  }
}

let singleton: ResearchWorkspace | null = null;

export function getResearchWorkspace(): ResearchWorkspace {
  if (!singleton) singleton = new ResearchWorkspace();
  return singleton;
}

export function resetResearchWorkspace(): void {
  singleton?.reset();
  singleton = null;
}

/** Public API — Sprint 10A.R1 */

export function createWorkspace(
  input?: CreateWorkspaceInput | null
): ResearchWorkspaceRecord {
  try {
    return getResearchWorkspace().createWorkspace(input);
  } catch {
    return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);
  }
}

export function openWorkspace(
  id: string,
  options?: OpenWorkspaceOptions
): ResearchWorkspaceRecord {
  try {
    return getResearchWorkspace().openWorkspace(id, options);
  } catch {
    return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);
  }
}

export function closeWorkspace(
  id: string,
  now?: Date | null
): ResearchWorkspaceRecord {
  try {
    return getResearchWorkspace().closeWorkspace(id, now);
  } catch {
    return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);
  }
}

export function renameWorkspace(
  id: string,
  name: string,
  now?: Date | null
): ResearchWorkspaceRecord {
  try {
    return getResearchWorkspace().renameWorkspace(id, name, now);
  } catch {
    return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);
  }
}

export function archiveWorkspace(
  id: string,
  now?: Date | null
): ResearchWorkspaceRecord {
  try {
    return getResearchWorkspace().archiveWorkspace(id, now);
  } catch {
    return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);
  }
}

export function restoreWorkspace(
  id: string,
  now?: Date | null
): ResearchWorkspaceRecord {
  try {
    return getResearchWorkspace().restoreWorkspace(id, now);
  } catch {
    return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);
  }
}

export function listWorkspaces(options?: {
  includeArchived?: boolean;
  includeDeleted?: boolean;
  activeOnly?: boolean;
}): ResearchWorkspaceRecord[] {
  try {
    return getResearchWorkspace().listWorkspaces(options);
  } catch {
    return [];
  }
}

export function getWorkspaceMetrics(): ResearchWorkspaceMetrics {
  try {
    return getResearchWorkspace().getWorkspaceMetrics();
  } catch {
    return emptyWorkspaceMetrics();
  }
}

export function getResearchWorkspaceView(): ResearchWorkspaceView {
  try {
    return getResearchWorkspace().getView();
  } catch {
    return emptyResearchWorkspaceView(WORKSPACE_EMPTY.noWorkspace);
  }
}

export function getSessionById(id: string): ResearchSession | null {
  return getSession(id);
}
