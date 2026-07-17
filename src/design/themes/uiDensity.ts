/**
 * Sprint 10C.R5 — global UI density preference.
 *
 * Presentation-only default for the terminal: applied as a `data-density`
 * attribute on <html> (CSS hooks) and consumed as the default table
 * density. Individual tables can still override per-table.
 */

export type UiDensity = "comfortable" | "compact" | "ultra";

export const UI_DENSITIES: readonly UiDensity[] = Object.freeze([
  "comfortable",
  "compact",
  "ultra",
]);

export const DENSITY_STORAGE_KEY = "equityos.density";

let activeDensity: UiDensity = "comfortable";

function applyDensity(): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.density = activeDensity;
}

export function getUiDensity(): UiDensity {
  return activeDensity;
}

export function setUiDensity(density: UiDensity | string): boolean {
  if (!UI_DENSITIES.includes(density as UiDensity)) return false;
  activeDensity = density as UiDensity;
  applyDensity();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, activeDensity);
    } catch {
      // Storage unavailable — density still applies for the session.
    }
  }
  return true;
}

export function hydrateDensityFromStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    if (stored && UI_DENSITIES.includes(stored as UiDensity)) {
      activeDensity = stored as UiDensity;
    }
  } catch {
    // Storage unavailable — keep default.
  }
  applyDensity();
}
