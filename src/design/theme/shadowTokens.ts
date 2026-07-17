/**
 * Elevation (shadow) tokens for the EquityOS design system.
 * Shadows differ between dark and light modes, so they are generated
 * per theme mode and exposed as CSS variables by the ThemeEngine.
 */

export type ThemeMode = "dark" | "light";

export interface ShadowTokens {
  card: string;
  floating: string;
  overlay: string;
  popup: string;
  dropdown: string;
  glass: string;
}

export type ShadowToken = keyof ShadowTokens;

export const SHADOW_TOKEN_NAMES: readonly ShadowToken[] = Object.freeze([
  "card",
  "floating",
  "overlay",
  "popup",
  "dropdown",
  "glass",
]);

/** Build the elevation scale for a theme mode. */
export function buildShadowTokens(mode: ThemeMode): ShadowTokens {
  if (mode === "light") {
    return Object.freeze({
      card: "0 0 0 1px rgba(15, 23, 42, 0.05), 0 2px 8px rgba(15, 23, 42, 0.06)",
      floating: "0 4px 16px rgba(15, 23, 42, 0.10), 0 1px 4px rgba(15, 23, 42, 0.06)",
      overlay: "0 12px 40px rgba(15, 23, 42, 0.16)",
      popup: "0 8px 28px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.08)",
      dropdown: "0 6px 20px rgba(15, 23, 42, 0.12)",
      glass: "0 0 0 1px rgba(15, 23, 42, 0.04), 0 8px 32px rgba(15, 23, 42, 0.08)",
    });
  }
  return Object.freeze({
    card: "0 0 0 1px rgba(255, 255, 255, 0.04), 0 4px 24px rgba(0, 0, 0, 0.4)",
    floating: "0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.35)",
    overlay: "0 16px 56px rgba(0, 0, 0, 0.6)",
    popup: "0 12px 40px rgba(0, 0, 0, 0.55), 0 4px 12px rgba(0, 0, 0, 0.4)",
    dropdown: "0 8px 28px rgba(0, 0, 0, 0.5)",
    glass: "0 0 0 1px rgba(255, 255, 255, 0.05), 0 12px 40px rgba(0, 0, 0, 0.45)",
  });
}
