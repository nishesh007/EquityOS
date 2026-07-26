import type { OptimizationResult, OptimizationSession } from "./types";

export const SESSIONS_STORAGE_KEY =
  "equityos.research.optimization.sessions.v1";

interface SessionsPayload {
  version: 1;
  sessions: OptimizationSession[];
}

function createId(): string {
  return `opt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSessionId(): string {
  return createId();
}

export function loadSessions(): OptimizationSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<SessionsPayload>;
    if (!Array.isArray(parsed.sessions)) return [];
    return parsed.sessions.map(sanitizeSession);
  } catch {
    return [];
  }
}

export function saveSessions(sessions: OptimizationSession[]): void {
  if (typeof window === "undefined") return;
  try {
    // Cap history to avoid quota issues.
    const trimmed = sessions.slice(0, 40).map((s) => ({
      ...s,
      // Persist top results only for storage budget.
      results: s.results.slice(0, 100),
    }));
    const payload: SessionsPayload = { version: 1, sessions: trimmed };
    window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode.
  }
}

function sanitizeSession(raw: OptimizationSession): OptimizationSession {
  return {
    ...raw,
    results: Array.isArray(raw.results) ? raw.results : [],
    completedAt: raw.completedAt ?? null,
    topScore: raw.topScore ?? null,
    progress: raw.progress ?? {
      status: raw.status,
      currentIndex: 0,
      totalCombinations: raw.combinationCount,
      remaining: raw.combinationCount,
      percent: raw.status === "Completed" ? 100 : 0,
      evaluationsPerSecond: 0,
      estimatedSecondsRemaining: 0,
      currentCombinationLabel: "",
      memoryEstimateMb: 0,
      cpuEstimate: "—",
    },
  };
}

export function upsertSession(
  sessions: OptimizationSession[],
  session: OptimizationSession
): OptimizationSession[] {
  const idx = sessions.findIndex((s) => s.id === session.id);
  const next =
    idx >= 0
      ? sessions.map((s, i) => (i === idx ? session : s))
      : [session, ...sessions];
  saveSessions(next);
  return next;
}

export function deleteSession(
  sessions: OptimizationSession[],
  id: string
): OptimizationSession[] {
  const next = sessions.filter((s) => s.id !== id);
  saveSessions(next);
  return next;
}

export function duplicateSession(
  sessions: OptimizationSession[],
  id: string
): { sessions: OptimizationSession[]; session?: OptimizationSession } {
  const source = sessions.find((s) => s.id === id);
  if (!source) return { sessions };
  const now = new Date().toISOString();
  const session: OptimizationSession = {
    ...source,
    id: createId(),
    createdAt: now,
    completedAt: null,
    status: "Pending",
    topScore: null,
    evaluatedCount: 0,
    results: [],
    progress: {
      ...source.progress,
      status: "Pending",
      currentIndex: 0,
      remaining: source.combinationCount,
      percent: 0,
      evaluationsPerSecond: 0,
      estimatedSecondsRemaining: 0,
      currentCombinationLabel: "Queued",
      message: "Duplicated session — ready to run.",
    },
  };
  const next = [session, ...sessions];
  saveSessions(next);
  return { sessions: next, session };
}

export function sessionDurationMs(session: OptimizationSession): number | null {
  if (!session.completedAt) return null;
  return (
    new Date(session.completedAt).getTime() -
    new Date(session.createdAt).getTime()
  );
}

export function topResults(
  results: readonly OptimizationResult[],
  limit: number
): OptimizationResult[] {
  return results.slice(0, limit);
}
