/**
 * Sprint 10C — Canonical horizon colors (single source of truth).
 *
 * UI ONLY. Cards → Tables → Detailed Recommendations share this palette.
 *
 * Intraday     → #1E90FF
 * Swing        → #FF9800
 * BTST         → #00C896
 * Scalping     → #8B5CF6
 * Short Term   → #F5B700
 * Medium Term  → #22D3EE
 * Long Term    → #EF4444
 */

import type { HorizonId } from "@/lib/recommendations/horizons/types";
import type { CSSProperties } from "react";

export interface HorizonColorTheme {
  id: HorizonId;
  label: string;
  identity: string;
  /** Primary identity hex */
  hex: string;
  /** RGB channels for rgba() construction */
  rgb: string;
  /** Soft wash used for card / table gradients (10%) */
  wash: string;
  accent: string;
  border: string;
  borderGlow: string;
  chip: string;
  button: string;
  buttonHover: string;
  background: string;
  ring: string;
  progress: string;
  divider: string;
  icon: string;
  highlightRing: string;
  rail: string;
  headerUnderline: string;
  rowEven: string;
  rowHover: string;
  rowActive: string;
  hoverGlow: string;
}

export const HORIZON_COLORS: Record<HorizonId, HorizonColorTheme> = {
  intraday: {
    id: "intraday",
    label: "Intraday",
    identity: "Dodger Blue",
    hex: "#1E90FF",
    rgb: "30,144,255",
    wash: "rgba(30,144,255,0.10)",
    accent: "text-[#7EC8FF]",
    border: "border-l-[#1E90FF]",
    borderGlow:
      "border-[color:rgba(30,144,255,0.45)] shadow-[0_0_28px_-8px_rgba(30,144,255,0.55)]",
    chip: "border border-[color:rgba(30,144,255,0.45)] bg-[rgba(30,144,255,0.15)] text-[#7EC8FF]",
    button: "bg-[#1E90FF] text-white",
    buttonHover:
      "hover:brightness-110 hover:shadow-[0_0_20px_-4px_rgba(30,144,255,0.55)]",
    background:
      "bg-[linear-gradient(180deg,rgba(30,144,255,0.16)_0%,rgba(30,144,255,0.05)_45%,transparent_100%)]",
    ring: "stroke-[#1E90FF]",
    progress: "text-[#7EC8FF]",
    divider: "border-[color:rgba(30,144,255,0.40)]",
    icon: "text-[#7EC8FF]",
    highlightRing: "ring-[color:rgba(30,144,255,0.50)]",
    rail: "bg-[#1E90FF]/85",
    headerUnderline: "border-[color:rgba(30,144,255,0.60)]",
    rowEven: "bg-[rgba(30,144,255,0.06)]",
    rowHover: "hover:bg-[rgba(30,144,255,0.12)]",
    rowActive: "bg-[rgba(30,144,255,0.18)]",
    hoverGlow:
      "hover:shadow-[0_8px_22px_-12px_rgba(30,144,255,0.5)] hover:-translate-y-px",
  },
  swing: {
    id: "swing",
    label: "Swing",
    identity: "Orange",
    hex: "#FF9800",
    rgb: "255,152,0",
    wash: "rgba(255,152,0,0.10)",
    accent: "text-[#FFB84D]",
    border: "border-l-[#FF9800]",
    borderGlow:
      "border-[color:rgba(255,152,0,0.45)] shadow-[0_0_28px_-8px_rgba(255,152,0,0.55)]",
    chip: "border border-[color:rgba(255,152,0,0.45)] bg-[rgba(255,152,0,0.15)] text-[#FFB84D]",
    button: "bg-[#FF9800] text-slate-950",
    buttonHover:
      "hover:brightness-110 hover:shadow-[0_0_20px_-4px_rgba(255,152,0,0.55)]",
    background:
      "bg-[linear-gradient(180deg,rgba(255,152,0,0.16)_0%,rgba(255,152,0,0.05)_45%,transparent_100%)]",
    ring: "stroke-[#FF9800]",
    progress: "text-[#FFB84D]",
    divider: "border-[color:rgba(255,152,0,0.40)]",
    icon: "text-[#FFB84D]",
    highlightRing: "ring-[color:rgba(255,152,0,0.50)]",
    rail: "bg-[#FF9800]/85",
    headerUnderline: "border-[color:rgba(255,152,0,0.60)]",
    rowEven: "bg-[rgba(255,152,0,0.06)]",
    rowHover: "hover:bg-[rgba(255,152,0,0.12)]",
    rowActive: "bg-[rgba(255,152,0,0.18)]",
    hoverGlow:
      "hover:shadow-[0_8px_22px_-12px_rgba(255,152,0,0.5)] hover:-translate-y-px",
  },
  btst: {
    id: "btst",
    label: "BTST",
    identity: "Emerald",
    hex: "#00C896",
    rgb: "0,200,150",
    wash: "rgba(0,200,150,0.10)",
    accent: "text-[#5EE9C5]",
    border: "border-l-[#00C896]",
    borderGlow:
      "border-[color:rgba(0,200,150,0.45)] shadow-[0_0_28px_-8px_rgba(0,200,150,0.55)]",
    chip: "border border-[color:rgba(0,200,150,0.45)] bg-[rgba(0,200,150,0.15)] text-[#5EE9C5]",
    button: "bg-[#00C896] text-slate-950",
    buttonHover:
      "hover:brightness-110 hover:shadow-[0_0_20px_-4px_rgba(0,200,150,0.55)]",
    background:
      "bg-[linear-gradient(180deg,rgba(0,200,150,0.16)_0%,rgba(0,200,150,0.05)_45%,transparent_100%)]",
    ring: "stroke-[#00C896]",
    progress: "text-[#5EE9C5]",
    divider: "border-[color:rgba(0,200,150,0.40)]",
    icon: "text-[#5EE9C5]",
    highlightRing: "ring-[color:rgba(0,200,150,0.50)]",
    rail: "bg-[#00C896]/85",
    headerUnderline: "border-[color:rgba(0,200,150,0.60)]",
    rowEven: "bg-[rgba(0,200,150,0.06)]",
    rowHover: "hover:bg-[rgba(0,200,150,0.12)]",
    rowActive: "bg-[rgba(0,200,150,0.18)]",
    hoverGlow:
      "hover:shadow-[0_8px_22px_-12px_rgba(0,200,150,0.5)] hover:-translate-y-px",
  },
  scalping: {
    id: "scalping",
    label: "Scalping",
    identity: "Purple",
    hex: "#8B5CF6",
    rgb: "139,92,246",
    wash: "rgba(139,92,246,0.10)",
    accent: "text-[#C4B5FD]",
    border: "border-l-[#8B5CF6]",
    borderGlow:
      "border-[color:rgba(139,92,246,0.45)] shadow-[0_0_28px_-8px_rgba(139,92,246,0.55)]",
    chip: "border border-[color:rgba(139,92,246,0.45)] bg-[rgba(139,92,246,0.15)] text-[#C4B5FD]",
    button: "bg-[#8B5CF6] text-white",
    buttonHover:
      "hover:brightness-110 hover:shadow-[0_0_20px_-4px_rgba(139,92,246,0.55)]",
    background:
      "bg-[linear-gradient(180deg,rgba(139,92,246,0.16)_0%,rgba(139,92,246,0.05)_45%,transparent_100%)]",
    ring: "stroke-[#8B5CF6]",
    progress: "text-[#C4B5FD]",
    divider: "border-[color:rgba(139,92,246,0.40)]",
    icon: "text-[#C4B5FD]",
    highlightRing: "ring-[color:rgba(139,92,246,0.50)]",
    rail: "bg-[#8B5CF6]/85",
    headerUnderline: "border-[color:rgba(139,92,246,0.60)]",
    rowEven: "bg-[rgba(139,92,246,0.06)]",
    rowHover: "hover:bg-[rgba(139,92,246,0.12)]",
    rowActive: "bg-[rgba(139,92,246,0.18)]",
    hoverGlow:
      "hover:shadow-[0_8px_22px_-12px_rgba(139,92,246,0.5)] hover:-translate-y-px",
  },
  short_term: {
    id: "short_term",
    label: "Short Term",
    identity: "Amber",
    hex: "#F5B700",
    rgb: "245,183,0",
    wash: "rgba(245,183,0,0.10)",
    accent: "text-[#FFD54F]",
    border: "border-l-[#F5B700]",
    borderGlow:
      "border-[color:rgba(245,183,0,0.45)] shadow-[0_0_28px_-8px_rgba(245,183,0,0.55)]",
    chip: "border border-[color:rgba(245,183,0,0.45)] bg-[rgba(245,183,0,0.15)] text-[#FFD54F]",
    button: "bg-[#F5B700] text-slate-950",
    buttonHover:
      "hover:brightness-110 hover:shadow-[0_0_20px_-4px_rgba(245,183,0,0.55)]",
    background:
      "bg-[linear-gradient(180deg,rgba(245,183,0,0.16)_0%,rgba(245,183,0,0.05)_45%,transparent_100%)]",
    ring: "stroke-[#F5B700]",
    progress: "text-[#FFD54F]",
    divider: "border-[color:rgba(245,183,0,0.40)]",
    icon: "text-[#FFD54F]",
    highlightRing: "ring-[color:rgba(245,183,0,0.50)]",
    rail: "bg-[#F5B700]/85",
    headerUnderline: "border-[color:rgba(245,183,0,0.60)]",
    rowEven: "bg-[rgba(245,183,0,0.06)]",
    rowHover: "hover:bg-[rgba(245,183,0,0.12)]",
    rowActive: "bg-[rgba(245,183,0,0.18)]",
    hoverGlow:
      "hover:shadow-[0_8px_22px_-12px_rgba(245,183,0,0.5)] hover:-translate-y-px",
  },
  medium_term: {
    id: "medium_term",
    label: "Medium Term",
    identity: "Cyan",
    hex: "#22D3EE",
    rgb: "34,211,238",
    wash: "rgba(34,211,238,0.10)",
    accent: "text-[#67E8F9]",
    border: "border-l-[#22D3EE]",
    borderGlow:
      "border-[color:rgba(34,211,238,0.45)] shadow-[0_0_28px_-8px_rgba(34,211,238,0.55)]",
    chip: "border border-[color:rgba(34,211,238,0.45)] bg-[rgba(34,211,238,0.15)] text-[#67E8F9]",
    button: "bg-[#22D3EE] text-slate-950",
    buttonHover:
      "hover:brightness-110 hover:shadow-[0_0_20px_-4px_rgba(34,211,238,0.55)]",
    background:
      "bg-[linear-gradient(180deg,rgba(34,211,238,0.16)_0%,rgba(34,211,238,0.05)_45%,transparent_100%)]",
    ring: "stroke-[#22D3EE]",
    progress: "text-[#67E8F9]",
    divider: "border-[color:rgba(34,211,238,0.40)]",
    icon: "text-[#67E8F9]",
    highlightRing: "ring-[color:rgba(34,211,238,0.50)]",
    rail: "bg-[#22D3EE]/85",
    headerUnderline: "border-[color:rgba(34,211,238,0.60)]",
    rowEven: "bg-[rgba(34,211,238,0.06)]",
    rowHover: "hover:bg-[rgba(34,211,238,0.12)]",
    rowActive: "bg-[rgba(34,211,238,0.18)]",
    hoverGlow:
      "hover:shadow-[0_8px_22px_-12px_rgba(34,211,238,0.5)] hover:-translate-y-px",
  },
  long_term: {
    id: "long_term",
    label: "Long Term",
    identity: "Crimson",
    hex: "#EF4444",
    rgb: "239,68,68",
    wash: "rgba(239,68,68,0.10)",
    accent: "text-[#FCA5A5]",
    border: "border-l-[#EF4444]",
    borderGlow:
      "border-[color:rgba(239,68,68,0.45)] shadow-[0_0_28px_-8px_rgba(239,68,68,0.55)]",
    chip: "border border-[color:rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.15)] text-[#FCA5A5]",
    button: "bg-[#EF4444] text-white",
    buttonHover:
      "hover:brightness-110 hover:shadow-[0_0_20px_-4px_rgba(239,68,68,0.55)]",
    background:
      "bg-[linear-gradient(180deg,rgba(239,68,68,0.16)_0%,rgba(239,68,68,0.05)_45%,transparent_100%)]",
    ring: "stroke-[#EF4444]",
    progress: "text-[#FCA5A5]",
    divider: "border-[color:rgba(239,68,68,0.40)]",
    icon: "text-[#FCA5A5]",
    highlightRing: "ring-[color:rgba(239,68,68,0.50)]",
    rail: "bg-[#EF4444]/85",
    headerUnderline: "border-[color:rgba(239,68,68,0.60)]",
    rowEven: "bg-[rgba(239,68,68,0.06)]",
    rowHover: "hover:bg-[rgba(239,68,68,0.12)]",
    rowActive: "bg-[rgba(239,68,68,0.18)]",
    hoverGlow:
      "hover:shadow-[0_8px_22px_-12px_rgba(239,68,68,0.5)] hover:-translate-y-px",
  },
};

