/**
 * Sprint 10C.R5 — premium theme pack.
 *
 * Bloomberg, Trading Desk and Carbon Black extend the built-in catalog.
 * Palettes are tuned to pass the design-system AA contrast tests:
 * text ≥ 4.5:1 on background/surface/card, status colors ≥ 3:1.
 */

import type { Theme } from "../theme/themeTokens";

/** Amber-on-black terminal, inspired by the classic Bloomberg keyboard. */
export const bloomberg: Theme = Object.freeze({
  id: "bloomberg",
  label: "Bloomberg",
  mode: "dark",
  colors: Object.freeze({
    primary: "#fb923c",
    secondary: "#eab308",
    accent: "#fb923c",
    accentMuted: "#f97316",
    success: "#4ade80",
    successMuted: "#22c55e",
    warning: "#fbbf24",
    danger: "#f87171",
    dangerMuted: "#ef4444",
    info: "#7dd3fc",
    background: "#0b0a07",
    surface: "#12100b",
    card: "#171410",
    surfaceHover: "#1d1a14",
    border: "#2b2620",
    borderSubtle: "#221e18",
    muted: "#2d2822",
    textPrimary: "#f7f3e8",
    textSecondary: "#b8b09b",
    textMuted: "#9a927e",
    textFaint: "#5c564a",
  }),
});

/** Cool slate with a teal working accent — multi-monitor desk feel. */
export const tradingDesk: Theme = Object.freeze({
  id: "trading-desk",
  label: "Trading Desk",
  mode: "dark",
  colors: Object.freeze({
    primary: "#2dd4bf",
    secondary: "#60a5fa",
    accent: "#2dd4bf",
    accentMuted: "#14b8a6",
    success: "#4ade80",
    successMuted: "#22c55e",
    warning: "#fbbf24",
    danger: "#f87171",
    dangerMuted: "#ef4444",
    info: "#7dd3fc",
    background: "#0b0e11",
    surface: "#10151a",
    card: "#151b21",
    surfaceHover: "#1a222a",
    border: "#28323c",
    borderSubtle: "#202932",
    muted: "#28323a",
    textPrimary: "#eef2f5",
    textSecondary: "#a7b4bf",
    textMuted: "#8b99a4",
    textFaint: "#55626d",
  }),
});

/** True-black OLED theme with silver accents. */
export const carbonBlack: Theme = Object.freeze({
  id: "carbon-black",
  label: "Carbon Black",
  mode: "dark",
  colors: Object.freeze({
    primary: "#d4d4d8",
    secondary: "#a1a1aa",
    accent: "#d4d4d8",
    accentMuted: "#a1a1aa",
    success: "#4ade80",
    successMuted: "#22c55e",
    warning: "#fbbf24",
    danger: "#f87171",
    dangerMuted: "#ef4444",
    info: "#7dd3fc",
    background: "#000000",
    surface: "#0a0a0a",
    card: "#101010",
    surfaceHover: "#161616",
    border: "#262626",
    borderSubtle: "#1c1c1c",
    muted: "#262626",
    textPrimary: "#fafafa",
    textSecondary: "#a6a6ad",
    textMuted: "#8f8f97",
    textFaint: "#55555c",
  }),
});

export const PREMIUM_THEMES: readonly Theme[] = Object.freeze([
  bloomberg,
  tradingDesk,
  carbonBlack,
]);
