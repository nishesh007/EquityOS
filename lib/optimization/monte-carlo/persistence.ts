import type { MonteCarloSession } from "./types";

export const MC_SESSIONS_KEY = "equityos.research.optimization.mc.sessions.v1";

interface Payload {
  version: 1;
  sessions: MonteCarloSession[];
}

export function loadMonteCarloSessions(): MonteCarloSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MC_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Payload>;
    return Array.isArray(parsed.sessions) ? parsed.sessions.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function saveMonteCarloSessions(sessions: MonteCarloSession[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = sessions.slice(0, 20).map((s) => ({
      ...s,
      results: s.results.slice(0, 200),
    }));
    const payload: Payload = { version: 1, sessions: trimmed };
    window.localStorage.setItem(MC_SESSIONS_KEY, JSON.stringify(payload));
  } catch {
    // quota
  }
}

export function upsertMonteCarloSession(
  sessions: MonteCarloSession[],
  session: MonteCarloSession
): MonteCarloSession[] {
  const idx = sessions.findIndex((s) => s.id === session.id);
  const next =
    idx >= 0
      ? sessions.map((s, i) => (i === idx ? session : s))
      : [session, ...sessions];
  saveMonteCarloSessions(next);
  return next;
}