export function getHorizonColors(horizonId: HorizonId): HorizonColorTheme {
  return HORIZON_COLORS[horizonId];
}

/** CSS custom properties for strategy-accented surfaces (Sprint 10C). */
export function horizonAccentStyle(horizonId: HorizonId): CSSProperties {
  const theme = HORIZON_COLORS[horizonId];
  return {
    ["--strategy-accent" as string]: theme.hex,
    ["--strategy-rgb" as string]: theme.rgb,
    ["--strategy-wash" as string]: theme.wash,
  };
}

/** Card surface — deep strategy glass (Sprint 10C.2). */
export function horizonCardSurfaceStyle(horizonId: HorizonId): CSSProperties {
  const theme = HORIZON_COLORS[horizonId];
  return {
    ...horizonAccentStyle(horizonId),
    borderColor: `rgba(${theme.rgb}, 0.28)`,
    backgroundImage: `linear-gradient(180deg, rgba(${theme.rgb}, 0.18) 0%, rgba(${theme.rgb}, 0.08) 42%, transparent 100%)`,
    backgroundColor: `rgba(6, 10, 18, 0.72)`,
    boxShadow: `0 0 0 1px rgba(${theme.rgb}, 0.12) inset, 0 12px 40px -18px rgba(${theme.rgb}, 0.35), 0 8px 24px -12px rgba(0,0,0,0.55)`,
  };
}

/** Section / table shell — same identity wash as the summary card. */
export function horizonSectionSurfaceStyle(horizonId: HorizonId): CSSProperties {
  const theme = HORIZON_COLORS[horizonId];
  return {
    ...horizonAccentStyle(horizonId),
    borderColor: `rgba(${theme.rgb}, 0.38)`,
    borderTopWidth: 2,
    borderTopColor: theme.hex,
    backgroundImage: `linear-gradient(180deg, ${theme.wash} 0%, rgba(8,12,22,0.55) 140px, rgba(8,12,22,0.92) 100%)`,
    backgroundColor: "rgba(8, 12, 22, 0.92)",
  };
}
