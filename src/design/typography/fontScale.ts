/**
 * Sprint 10C.R5 — global font size preference.
 *
 * Applied as `data-font-size` on <html>; styles/globals.css adjusts the
 * root font-size, so every rem-based size in the app rescales together.
 */

export type FontScale = "small" | "medium" | "large";

export const FONT_SCALES: readonly FontScale[] = Object.freeze([
  "small",
  "medium",
  "large",
]);

export const FONT_SCALE_LABELS: Readonly<Record<FontScale, string>> =
  Object.freeze({
    small: "Small",
    medium: "Medium",
    large: "Large",
  });

/** Root font-size per scale (medium = browser default). */
export const FONT_SCALE_ROOT_PX: Readonly<Record<FontScale, number>> =
  Object.freeze({
    small: 15,
    medium: 16,
    large: 17,
  });

export const FONT_SCALE_STORAGE_KEY = "equityos.fontsize";

let activeScale: FontScale = "medium";

function applyFontScale(): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.fontSize = activeScale;
}

export function getFontScale(): FontScale {
  return activeScale;
}

export function setFontScale(scale: FontScale | string): boolean {
  if (!FONT_SCALES.includes(scale as FontScale)) return false;
  activeScale = scale as FontScale;
  applyFontScale();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, activeScale);
    } catch {
      // Storage unavailable — scale still applies for the session.
    }
  }
  return true;
}

export function hydrateFontScaleFromStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const stored = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (stored && FONT_SCALES.includes(stored as FontScale)) {
      activeScale = stored as FontScale;
    }
  } catch {
    // Storage unavailable — keep default.
  }
  applyFontScale();
}
