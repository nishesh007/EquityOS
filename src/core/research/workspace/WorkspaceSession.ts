/**
 * Institutional Research Workspace — session lifecycle (Sprint 10A.R1).
 * Open, close, duplicate, pin, favorite, rename, archive, restore, delete.
 */

import {
  WORKSPACE_EMPTY,
  safeWorkspaceText,
  type WorkspaceEmptyMessage,
} from "./WorkspaceModels";
import type { SessionStatus } from "./WorkspaceModels";

export interface ResearchSession {
  id: string;
  workspaceId: string;
  name: string;
  ticker: string | null;
  status: SessionStatus;
  pinned: boolean;
  favorite: boolean;
  researchCount: number;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string | null;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface CreateSessionInput {
  id?: string | null;
  workspaceId: string;
  name?: string | null;
  ticker?: string | null;
  now?: Date | null;
}

const sessions = new Map<string, ResearchSession>();
let sessionSeq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

export function emptySession(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noActiveResearch
): ResearchSession {
  return {
    id: "",
    workspaceId: "",
    name: message,
    ticker: null,
    status: "closed",
    pinned: false,
    favorite: false,
    researchCount: 0,
    createdAt: "—",
    updatedAt: "—",
    lastActiveAt: null,
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeSession(
  input?: Partial<ResearchSession> | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noActiveResearch
): ResearchSession {
  if (!input) return emptySession(message);
  const id = safeWorkspaceText(input.id, "").toLowerCase();
  const empty = !id || Boolean(input.empty);
  return {
    id,
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    name: empty && !id ? message : safeWorkspaceText(input.name, message),
    ticker: input.ticker
      ? safeWorkspaceText(input.ticker, "").toUpperCase()
      : null,
    status: normalizeStatus(input.status),
    pinned: Boolean(input.pinned),
    favorite: Boolean(input.favorite),
    researchCount: Math.max(0, Math.floor(Number(input.researchCount) || 0)),
    createdAt: safeWorkspaceText(input.createdAt, "—"),
    updatedAt: safeWorkspaceText(input.updatedAt, "—"),
    lastActiveAt: input.lastActiveAt
      ? safeWorkspaceText(input.lastActiveAt, "—")
      : null,
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as WorkspaceEmptyMessage) ||
        message
      : WORKSPACE_EMPTY.awaitingResearch,
  };
}

export function createSession(input: CreateSessionInput): ResearchSession {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  if (!workspaceId) return emptySession(WORKSPACE_EMPTY.noWorkspace);

  sessionSeq += 1;
  const id = safeWorkspaceText(
    input.id,
    `session-${sessionSeq}-${Date.now()}`
  ).toLowerCase();
  const now = stamp(input.now);
  const ticker = input.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;
  const name = safeWorkspaceText(
    input.name,
    ticker ? `Research · ${ticker}` : `Session ${sessionSeq}`
  );

  const session = normalizeSession({
    id,
    workspaceId,
    name,
    ticker,
    status: "open",
    pinned: false,
    favorite: false,
    researchCount: 0,
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
    empty: false,
  });

  sessions.set(id, session);
  return session;
}

export function getSession(id: string): ResearchSession | null {
  const key = safeWorkspaceText(id, "").toLowerCase();
  if (!key) return null;
  const session = sessions.get(key);
  if (!session || session.status === "deleted") return null;
  return session;
}

export function openSession(
  id: string,
  now?: Date | null
): ResearchSession | null {
  const session = getSession(id);
  if (!session) return null;
  if (session.status === "archived") return null;

  const next = normalizeSession({
    ...session,
    status: "open",
    updatedAt: stamp(now),
    lastActiveAt: stamp(now),
    empty: false,
  });
  sessions.set(next.id, next);
  return next;
}

export function closeSession(
  id: string,
  now?: Date | null
): ResearchSession | null {
  const session = getSession(id);
  if (!session) return null;

  const next = normalizeSession({
    ...session,
    status: "closed",
    updatedAt: stamp(now),
    empty: false,
  });
  sessions.set(next.id, next);
  return next;
}

export function duplicateSession(
  id: string,
  now?: Date | null
): ResearchSession | null {
  const session = getSession(id);
  if (!session) return null;

  return createSession({
    workspaceId: session.workspaceId,
    name: `${session.name} (copy)`,
    ticker: session.ticker,
    now,
  });
}

export function pinSession(
  id: string,
  pinned = true,
  now?: Date | null
): ResearchSession | null {
  return patchSession(id, { pinned: Boolean(pinned) }, now);
}

export function favoriteSession(
  id: string,
  favorite = true,
  now?: Date | null
): ResearchSession | null {
  return patchSession(id, { favorite: Boolean(favorite) }, now);
}

export function renameSession(
  id: string,
  name: string,
  now?: Date | null
): ResearchSession | null {
  const nextName = safeWorkspaceText(name, "");
  if (!nextName) return getSession(id);
  return patchSession(id, { name: nextName }, now);
}

export function archiveSession(
  id: string,
  now?: Date | null
): ResearchSession | null {
  return patchSession(id, { status: "archived" }, now);
}

export function restoreSession(
  id: string,
  now?: Date | null
): ResearchSession | null {
  const key = safeWorkspaceText(id, "").toLowerCase();
  const session = sessions.get(key);
  if (!session || session.status === "deleted") return null;

  const next = normalizeSession({
    ...session,
    status: "open",
    updatedAt: stamp(now),
    lastActiveAt: stamp(now),
    empty: false,
  });
  sessions.set(next.id, next);
  return next;
}

export function deleteSession(id: string): boolean {
  const key = safeWorkspaceText(id, "").toLowerCase();
  const session = sessions.get(key);
  if (!session) return false;
  sessions.set(key, normalizeSession({ ...session, status: "deleted", empty: false }));
  return true;
}

export function listSessions(options?: {
  workspaceId?: string | null;
  includeArchived?: boolean;
  includeDeleted?: boolean;
  pinnedOnly?: boolean;
  favoriteOnly?: boolean;
  openOnly?: boolean;
}): ResearchSession[] {
  const workspaceId = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;

  return Array.from(sessions.values())
    .filter((s) => {
      if (workspaceId && s.workspaceId !== workspaceId) return false;
      if (!options?.includeDeleted && s.status === "deleted") return false;
      if (!options?.includeArchived && s.status === "archived") return false;
      if (options?.pinnedOnly && !s.pinned) return false;
      if (options?.favoriteOnly && !s.favorite) return false;
      if (options?.openOnly && s.status !== "open") return false;
      return true;
    })
    .sort((a, b) => {
      const aAt = a.lastActiveAt ?? a.updatedAt;
      const bAt = b.lastActiveAt ?? b.updatedAt;
      return bAt.localeCompare(aAt);
    });
}

export function incrementResearchCount(
  id: string,
  by = 1,
  now?: Date | null
): ResearchSession | null {
  const session = getSession(id);
  if (!session) return null;
  return patchSession(
    id,
    {
      researchCount: session.researchCount + Math.max(0, Math.floor(by)),
      lastActiveAt: stamp(now),
    },
    now
  );
}

export function resetSessions(): void {
  sessions.clear();
  sessionSeq = 0;
}

function patchSession(
  id: string,
  patch: Partial<ResearchSession>,
  now?: Date | null
): ResearchSession | null {
  const session = getSession(id);
  if (!session) {
    const archived = sessions.get(safeWorkspaceText(id, "").toLowerCase());
    if (!archived || archived.status === "deleted") return null;
    if (patch.status === "open" || patch.status === "closed") {
      // allow restore path via restoreSession only
    }
    return null;
  }

  const next = normalizeSession({
    ...session,
    ...patch,
    id: session.id,
    workspaceId: session.workspaceId,
    updatedAt: stamp(now),
    empty: false,
  });
  sessions.set(next.id, next);
  return next;
}

function normalizeStatus(value?: string | null): SessionStatus {
  const text = safeWorkspaceText(value, "closed");
  if (
    text === "open" ||
    text === "closed" ||
    text === "archived" ||
    text === "deleted"
  ) {
    return text;
  }
  return "closed";
}

export class WorkspaceSessionEngine {
  createSession = createSession;
  getSession = getSession;
  openSession = openSession;
  closeSession = closeSession;
  duplicateSession = duplicateSession;
  pinSession = pinSession;
  favoriteSession = favoriteSession;
  renameSession = renameSession;
  archiveSession = archiveSession;
  restoreSession = restoreSession;
  deleteSession = deleteSession;
  listSessions = listSessions;
  reset = resetSessions;
}
