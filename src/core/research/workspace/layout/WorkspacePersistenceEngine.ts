/**
 * Institutional Research Workspace — persistence engine (Sprint 10A.R2).
 * Restore last session: tabs, layouts, scroll positions, filters.
 * Composes tab/dock/layout engines — no duplicated research logic.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { openWorkspace } from "../WorkspaceRegistry";
import {
  LAYOUT_EMPTY,
  emptyPersistedSession,
  type LayoutPresetId,
  type PersistedWorkspaceSession,
} from "./LayoutPresentationModels";
import {
  ensureDockLayout,
  getDockLayout,
  setDockSnapshot,
} from "./WorkspaceDockEngine";
import { applyLayoutPreset, getSavedLayout, restoreLayout } from "./WorkspaceLayoutEngine";
import {
  focusTab,
  getActiveTab,
  listOpenTabs,
  openTab,
  restoreTab,
  setTabFilters,
  setTabScroll,
} from "./WorkspaceTabEngine";
import { recordHistory } from "./WorkspaceHistoryEngine";

const sessions = new Map<string, PersistedWorkspaceSession>();

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

export function persistSession(
  workspaceId: string,
  options?: {
    layoutId?: string | null;
    preset?: LayoutPresetId | null;
    now?: Date | null;
  }
): PersistedWorkspaceSession {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  if (!id) return emptyPersistedSession(LAYOUT_EMPTY.awaitingWorkspace);

  const tabs = listOpenTabs(id);
  const active = getActiveTab(id);
  const dock = getDockLayout(id) ?? ensureDockLayout(id, options?.now);

  const scrollPositions: Record<string, number> = {};
  const filters: Record<string, Record<string, string>> = {};
  for (const tab of tabs) {
    scrollPositions[tab.id] = tab.scrollTop;
    filters[tab.id] = { ...tab.filters };
  }

  const record: PersistedWorkspaceSession = {
    workspaceId: id,
    tabIds: tabs.map((t) => t.id),
    activeTabId: active?.id ?? null,
    layoutId: options?.layoutId
      ? safeWorkspaceText(options.layoutId, "")
      : null,
    preset: options?.preset ?? "default",
    scrollPositions,
    filters,
    dock,
    restoredAt: null,
    empty: false,
    emptyMessage: LAYOUT_EMPTY.awaitingWorkspace,
  };

  sessions.set(id, record);
  return record;
}

export function getPersistedSession(
  workspaceId: string
): PersistedWorkspaceSession | null {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  if (!id) return null;
  const session = sessions.get(id);
  if (!session || session.empty) return null;
  return session;
}

export function restoreSession(
  workspaceId: string,
  now?: Date | null
): PersistedWorkspaceSession {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  if (!id) return emptyPersistedSession(LAYOUT_EMPTY.awaitingWorkspace);

  openWorkspace(id, { now });

  let session = sessions.get(id);
  if (!session || session.empty) {
    // bootstrap from current open tabs if nothing persisted yet
    session = persistSession(id, { now });
  }

  if (session.layoutId) {
    const saved = getSavedLayout(session.layoutId);
    if (saved) restoreLayout(saved.id, now);
    else applyLayoutPreset(id, session.preset, now);
  } else {
    applyLayoutPreset(id, session.preset, now);
  }

  if (session.dock) {
    setDockSnapshot(id, session.dock, now);
  } else {
    ensureDockLayout(id, now);
  }

  for (const tabId of session.tabIds) {
    restoreTab(tabId, now);
    const scroll = session.scrollPositions[tabId];
    if (scroll != null) setTabScroll(tabId, scroll, now);
    const filters = session.filters[tabId];
    if (filters) setTabFilters(tabId, filters, now);
  }

  if (session.activeTabId) {
    focusTab(session.activeTabId);
  }

  const restored: PersistedWorkspaceSession = {
    ...session,
    restoredAt: stamp(now),
    empty: false,
    emptyMessage: LAYOUT_EMPTY.awaitingWorkspace,
  };
  sessions.set(id, restored);

  recordHistory({
    kind: "session",
    label: "Restore session",
    target: id,
    route: "/research",
    now,
  });

  return restored;
}

export function restoreLastSession(
  workspaceId: string,
  now?: Date | null
): PersistedWorkspaceSession {
  return restoreSession(workspaceId, now);
}

/** Seed helpers used when opening platform surfaces. */
export function ensurePersistedWorkspace(
  workspaceId: string,
  options?: { ticker?: string | null; now?: Date | null }
): PersistedWorkspaceSession {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  if (!id) return emptyPersistedSession(LAYOUT_EMPTY.awaitingWorkspace);

  ensureDockLayout(id, options?.now);
  const open = listOpenTabs(id);
  if (open.length === 0) {
    openTab({
      workspaceId: id,
      kind: "research",
      ticker: options?.ticker,
      now: options?.now,
    });
  }
  return persistSession(id, { preset: "research", now: options?.now });
}

export function resetPersistence(): void {
  sessions.clear();
}

export class WorkspacePersistenceEngine {
  persistSession = persistSession;
  restoreSession = restoreSession;
  restoreLastSession = restoreLastSession;
  getPersistedSession = getPersistedSession;
  reset = resetPersistence;
}
