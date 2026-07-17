/**
 * Sprint 10C.R5 — accent color catalog.
 *
 * An accent override replaces the theme's accent/primary CSS variables so
 * buttons, links, charts, badges, gauges, selection states and focus rings
 * (which all resolve through `--eos-color-accent`) recolor automatically.
 */

import { hexToRgbTriplet } from "../theme/colorTokens";

export type AccentColorId =
  | "blue"
  | "emerald"
  | "purple"
  | "amber"
  | "cyan"
  | "red";

export interface AccentColor {
  id: AccentColorId;
  label: string;
  accent: string;
  accentMuted: string;
}

export const ACCENT_COLORS: readonly AccentColor[] = Object.freeze([
  { id: "blue", label: "Blue", accent: "#3b82f6", accentMuted: "#2563eb" },
  { id: "emerald", label: "Emerald", accent: "#34d399", accentMuted: "#10b981" },
  { id: "purple", label: "Purple", accent: "#a78bfa", accentMuted: "#8b5cf6" },
  { id: "amber", label: "Amber", accent: "#fbbf24", accentMuted: "#f59e0b" },
  { id: "cyan", label: "Cyan", accent: "#22d3ee", accentMuted: "#06b6d4" },
  { id: "red", label: "Red", accent: "#f87171", accentMuted: "#ef4444" },
]);

export function getAccentColorById(id: string): AccentColor | null {
  return ACCENT_COLORS.find((accent) => accent.id === id) ?? null;
}

/** CSS variable overrides for an accent (RGB triplets, Tailwind-ready). */
export function resolveAccentVariables(
  accent: AccentColor
): Record<string, string> {
  return {
    "--eos-color-accent": hexToRgbTriplet(accent.accent),
    "--eos-color-accent-muted": hexToRgbTriplet(accent.accentMuted),
    "--eos-color-primary": hexToRgbTriplet(accent.accent),
  };
}
