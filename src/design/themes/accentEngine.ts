/**
 * Sprint 10C.R5 — accent color engine.
 *
 * Framework-independent (like ThemeEngine). Tracks an optional accent
 * override, applies it as CSS variables on <html>, persists the choice and
 * re-applies after every theme switch (theme application rewrites the
 * accent variables with the theme default).
 */

import { getThemeEngine } from "../theme/ThemeEngine";
import {
  getAccentColorById,
  resolveAccentVariables,
  type AccentColor,
  type AccentColorId,
} from "./accentColors";

export const ACCENT_STORAGE_KEY = "equityos.accent";

type AccentChangeListener = (accent: AccentColor | null) => void;

interface StyleRoot {
  style: {
    setProperty(name: string, value: string): void;
    removeProperty(name: string): void;
  };
  dataset: Record<string, string | undefined>;
}

let activeAccentId: AccentColorId | null = null;
const listeners = new Set<AccentChangeListener>();
let themeSubscribed = false;

function documentRoot(): StyleRoot | null {
  if (typeof document === "undefined") return null;
  return document.documentElement as unknown as StyleRoot;
}

function applyToRoot(root: StyleRoot | null): void {
  if (!root) return;
  const accent = activeAccentId ? getAccentColorById(activeAccentId) : null;
  if (accent) {
    for (const [name, value] of Object.entries(resolveAccentVariables(accent))) {
      root.style.setProperty(name, value);
    }
    root.dataset.accent = accent.id;
  } else {
    // Theme defaults win again: re-apply the active theme's variables.
    delete root.dataset.accent;
    getThemeEngine().applyToDocument();
  }
}

/** Keep the override alive across theme switches. */
function ensureThemeSubscription(): void {
  if (themeSubscribed) return;
  themeSubscribed = true;
  getThemeEngine().subscribe(() => {
    if (activeAccentId) applyToRoot(documentRoot());
  });
}

/** Public API — active accent override (null = theme default). */
export function getAccentColor(): AccentColor | null {
  return activeAccentId ? getAccentColorById(activeAccentId) : null;
}

/**
 * Public API — set (or clear with null) the accent override.
 * Returns false for unknown accent ids.
 */
export function setAccentColor(
  accentId: AccentColorId | string | null
): boolean {
  if (accentId !== null && !getAccentColorById(accentId)) return false;
  ensureThemeSubscription();
  activeAccentId = (accentId as AccentColorId) ?? null;
  applyToRoot(documentRoot());
  persistAccent();
  const accent = getAccentColor();
  for (const listener of listeners) listener(accent);
  return true;
}

export function subscribeAccent(listener: AccentChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Restore the persisted accent, if any. No-op during SSR. */
export function hydrateAccentFromStorage(): void {
  if (typeof window === "undefined") return;
  ensureThemeSubscription();
  try {
    const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    if (stored && getAccentColorById(stored)) {
      activeAccentId = stored as AccentColorId;
    }
  } catch {
    // Storage unavailable — keep the theme default.
  }
  if (activeAccentId) applyToRoot(documentRoot());
}

function persistAccent(): void {
  if (typeof window === "undefined") return;
  try {
    if (activeAccentId) {
      window.localStorage.setItem(ACCENT_STORAGE_KEY, activeAccentId);
    } else {
      window.localStorage.removeItem(ACCENT_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable — accent still applies for the session.
  }
}

/** Test hook — reset module state without touching the DOM. */
export function resetAccentForTests(): void {
  activeAccentId = null;
  listeners.clear();
}
