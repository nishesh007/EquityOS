import type { WalkForwardSession } from "./types";

export const WFV_SESSIONS_KEY = "equityos.research.optimization.wfv.sessions.v1";

interface Payload {
  version: 1;
  sessions: WalkForwardSession[];
}

export function loadWalkForwardSessions(): WalkForwardSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WFV_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Payload>;
    return Array.isArray(parsed.sessions) ? parsed.sessions.slice(0, 30) : [];
  } catch {
    return [];
  }
}

export function saveWalkForwardSessions(sessions: WalkForwardSession[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Payload = {
      version: 1,
      sessions: sessions.slice(0, 30),
    };
    window.localStorage.setItem(WFV_SESSIONS_KEY, JSON.stringify(payload));
  } catch {
    // quota
  }
}

export function upsertWalkForwardSession(
  sessions: WalkForwardSession[],
  session: WalkForwardSession
): WalkForwardSession[] {
  const idx = sessions.findIndex((s) => s.id === session.id);
  const next =
    idx >= 0
      ? sessions.map((s, i) => (i === idx ? session : s))
      : [session, ...sessions];
  saveWalkForwardSessions(next);
  return next;
}
