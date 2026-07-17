/**
 * Theme definitions for the EquityOS design system.
 *
 * A theme is a named palette plus mode metadata. All non-color tokens
 * (spacing, radius, typography, motion, z-index, breakpoints) are shared
 * across themes; only colors and elevation change per theme.
 *
 * New themes plug in by adding an entry here (or registering at runtime via
 * `registerTheme`) — no component changes required.
 */

import type { ThemeColors } from "./colorTokens";
import type { ThemeMode } from "./shadowTokens";
import { PREMIUM_THEMES } from "../themes/premiumThemes";

export interface Theme {
  /** Stable identifier, used for persistence and the data-theme attribute. */
  id: string;
  /** Human-readable name shown in settings. */
  label: string;
  /** Dark or light — drives elevation and the html class. */
  mode: ThemeMode;
  colors: ThemeColors;
}

export type BuiltInThemeId =
  | "institutional-dark"
  | "institutional-light"
  | "bloomberg"
  | "midnight-blue"
  | "graphite"
  | "emerald"
  | "trading-desk"
  | "carbon-black";

export const DEFAULT_THEME_ID: BuiltInThemeId = "institutional-dark";

const institutionalDark: Theme = Object.freeze({
  id: "institutional-dark",
  label: "Institutional Dark",
  mode: "dark",
  colors: Object.freeze({
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    accent: "#3b82f6",
    accentMuted: "#2563eb",
    success: "#22c55e",
    successMuted: "#16a34a",
    warning: "#f59e0b",
    danger: "#ef4444",
    dangerMuted: "#dc2626",
    info: "#38bdf8",
    background: "#0c0c10",
    surface: "#111116",
    card: "#16161d",
    surfaceHover: "#1a1a22",
    border: "#22222e",
    borderSubtle: "#1a1a24",
    muted: "#27272f",
    textPrimary: "#f4f4f5",
    textSecondary: "#a1a1aa",
    textMuted: "#8b8b94",
    textFaint: "#52525b",
  }),
});

const institutionalLight: Theme = Object.freeze({
  id: "institutional-light",
  label: "Institutional Light",
  mode: "light",
  colors: Object.freeze({
    primary: "#2563eb",
    secondary: "#7c3aed",
    accent: "#2563eb",
    accentMuted: "#1d4ed8",
    success: "#15803d",
    successMuted: "#166534",
    warning: "#b45309",
    danger: "#dc2626",
    dangerMuted: "#b91c1c",
    info: "#0369a1",
    background: "#f6f7f9",
    surface: "#ffffff",
    card: "#ffffff",
    surfaceHover: "#eef1f5",
    border: "#dde3ea",
    borderSubtle: "#e8edf2",
    muted: "#e2e8f0",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#5b6b80",
    textFaint: "#94a3b8",
  }),
});

const midnightBlue: Theme = Object.freeze({
  id: "midnight-blue",
  label: "Midnight Blue",
  mode: "dark",
  colors: Object.freeze({
    primary: "#60a5fa",
    secondary: "#818cf8",
    accent: "#38bdf8",
    accentMuted: "#0ea5e9",
    success: "#34d399",
    successMuted: "#10b981",
    warning: "#fbbf24",
    danger: "#f87171",
    dangerMuted: "#ef4444",
    info: "#7dd3fc",
    background: "#060b18",
    surface: "#0a1224",
    card: "#0e182e",
    surfaceHover: "#12203c",
    border: "#1c2c4a",
    borderSubtle: "#16233c",
    muted: "#1e2b46",
    textPrimary: "#e7edf7",
    textSecondary: "#9fb0cc",
    textMuted: "#8093b3",
    textFaint: "#4d5c78",
  }),
});

const graphite: Theme = Object.freeze({
  id: "graphite",
  label: "Graphite",
  mode: "dark",
  colors: Object.freeze({
    primary: "#cbd5e1",
    secondary: "#94a3b8",
    accent: "#a8b6c8",
    accentMuted: "#8494a8",
    success: "#4ade80",
    successMuted: "#22c55e",
    warning: "#fbbf24",
    danger: "#f87171",
    dangerMuted: "#ef4444",
    info: "#7dd3fc",
    background: "#101012",
    surface: "#161618",
    card: "#1b1b1e",
    surfaceHover: "#202024",
    border: "#2a2a2f",
    borderSubtle: "#222227",
    muted: "#2c2c31",
    textPrimary: "#f5f5f4",
    textSecondary: "#a9a9a7",
    textMuted: "#8d8d90",
    textFaint: "#58585a",
  }),
});

const emerald: Theme = Object.freeze({
  id: "emerald",
  label: "Emerald",
  mode: "dark",
  colors: Object.freeze({
    primary: "#10b981",
    secondary: "#2dd4bf",
    accent: "#34d399",
    accentMuted: "#10b981",
    success: "#4ade80",
    successMuted: "#22c55e",
    warning: "#fbbf24",
    danger: "#f87171",
    dangerMuted: "#ef4444",
    info: "#38bdf8",
    background: "#071410",
    surface: "#0b1a15",
    card: "#0f221b",
    surfaceHover: "#142a22",
    border: "#1e3a30",
    borderSubtle: "#182f27",
    muted: "#1f3a30",
    textPrimary: "#ecfdf5",
    textSecondary: "#a7c4b8",
    textMuted: "#84a698",
    textFaint: "#4d6c60",
  }),
});

/** Built-in theme catalog. Runtime registration extends this without edits. */
export const BUILT_IN_THEMES: readonly Theme[] = Object.freeze([
  institutionalDark,
  institutionalLight,
  midnightBlue,
  graphite,
  emerald,
  // Sprint 10C.R5 premium pack (src/design/themes/premiumThemes.ts).
  ...PREMIUM_THEMES,
]);
