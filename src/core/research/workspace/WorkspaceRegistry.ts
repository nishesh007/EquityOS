/**
 * Institutional Research Workspace — registry (Sprint 10A.R1).
 * Active workspace, recent workspaces, multi-session registry.
 */

import {
  WORKSPACE_EMPTY,
  emptyWorkspaceRecord,
  normalizeWorkspaceRecord,
  safeWorkspaceText,
  type CreateWorkspaceInput,
  type ResearchWorkspaceRecord,
  type WorkspaceEmptyMessage,
} from "./WorkspaceModels";
import {
  createLayout,
  getLayout,
  persistLayout,
  resetLayouts,
} from "./WorkspaceLayout";
import {
  createSession,
  listSessions,
  openSession,
  resetSessions,
  type ResearchSession,
} from "./WorkspaceSession";

const workspaces = new Map<string, ResearchWorkspaceRecord>();
let activeWorkspaceId: string | null = null;
let recentIds: string[] = [];
let workspaceSeq = 0;

const MAX_RECENT = 20;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

function touchRecent(id: string): void {
  recentIds = [id, ...recentIds.filter((x) => x !== id)].slice(0, MAX_RECENT);
}

export function createWorkspace(
  input?: CreateWorkspaceInput | null
): ResearchWorkspaceRecord {
  workspaceSeq += 1;
  const now = stamp(input?.now);
  const id = safeWorkspaceText(
    input?.id,
    `workspace-${workspaceSeq}-${Date.now()}`
  ).toLowerCase();
  const ticker = input?.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;
  const name = safeWorkspaceText(
    input?.name,
    ticker ? `Workspace · ${ticker}` : `Research Workspace ${workspaceSeq}`
  );

  const session = createSession({
    workspaceId: id,
    name: ticker ? `Research · ${ticker}` : "Primary Research",
    ticker,
    now: input?.now,
  });

  createLayout(id, {
    ticker,
    now: input?.now,
    panels: input?.panels,
  });

  const record = normalizeWorkspaceRecord({
    id,
    name,
    status: "active",
    activeSessionId: session.id,
    sessionIds: [session.id],
    pinned: false,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    cachedStateKey: `cache:${id}`,
    empty: false,
  });

  workspaces.set(id, record);
  activeWorkspaceId = id;
  touchRecent(id);
  return record;
}

export function getWorkspace(id: string): ResearchWorkspaceRecord | null {
  const key = safeWorkspaceText(id, "").toLowerCase();
  if (!key) return null;
  const record = workspaces.get(key);
  if (!record || record.status === "deleted") return null;
  return record;
}

export function openWorkspace(
  id: string,
  options?: { sessionId?: string | null; ticker?: string | null; now?: Date | null }
): ResearchWorkspaceRecord {
  const key = safeWorkspaceText(id, "").toLowerCase();
  const existing = workspaces.get(key);

  if (!existing || existing.status === "deleted") {
    return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);
  }

  if (existing.status === "archived") {
    return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);
  }

  let activeSessionId = existing.activeSessionId;
  if (options?.sessionId) {
    const opened = openSession(options.sessionId, options.now);
    if (opened) activeSessionId = opened.id;
  } else if (activeSessionId) {
    openSession(activeSessionId, options?.now);
  }

  if (options?.ticker) {
    persistLayout(
      key,
      { ticker: safeWorkspaceText(options.ticker, "").toUpperCase() },
      options.now
    );
  } else if (!getLayout(key)) {
    createLayout(key, { now: options?.now });
  }

  const next = normalizeWorkspaceRecord({
    ...existing,
    status: "active",
    activeSessionId,
    updatedAt: stamp(options?.now),
    lastOpenedAt: stamp(options?.now),
    empty: false,
  });

  workspaces.set(key, next);
  activeWorkspaceId = key;
  touchRecent(key);
  return next;
}

export function closeWorkspace(
  id: string,
  now?: Date | null
): ResearchWorkspaceRecord {
  const key = safeWorkspaceText(id, "").toLowerCase();
  const existing = workspaces.get(key);
  if (!existing || existing.status === "deleted") {
    return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);
  }

  const next = normalizeWorkspaceRecord({
    ...existing,
    status: "closed",
    updatedAt: stamp(now),
    empty: false,
  });
  workspaces.set(key, next);

  if (activeWorkspaceId === key) {
    activeWorkspaceId = null;
  }
  return next;
}

export function renameWorkspace(
  id: string,
  name: string,
  now?: Date | null
): ResearchWorkspaceRecord {
  const existing = getWorkspace(id);
  if (!existing) return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);

  const nextName = safeWorkspaceText(name, "");
  if (!nextName) return existing;

  const next = normalizeWorkspaceRecord({
    ...existing,
    name: nextName,
    updatedAt: stamp(now),
    empty: false,
  });
  workspaces.set(next.id, next);
  return next;
}

