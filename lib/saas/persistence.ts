/**
 * Local persistence for SaaS platform state — Sprint 12A.
 * Falls back to in-memory store when `window` is unavailable (SSR / Vitest).
 */

import type { SaasPersistedState } from "./types";
import { SAAS_STORAGE_KEY } from "./types";

let memoryState: SaasPersistedState | null = null;

export function emptyState(): SaasPersistedState {
  return {
    version: 1,
    users: [],
    sessions: [],
    devices: [],
    loginHistory: [],
    licenses: [],
    subscriptions: [],
    activeSessionId: null,
  };
}

export function resetMemoryState(): void {
  memoryState = emptyState();
}

export function loadState(): SaasPersistedState {
  if (typeof window === "undefined") {
    return memoryState ?? emptyState();
  }
  try {
    const raw = window.localStorage.getItem(SAAS_STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<SaasPersistedState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.users)) return emptyState();
    return {
      ...emptyState(),
      ...parsed,
      users: parsed.users ?? [],
      sessions: parsed.sessions ?? [],
      devices: parsed.devices ?? [],
      loginHistory: parsed.loginHistory ?? [],
      licenses: parsed.licenses ?? [],
      subscriptions: parsed.subscriptions ?? [],
      activeSessionId: parsed.activeSessionId ?? null,
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state: SaasPersistedState): { ok: boolean; error?: string } {
  memoryState = state;
  if (typeof window === "undefined") return { ok: true };
  try {
    window.localStorage.setItem(SAAS_STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to persist account data." };
  }
}

export function setSessionCookie(sessionId: string | null, maxAgeSec: number): void {
  if (typeof document === "undefined") return;
  if (!sessionId) {
    document.cookie = `equityos_session=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `equityos_session=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`;
}
