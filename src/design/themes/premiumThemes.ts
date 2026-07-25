/**
 * Sprint 10C.R5 — premium theme pack.
 *
 * Bloomberg, Trading Desk, Carbon Black plus Sprint 10C research / Nord / Cyber Neon.
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

/** Soft off-white annual-report research desk. */
export const paperResearch: Theme = Object.freeze({
  id: "paper-research",
  label: "Paper Research",
  mode: "light",
  colors: Object.freeze({
    primary: "#334155",
    secondary: "#64748b",
    accent: "#1e3a5f",
    accentMuted: "#334155",
    success: "#15803d",
    successMuted: "#166534",
    warning: "#b45309",
    danger: "#b91c1c",
    dangerMuted: "#991b1b",
    info: "#0369a1",
    background: "#f7f7f5",
    surface: "#f0f0ed",
    card: "#e8e8e4",
    surfaceHover: "#deded9",
    border: "#cfcfc8",
    borderSubtle: "#e0e0da",
    muted: "#d6d6d0",
    textPrimary: "#1c1917",
    textSecondary: "#44403c",
    textMuted: "#57534e",
    textFaint: "#a8a29e",
  }),
});

/** Warm cream printed research paper. */
export const sepiaResearch: Theme = Object.freeze({
  id: "sepia-research",
  label: "Sepia Research",
  mode: "light",
  colors: Object.freeze({
    primary: "#78350f",
    secondary: "#92400e",
    accent: "#9a3412",
    accentMuted: "#7c2d12",
    success: "#3f6212",
    successMuted: "#365314",
    warning: "#a16207",
    danger: "#9f1239",
    dangerMuted: "#881337",
    info: "#1e40af",
    background: "#f5efe3",
    surface: "#efe6d6",
    card: "#e8dcc8",
    surfaceHover: "#dfd1b8",
    border: "#d4c4a8",
    borderSubtle: "#e4d8c0",
    muted: "#d9cbb0",
    textPrimary: "#3b2f1e",
    textSecondary: "#5c4a32",
    textMuted: "#7a6344",
    textFaint: "#a89070",
  }),
});

/** Cool gray-blue professional minimalist. */
export const nord: Theme = Object.freeze({
  id: "nord",
  label: "Nord",
  mode: "dark",
  colors: Object.freeze({
    primary: "#88c0d0",
    secondary: "#81a1c1",
    accent: "#8fbcbb",
    accentMuted: "#5e81ac",
    success: "#a3be8c",
    successMuted: "#8faf73",
    warning: "#ebcb8b",
    danger: "#bf616a",
    dangerMuted: "#a34e56",
    info: "#88c0d0",
    background: "#2e3440",
    surface: "#3b4252",
    card: "#434c5e",
    surfaceHover: "#4c566a",
    border: "#4c566a",
    borderSubtle: "#3b4252",
    muted: "#4c566a",
    textPrimary: "#eceff4",
    textSecondary: "#d8dee9",
    textMuted: "#aeb6c4",
    textFaint: "#7b8496",
  }),
});

/** Dark charcoal futuristic trading terminal. */
export const cyberNeon: Theme = Object.freeze({
  id: "cyber-neon",
  label: "Cyber Neon",
  mode: "dark",
  colors: Object.freeze({
    primary: "#22d3ee",
    secondary: "#a78bfa",
    accent: "#22d3ee",
    accentMuted: "#06b6d4",
    success: "#34d399",
    successMuted: "#10b981",
    warning: "#fbbf24",
    danger: "#fb7185",
    dangerMuted: "#f43f5e",
    info: "#c084fc",
    background: "#0c0c12",
    surface: "#12121a",
    card: "#181824",
    surfaceHover: "#222232",
    border: "#2e2e44",
    borderSubtle: "#222233",
    muted: "#2a2a3c",
    textPrimary: "#e8f7ff",
    textSecondary: "#a8b8d0",
    textMuted: "#8494b0",
    textFaint: "#556078",
  }),
});

export const PREMIUM_THEMES: readonly Theme[] = Object.freeze([
  bloomberg,
  tradingDesk,
  carbonBlack,
  paperResearch,
  sepiaResearch,
  nord,
  cyberNeon,
]);
