/**
 * Sprint 9F — Institutional horizon helpers (Target ladder + legacy labels).
 *
 * Sprint 9F.1 — Holding periods are estimated dynamically by the Trade
 * Construction Engine. INSTITUTIONAL_HOLDING_PERIODS / OE_CATEGORY_HOLDING_PERIODS
 * remain as soft horizon-class references for compatibility checks only —
 * they must NEVER be used as recommendation templates.
 */

import type { InstitutionalStrategyId } from "@/lib/recommendations/institutional-strategy-dashboard";
import type { RecommendationAction } from "@/lib/recommendations/shared-recommendation";

/** Canonical holding periods for the seven institutional recommendation horizons. */
export const INSTITUTIONAL_HOLDING_PERIODS: Record<
  InstitutionalStrategyId,
  string
> = {
  scalping: "5–30 minutes",
  intraday: "30 minutes – market close",
  btst: "1–3 trading days",
  swing: "5–20 trading days",
  short_term: "1–3 months",
  medium_term: "3–12 months",
  long_term: "12+ months",
};

/**
 * OE category → default holding period (used by buildTradeLevels / fallback).
 * Aligned to institutional guidance for the category's primary horizon use.
 */
export const OE_CATEGORY_HOLDING_PERIODS = {
  intraday: "30 minutes – market close",
  swing: "5–20 trading days",
  breakout: "1–3 months",
  momentum: "3–12 months",
  relative_volume: "1–3 trading days",
  mean_reversion: "1–3 months",
  ai_high_conviction: "12+ months",
} as const;

export const STRATEGY_RECOMMENDATION_TITLES: Record<
  InstitutionalStrategyId,
  string
> = {
  intraday: "AI Intraday Recommendations",
  swing: "AI Swing Recommendations",
  btst: "AI BTST Recommendations",
  scalping: "AI Scalping Recommendations",
  short_term: "AI Short Term Recommendations",
  medium_term: "AI Medium Term Recommendations",
  long_term: "AI Long Term Recommendations",
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function positive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function uniqueOrderedTargets(
  action: RecommendationAction,
  entry: number,
  raw: readonly number[]
): number[] {
  const cleaned = raw
    .map((value) => positive(value))
    .filter((value): value is number => value != null)
    .map(round2);

  const unique: number[] = [];
  for (const target of cleaned) {
    if (unique.some((existing) => Math.abs(existing - target) < 0.005)) continue;
    unique.push(target);
  }

  const isSell = action === "SELL";
  return unique
    .filter((target) => (isSell ? target < entry : target > entry))
    .sort((a, b) => (isSell ? b - a : a - b));
}

/**
 * Ensure a three-target ladder whenever entry + stop + at least one target exist.
 *
 * Why Target 3 was missing:
 * - Strategy Engine often sets finalTarget ≈ target2 after rounding, then
 *   SharedRecommendation deduped them away.
 * - OE buildTradeLevels historically only emitted target1/target2.
 *
 * Generation rule (risk-extension):
 * BUY:  T3 = T2 + max(T2 − T1, |entry − stop|)
 * SELL: T3 = T2 − max(T1 − T2, |stop − entry|)
 */
export function ensureThreeTargets(options: {
  action: RecommendationAction;
  entry: number;
  stopLoss: number;
  targets: readonly number[];
}): number[] {
  const entry = positive(options.entry);
  const stop = positive(options.stopLoss);
  if (entry == null || stop == null) {
    return uniqueOrderedTargets(options.action, options.entry || 0, options.targets);
  }

  const ordered = uniqueOrderedTargets(options.action, entry, options.targets);
  if (ordered.length === 0) return [];

  const isSell = options.action === "SELL";
  const risk = Math.abs(entry - stop);
  const t1 = ordered[0];
  const t2 = ordered[1] ?? null;

  if (ordered.length >= 3) {
    return ordered.slice(0, 3).map(round2);
  }

  if (t2 == null) {
    // Only T1 present — keep it as Target 1 and extend beyond it.
    const step = Math.max(
      risk * 0.75,
      Math.abs(t1 - entry) * 0.5,
      entry * 0.004
    );
    const synthesizedT2 = round2(isSell ? t1 - step : t1 + step);
    const synthesizedT3 = round2(
      isSell ? synthesizedT2 - step : synthesizedT2 + step
    );
    return uniqueOrderedTargets(options.action, entry, [
      t1,
      synthesizedT2,
      synthesizedT3,
    ]).slice(0, 3);
  }

  const step = Math.max(Math.abs(t2 - t1), risk * 0.75, entry * 0.004);
  const t3 = round2(isSell ? t2 - step : t2 + step);
  return uniqueOrderedTargets(options.action, entry, [t1, t2, t3]).slice(0, 3);
}

export function resolveInstitutionalHoldingPeriod(
  strategyId: InstitutionalStrategyId
): string {
  return INSTITUTIONAL_HOLDING_PERIODS[strategyId];
}

/**
 * True when a holding period string is compatible with the institutional horizon.
 * Used to detect mapping bugs (e.g. swing showing "2–12 weeks").
 */
export function isHoldingPeriodConsistentWithHorizon(
  strategyId: InstitutionalStrategyId,
  holdingPeriod: string | null | undefined
): boolean {
  if (!holdingPeriod || !holdingPeriod.trim()) return false;
  const expected = INSTITUTIONAL_HOLDING_PERIODS[strategyId].toLowerCase();
  const actual = holdingPeriod.toLowerCase();
  if (actual === expected) return true;

  switch (strategyId) {
    case "scalping":
      return /5\s*[–-]\s*30\s*minute|scalp/.test(actual);
    case "intraday":
      return (
        (/market close|30\s*minute|same session/.test(actual) ||
          actual.includes("intraday")) &&
        !/week|month|year/.test(actual)
      );
    case "btst":
      return /1\s*[–-]\s*3.*day|overnight|btst/.test(actual);
    case "swing":
      return (
        /5\s*[–-]\s*20.*day/.test(actual) ||
        (/trading day/.test(actual) && !/month|year|week/.test(actual))
      );
    case "short_term":
      return /1\s*[–-]\s*3\s*month/.test(actual);
    case "medium_term":
      return /3\s*[–-]\s*12\s*month/.test(actual);
    case "long_term":
      return /12\+|more than 12|multi.?year/.test(actual);
    default:
      return false;
  }
}
