/**
 * Sprint 10C.R10 — presentation-only conviction gating and trade-plan
 * display helpers for the AI Opportunities module.
 *
 * Reads existing engine outputs (conviction scores, trade levels,
 * recommendation metadata) and maps them to institutional display tiers.
 * Never recomputes scores, targets, or reasoning.
 */

import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

export const EXECUTABLE_CONVICTION_MINIMUM = 75;
export const WATCHLIST_CONVICTION_MINIMUM = 60;
export const HIGH_CONVICTION_MINIMUM = 85;

export type ConvictionTierId =
  | "ignore"
  | "watchlist"
  | "trade_setup"
  | "high_conviction";

export interface ConvictionTier {
  id: ConvictionTierId;
  label: string;
  /** Only executable tiers may render inside active trade tables. */
  executable: boolean;
}

const TIERS: Record<ConvictionTierId, ConvictionTier> = {
  ignore: { id: "ignore", label: "IGNORE", executable: false },
  watchlist: { id: "watchlist", label: "WATCHLIST", executable: false },
  trade_setup: { id: "trade_setup", label: "TRADE SETUP", executable: true },
  high_conviction: {
    id: "high_conviction",
    label: "HIGH CONVICTION",
    executable: true,
  },
};

export function resolveConvictionTier(score: number): ConvictionTier {
  if (score >= HIGH_CONVICTION_MINIMUM) return TIERS.high_conviction;
  if (score >= EXECUTABLE_CONVICTION_MINIMUM) return TIERS.trade_setup;
  if (score >= WATCHLIST_CONVICTION_MINIMUM) return TIERS.watchlist;
  return TIERS.ignore;
}

export interface ConvictionGateResult {
  /** Score ≥ 75 — the only candidates allowed in active trade tables. */
  executable: OpportunityCandidate[];
  /** Score 60–74 — watchlist candidates, never shown as executable trades. */
  watchlist: OpportunityCandidate[];
}

export function partitionByConvictionGate(
  candidates: OpportunityCandidate[]
): ConvictionGateResult {
  const executable: OpportunityCandidate[] = [];
  const watchlist: OpportunityCandidate[] = [];
  for (const candidate of candidates) {
    const tier = resolveConvictionTier(candidate.aiConvictionScore);
    if (tier.executable) executable.push(candidate);
    else if (tier.id === "watchlist") watchlist.push(candidate);
  }
  return { executable, watchlist };
}

export const CONVICTION_GATE_EMPTY_MESSAGE =
  "No institutional-grade opportunities currently meet the minimum conviction threshold. The scanner will automatically re-evaluate every 15 minutes.";

export interface TargetTimeEstimates {
  target1: string;
  target2: string;
  finalTarget: string;
}

/**
 * Relative achievement windows subdividing the engine's own per-category
 * lifecycle horizon (see buildTradeLevels timeHorizon). Never calendar dates.
 */
const TARGET_WINDOWS: Record<
  OpportunityCandidate["category"],
  TargetTimeEstimates
> = {
  intraday: {
    target1: "30–90 Minutes",
    target2: "2–4 Hours",
    finalTarget: "By Market Close",
  },
  swing: {
    target1: "5–8 Trading Days",
    target2: "10–15 Trading Days",
    finalTarget: "15–20 Trading Days",
  },
  breakout: {
    target1: "2–4 Weeks",
    target2: "1–2 Months",
    finalTarget: "1–3 Months",
  },
  momentum: {
    target1: "1–3 Months",
    target2: "3–6 Months",
    finalTarget: "6–12 Months",
  },
  relative_volume: {
    target1: "Same Session",
    target2: "1–2 Trading Days",
    finalTarget: "1–3 Trading Days",
  },
  mean_reversion: {
    target1: "2–4 Weeks",
    target2: "1–2 Months",
    finalTarget: "1–3 Months",
  },
  ai_high_conviction: {
    target1: "3–6 Months",
    target2: "6–12 Months",
    finalTarget: "12+ Months",
  },
};

export function resolveTargetTimeEstimates(
  candidate: Pick<OpportunityCandidate, "category">
): TargetTimeEstimates {
  return TARGET_WINDOWS[candidate.category] ?? TARGET_WINDOWS.swing;
}

/**
 * Optional final target — surfaced only when an existing engine already
 * published one on the scan metrics. Never derived here.
 */
export function resolveFinalTarget(
  candidate: Pick<OpportunityCandidate, "scanMetrics">
): number | null {
  const metrics = candidate.scanMetrics;
  if (!metrics) return null;
  for (const key of ["target3", "final_target", "target_final"]) {
    const value = metrics[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return null;
}
