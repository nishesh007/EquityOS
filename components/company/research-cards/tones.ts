/**
 * Research card color system — presentation tokens only.
 * Positive=Emerald · Neutral=Blue · Warning=Amber · Negative=Red
 * AI=Purple · Technical=Cyan · Valuation=Indigo · Macro=Orange · Risk=Rose
 */

export type ResearchCardTone =
  | "positive"
  | "neutral"
  | "warning"
  | "negative"
  | "ai"
  | "technical"
  | "valuation"
  | "macro"
  | "risk";

export interface ResearchCardToneTokens {
  gradient: string;
  border: string;
  icon: string;
  iconBg: string;
  glow: string;
  badge: string;
  value: string;
}

export const RESEARCH_CARD_TONES: Record<
  ResearchCardTone,
  ResearchCardToneTokens
> = {
  positive: {
    gradient:
      "bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent",
    border: "border-emerald-500/30",
    icon: "text-emerald-400",
    iconBg: "bg-emerald-500/15 ring-emerald-500/25",
    glow: "shadow-[0_0_20px_-10px_rgba(16,185,129,0.35)]",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    value: "text-emerald-300",
  },
  neutral: {
    gradient: "bg-gradient-to-br from-sky-500/20 via-sky-500/5 to-transparent",
    border: "border-sky-500/30",
    icon: "text-sky-400",
    iconBg: "bg-sky-500/15 ring-sky-500/25",
    glow: "shadow-[0_0_20px_-10px_rgba(14,165,233,0.3)]",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    value: "text-sky-300",
  },
  warning: {
    gradient:
      "bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-transparent",
    border: "border-amber-500/30",
    icon: "text-amber-400",
    iconBg: "bg-amber-500/15 ring-amber-500/25",
    glow: "shadow-[0_0_20px_-10px_rgba(245,158,11,0.3)]",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    value: "text-amber-300",
  },
  negative: {
    gradient: "bg-gradient-to-br from-red-500/20 via-red-500/5 to-transparent",
    border: "border-red-500/30",
    icon: "text-red-400",
    iconBg: "bg-red-500/15 ring-red-500/25",
    glow: "shadow-[0_0_20px_-10px_rgba(239,68,68,0.3)]",
    badge: "border-red-500/30 bg-red-500/10 text-red-400",
    value: "text-red-300",
  },
  ai: {
    gradient:
      "bg-gradient-to-br from-purple-500/20 via-purple-500/5 to-transparent",
    border: "border-purple-500/30",
    icon: "text-purple-400",
    iconBg: "bg-purple-500/15 ring-purple-500/25",
    glow: "shadow-[0_0_20px_-10px_rgba(168,85,247,0.3)]",
    badge: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    value: "text-purple-300",
  },
  technical: {
    gradient: "bg-gradient-to-br from-cyan-500/20 via-cyan-500/5 to-transparent",
    border: "border-cyan-500/30",
    icon: "text-cyan-400",
    iconBg: "bg-cyan-500/15 ring-cyan-500/25",
    glow: "shadow-[0_0_20px_-10px_rgba(6,182,212,0.3)]",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    value: "text-cyan-300",
  },
  valuation: {
    gradient:
      "bg-gradient-to-br from-indigo-500/20 via-indigo-500/5 to-transparent",
    border: "border-indigo-500/30",
    icon: "text-indigo-400",
    iconBg: "bg-indigo-500/15 ring-indigo-500/25",
    glow: "shadow-[0_0_20px_-10px_rgba(99,102,241,0.3)]",
    badge: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
    value: "text-indigo-300",
  },
  macro: {
    gradient:
      "bg-gradient-to-br from-orange-500/20 via-orange-500/5 to-transparent",
    border: "border-orange-500/30",
    icon: "text-orange-400",
    iconBg: "bg-orange-500/15 ring-orange-500/25",
    glow: "shadow-[0_0_20px_-10px_rgba(249,115,22,0.3)]",
    badge: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    value: "text-orange-300",
  },
  risk: {
    gradient: "bg-gradient-to-br from-rose-500/20 via-rose-500/5 to-transparent",
    border: "border-rose-500/30",
    icon: "text-rose-400",
    iconBg: "bg-rose-500/15 ring-rose-500/25",
    glow: "shadow-[0_0_20px_-10px_rgba(244,63,94,0.3)]",
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    value: "text-rose-300",
  },
};

/** Map numeric quality/health score → tone + verdict label. */
export function scoreToTone(score: number): {
  tone: ResearchCardTone;
  verdict: string;
} {
  if (score >= 70) return { tone: "positive", verdict: "Excellent" };
  if (score >= 55) return { tone: "neutral", verdict: "Good" };
  if (score >= 40) return { tone: "warning", verdict: "Average" };
  return { tone: "negative", verdict: "Weak" };
}

export function verdictToTone(verdict: string): ResearchCardTone {
  const v = verdict.toLowerCase();
  if (
    v.includes("under") ||
    v.includes("attractive") ||
    v.includes("bullish") ||
    v.includes("improv") ||
    v.includes("excellent") ||
    v.includes("high quality") ||
    v.includes("buy")
  ) {
    return "positive";
  }
  if (
    v.includes("over") ||
    v.includes("bearish") ||
    v.includes("deterior") ||
    v.includes("weak") ||
    v.includes("sell") ||
    (v.includes("high") && v.includes("risk"))
  ) {
    return "negative";
  }
  if (v.includes("warn") || v.includes("moderate") || v.includes("fair")) {
    return "warning";
  }
  return "neutral";
}
