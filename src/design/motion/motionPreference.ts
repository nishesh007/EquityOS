/**
 * Sprint 10C.R5 — motion preference engine.
 *
 * "system" follows prefers-reduced-motion; "full"/"reduced" force a mode.
 * Applied as `data-motion` on <html>; styles/globals.css disables
 * animations and transitions when the effective mode is reduced.
 */

export type MotionPreference = "system" | "full" | "reduced";

export const MOTION_PREFERENCES: readonly MotionPreference[] = Object.freeze([
  "system",
  "full",
  "reduced",
]);

export const MOTION_STORAGE_KEY = "equityos.motion";

let activePreference: MotionPreference = "system";

function systemPrefersReduced(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Effective mode from a preference + the OS-level setting (pure). */
export function resolveEffectiveMotion(
  preference: MotionPreference,
  prefersReduced: boolean
): "full" | "reduced" {
  if (preference === "system") return prefersReduced ? "reduced" : "full";
  return preference;
}

function applyMotion(): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.motion = resolveEffectiveMotion(
    activePreference,
    systemPrefersReduced()
  );
}

/** Public API — current motion preference. */
export function getMotionPreference(): MotionPreference {
  return activePreference;
}

/** Public API — set the motion preference. Unknown values are rejected. */
export function setMotionPreference(
  preference: MotionPreference | string
): boolean {
  if (!MOTION_PREFERENCES.includes(preference as MotionPreference)) {
    return false;
  }
  activePreference = preference as MotionPreference;
  applyMotion();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(MOTION_STORAGE_KEY, activePreference);
    } catch {
      // Storage unavailable — preference still applies for the session.
    }
  }
  return true;
}

export function hydrateMotionFromStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
    if (stored && MOTION_PREFERENCES.includes(stored as MotionPreference)) {
      activePreference = stored as MotionPreference;
    }
  } catch {
    // Storage unavailable — keep default.
  }
  applyMotion();
}
