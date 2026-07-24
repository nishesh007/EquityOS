/**
 * Sprint 9A.1 — Institutional Opportunity Dashboard ranking.
 *
 * Pure projection over the master Opportunity Engine pool from a single scan.
 * Never starts a market scan, never duplicates Recommendation / Conviction logic.
 * Every strategy reuses the same persisted OE state categories.
 */

import { HIGH_CONVICTION_MINIMUM } from "@/lib/opportunity-engine/recommendation-display";
import type {
  OpportunityCandidate,
  OpportunityCategory,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import {
  planInstitutionalEntry,
  planInstitutionalEntryFromRecommendation,
} from "@/lib/recommendations/institutional-entry";
import {
  buildFallbackRecommendation,
  buildSharedRecommendation,
  type SharedMarketSnapshot,
  type SharedRecommendation,
} from "@/lib/recommendations/shared-recommendation";

export type InstitutionalStrategyId =
  | "intraday"
  | "swing"
  | "btst"
  | "scalping"
  | "short_term"
  | "medium_term"
  | "long_term";

export const INSTITUTIONAL_STRATEGY_IDS: readonly InstitutionalStrategyId[] =
  Object.freeze([
    "intraday",
    "swing",
    "btst",
    "scalping",
    "short_term",
    "medium_term",
    "long_term",
  ]);

export const INSTITUTIONAL_STRATEGY_META: Record<
  InstitutionalStrategyId,
  {
    label: string;
    emoji: string;
    href: string;
  }
> = {
  intraday: {
    label: "Intraday",
    emoji: "⚡",
    href: "/ai?strategy=intraday",
  },
  swing: {
    label: "Swing",
    emoji: "📈",
    href: "/ai?strategy=swing",
  },
  btst: {
    label: "BTST",
    emoji: "🌙",
    href: "/ai?strategy=btst",
  },
  scalping: {
    label: "Scalping",
    emoji: "🎯",
    href: "/ai?strategy=scalping",
  },
  short_term: {
    label: "Short Term",
    emoji: "⏳",
    href: "/ai?strategy=short_term",
  },
  medium_term: {
    label: "Medium Term",
    emoji: "🚀",
    href: "/ai?strategy=medium_term",
  },
  long_term: {
    label: "Long Term",
    emoji: "🏆",
    href: "/ai?strategy=long_term",
  },
};

/** Category buckets that feed each institutional ranking (master pool views). */
const STRATEGY_CATEGORIES: Record<
  InstitutionalStrategyId,
  readonly OpportunityCategory[]
> = {
  intraday: ["intraday"],
  swing: ["swing"],
  /** Overnight / Intraday–2 days horizon — closest OE bucket to BTST. */
  btst: ["relative_volume"],
  scalping: ["intraday"],
  short_term: ["breakout", "mean_reversion"],
  medium_term: ["momentum"],
  long_term: ["ai_high_conviction"],
};

export interface InstitutionalStrategyPick {
  strategyId: InstitutionalStrategyId;
  company: string;
  symbol: string;
  /** Live market price only — never used as the recommended entry. */
  currentPrice: number | null;
  /**
   * Recommended execution midpoint (Ideal Entry).
   * Kept for compatibility; prefer entryMode / entryLow / entryHigh in UI.
   */
  entry: number;
  /** "zone" → Entry Zone · "ideal" → Ideal Entry */
  entryMode: "zone" | "ideal";
  entryLow: number | null;
  entryHigh: number | null;
  /** True when live price sits inside the ideal / zone mid tolerance. */
  entryAtMarket: boolean;
  primaryTarget: number;
  /** (target − ideal entry) / ideal × 100 */
  expectedUpsidePercent: number | null;
  conviction: number;
  lastScanTime: string;
}

export interface InstitutionalStrategySlot {
  strategyId: InstitutionalStrategyId;
  label: string;
  emoji: string;
  href: string;
  /** Highest-conviction pick, or null when nothing clears the gate. */
  pick: InstitutionalStrategyPick | null;
  lastScanTime: string;
}

export const NO_HIGH_CONVICTION_MESSAGE = "No High Conviction Opportunity";

let cachedDashboardKey = "";
let cachedDashboardSlots: InstitutionalStrategySlot[] = [];

function isScalpingCandidate(candidate: OpportunityCandidate): boolean {
  if (candidate.strategySignal?.strategyId === "scalping") return true;
  if (candidate.strategyId === "scalping") return true;
  if (candidate.executedStrategyIds?.includes("scalping")) return true;
  return (candidate.strategySignals ?? []).some(
    (signal) => signal.strategyId === "scalping"
  );
}

function matchesStrategy(
  candidate: OpportunityCandidate,
  strategyId: InstitutionalStrategyId
): boolean {
  const categories = STRATEGY_CATEGORIES[strategyId];
  if (!categories.includes(candidate.category)) return false;

  if (strategyId === "scalping") return isScalpingCandidate(candidate);
  if (strategyId === "intraday") return !isScalpingCandidate(candidate);
  return true;
}

function resolveCurrentPrice(candidate: OpportunityCandidate): number | null {
  const quoted = candidate.quote?.price;
  if (typeof quoted === "number" && Number.isFinite(quoted) && quoted > 0) {
    return Math.round(quoted * 100) / 100;
  }
  const cmp = candidate.scanMetrics?.cmp;
  if (typeof cmp === "number" && Number.isFinite(cmp) && cmp > 0) {
    return Math.round(cmp * 100) / 100;
  }
  return null;
}

function toRecommendation(
  candidate: OpportunityCandidate,
  lastScanTime: string,
  shared?: SharedMarketSnapshot
): SharedRecommendation | null {
  return (
    buildSharedRecommendation(candidate, lastScanTime) ??
    buildFallbackRecommendation(candidate, lastScanTime, shared)
  );
}

function convictionOf(recommendation: SharedRecommendation): number {
  return Math.max(recommendation.conviction, recommendation.confidence);
}

function toPick(
  strategyId: InstitutionalStrategyId,
  recommendation: SharedRecommendation,
  candidate: OpportunityCandidate,
  lastScanTime: string
): InstitutionalStrategyPick {
  const currentPrice = resolveCurrentPrice(candidate);
  const entryPlan = planInstitutionalEntry(
    strategyId,
    candidate,
    recommendation,
    currentPrice
  );
  const primaryTarget =
    recommendation.targets[0] ??
    candidate.target1 ??
    entryPlan.ideal;

  return {
    strategyId,
    company: recommendation.company,
    symbol: recommendation.symbol,
    currentPrice,
    entry: entryPlan.ideal,
    entryMode: entryPlan.mode,
    entryLow: entryPlan.low,
    entryHigh: entryPlan.high,
    entryAtMarket: entryPlan.atMarket,
    primaryTarget,
    expectedUpsidePercent: entryPlan.expectedUpsidePercent,
    conviction: Math.round(convictionOf(recommendation)),
    lastScanTime,
  };
}

/**
 * Rank one strategy over the master pool — highest conviction only.
 * Returns null when nothing meets HIGH_CONVICTION_MINIMUM (never invents picks).
 */
function rankStrategy(
  strategyId: InstitutionalStrategyId,
  state: OpportunityEngineState,
  lastScanTime: string,
  shared?: SharedMarketSnapshot
): InstitutionalStrategyPick | null {
  let best: {
    pick: InstitutionalStrategyPick;
    score: number;
  } | null = null;

  for (const category of STRATEGY_CATEGORIES[strategyId]) {
    for (const candidate of state.categories[category] ?? []) {
      if (!matchesStrategy(candidate, strategyId)) continue;
      const recommendation = toRecommendation(candidate, lastScanTime, shared);
      if (!recommendation) continue;
      if (recommendation.action === "WATCHLIST") continue;

      const score = convictionOf(recommendation);
      if (score < HIGH_CONVICTION_MINIMUM) continue;

      if (!best || score > best.score) {
        best = {
          score,
          pick: toPick(strategyId, recommendation, candidate, lastScanTime),
        };
      }
    }
  }

  return best?.pick ?? null;
}

/**
 * Build the seven institutional slots from a single OE state snapshot.
 * Cached by tradingDate:scanCount:lastScannedAt (+ regime) — no I/O.
 */
export function selectInstitutionalStrategyDashboard(
  state: OpportunityEngineState,
  shared?: SharedMarketSnapshot
): InstitutionalStrategySlot[] {
  const key = `v2-entry:${state.tradingDate}:${state.scanCount}:${state.lastScannedAt}:${shared?.regime ?? ""}`;
  if (key === cachedDashboardKey) return cachedDashboardSlots;

  const lastScanTime = state.lastScannedAt ?? new Date(0).toISOString();
  const slots = INSTITUTIONAL_STRATEGY_IDS.map((strategyId) => {
    const meta = INSTITUTIONAL_STRATEGY_META[strategyId];
    return {
      strategyId,
      label: meta.label,
      emoji: meta.emoji,
      href: meta.href,
      pick: rankStrategy(strategyId, state, lastScanTime, shared),
      lastScanTime,
    } satisfies InstitutionalStrategySlot;
  });

  cachedDashboardKey = key;
  cachedDashboardSlots = slots;
  return slots;
}

/**
 * Client-side projection when only SharedRecommendation[] is available
 * (e.g. post-hydrate refresh). Prefer selectInstitutionalStrategyDashboard
 * when OE state is on hand — this path cannot recover category-deduped losses.
 */
export function rankInstitutionalSlotsFromRecommendations(
  recommendations: SharedRecommendation[],
  lastScanTime: string
): InstitutionalStrategySlot[] {
  const scanTime =
    lastScanTime ||
    recommendations[0]?.timestamp ||
    new Date(0).toISOString();

  return INSTITUTIONAL_STRATEGY_IDS.map((strategyId) => {
    const meta = INSTITUTIONAL_STRATEGY_META[strategyId];
    const categories = new Set(STRATEGY_CATEGORIES[strategyId]);

    let best: SharedRecommendation | null = null;
    for (const recommendation of recommendations) {
      if (!categories.has(recommendation.category)) continue;
      if (strategyId === "scalping") {
        if (recommendation.primaryStrategyId !== "scalping") continue;
      } else if (strategyId === "intraday") {
        if (recommendation.primaryStrategyId === "scalping") continue;
      }
      if (recommendation.action === "WATCHLIST") continue;
      if (convictionOf(recommendation) < HIGH_CONVICTION_MINIMUM) continue;
      if (
        !best ||
        convictionOf(recommendation) > convictionOf(best)
      ) {
        best = recommendation;
      }
    }

    return {
      strategyId,
      label: meta.label,
      emoji: meta.emoji,
      href: meta.href,
      pick: best
        ? (() => {
            const entryPlan = planInstitutionalEntryFromRecommendation(
              strategyId,
              best,
              null
            );
            const primaryTarget = best.targets[0] ?? entryPlan.ideal;
            return {
              strategyId,
              company: best.company,
              symbol: best.symbol,
              currentPrice: null,
              entry: entryPlan.ideal,
              entryMode: entryPlan.mode,
              entryLow: entryPlan.low,
              entryHigh: entryPlan.high,
              entryAtMarket: entryPlan.atMarket,
              primaryTarget,
              expectedUpsidePercent: entryPlan.expectedUpsidePercent,
              conviction: Math.round(convictionOf(best)),
              lastScanTime: best.timestamp || scanTime,
            };
          })()
        : null,
      lastScanTime: scanTime,
    } satisfies InstitutionalStrategySlot;
  });
}

export function parseInstitutionalStrategyId(
  value: string | null | undefined
): InstitutionalStrategyId | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/-/g, "_");
  return INSTITUTIONAL_STRATEGY_IDS.includes(
    normalized as InstitutionalStrategyId
  )
    ? (normalized as InstitutionalStrategyId)
    : null;
}

/** Test helper — clears projection cache between cases. */
export function __resetInstitutionalDashboardCacheForTests(): void {
  cachedDashboardKey = "";
  cachedDashboardSlots = [];
}