export function archiveWorkspace(
  id: string,
  now?: Date | null
): ResearchWorkspaceRecord {
  const existing = getWorkspace(id);
  if (!existing) return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);

  const next = normalizeWorkspaceRecord({
    ...existing,
    status: "archived",
    updatedAt: stamp(now),
    empty: false,
  });
  workspaces.set(next.id, next);

  if (activeWorkspaceId === next.id) {
    activeWorkspaceId = null;
  }
  return next;
}

export function restoreWorkspace(
  id: string,
  now?: Date | null
): ResearchWorkspaceRecord {
  const key = safeWorkspaceText(id, "").toLowerCase();
  const existing = workspaces.get(key);
  if (!existing || existing.status === "deleted") {
    return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);
  }

  const next = normalizeWorkspaceRecord({
    ...existing,
    status: "active",
    updatedAt: stamp(now),
    lastOpenedAt: stamp(now),
    empty: false,
  });
  workspaces.set(key, next);
  activeWorkspaceId = key;
  touchRecent(key);
  return next;
}

export function deleteWorkspace(id: string): boolean {
  const key = safeWorkspaceText(id, "").toLowerCase();
  const existing = workspaces.get(key);
  if (!existing) return false;

  workspaces.set(
    key,
    normalizeWorkspaceRecord({
      ...existing,
      status: "deleted",
      empty: false,
    })
  );

  if (activeWorkspaceId === key) activeWorkspaceId = null;
  recentIds = recentIds.filter((x) => x !== key);
  return true;
}

export function listWorkspaces(options?: {
  includeArchived?: boolean;
  includeDeleted?: boolean;
  activeOnly?: boolean;
}): ResearchWorkspaceRecord[] {
  return Array.from(workspaces.values())
    .filter((w) => {
      if (!options?.includeDeleted && w.status === "deleted") return false;
      if (!options?.includeArchived && w.status === "archived") return false;
      if (options?.activeOnly && w.status !== "active") return false;
      return true;
    })
    .sort((a, b) => {
      const aAt = a.lastOpenedAt ?? a.updatedAt;
      const bAt = b.lastOpenedAt ?? b.updatedAt;
      return bAt.localeCompare(aAt);
    });
}

export function getActiveWorkspace(): ResearchWorkspaceRecord | null {
  if (!activeWorkspaceId) return null;
  return getWorkspace(activeWorkspaceId);
}

export function listRecentWorkspaces(limit = 8): ResearchWorkspaceRecord[] {
  const out: ResearchWorkspaceRecord[] = [];
  for (const id of recentIds) {
    const w = getWorkspace(id);
    if (w && w.status !== "archived") out.push(w);
    if (out.length >= limit) break;
  }
  return out;
}

export function attachSession(
  workspaceId: string,
  session: ResearchSession,
  now?: Date | null
): ResearchWorkspaceRecord {
  const existing = getWorkspace(workspaceId);
  if (!existing) return emptyWorkspaceRecord(WORKSPACE_EMPTY.noWorkspace);

  const sessionIds = Array.from(
    new Set([...existing.sessionIds, session.id])
  );
  const next = normalizeWorkspaceRecord({
    ...existing,
    sessionIds,
    activeSessionId: session.id,
    updatedAt: stamp(now),
    empty: false,
  });
  workspaces.set(next.id, next);
  return next;
}

export function workspaceSessionCount(workspaceId?: string | null): number {
  return listSessions({
    workspaceId: workspaceId ?? undefined,
    includeArchived: true,
  }).length;
}

export function emptyActiveMessage(): WorkspaceEmptyMessage {
  return WORKSPACE_EMPTY.noActiveResearch;
}

export function emptyRecentMessage(): WorkspaceEmptyMessage {
  return WORKSPACE_EMPTY.noRecentSessions;
}

export function resetRegistry(): void {
  workspaces.clear();
  activeWorkspaceId = null;
  recentIds = [];
  workspaceSeq = 0;
  resetSessions();
  resetLayouts();
}

export class WorkspaceRegistry {
  createWorkspace = createWorkspace;
  openWorkspace = openWorkspace;
  closeWorkspace = closeWorkspace;
  renameWorkspace = renameWorkspace;
  archiveWorkspace = archiveWorkspace;
  restoreWorkspace = restoreWorkspace;
  deleteWorkspace = deleteWorkspace;
  listWorkspaces = listWorkspaces;
  getActiveWorkspace = getActiveWorkspace;
  listRecentWorkspaces = listRecentWorkspaces;
  reset = resetRegistry;
}
