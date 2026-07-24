/**
 * Sprint 9A.1 — presentation-only institutional entry planner.
 *
 * Derives strategy-specific Ideal Entry / Entry Zone for dashboard cards.
 * Never mutates Recommendation Engine outputs or runs scans.
 * Anchors prefer VWAP / ORB open / EMA / prior close over live LTP.
 */

import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import type { InstitutionalStrategyId } from "@/lib/recommendations/institutional-strategy-dashboard";

/** Relative |current − ideal| below which we treat price as "at ideal entry". */
export const ENTRY_AT_MARKET_TOLERANCE = 0.0015; // 0.15%

export type InstitutionalEntryMode = "zone" | "ideal";

export interface InstitutionalEntryPlan {
  mode: InstitutionalEntryMode;
  /** Midpoint / single recommended execution price (always set). */
  ideal: number;
  low: number | null;
  high: number | null;
  /** Live LTP is within tolerance of the ideal / zone mid. */
  atMarket: boolean;
  /** (target − ideal) / ideal × 100; null when not computable. */
  expectedUpsidePercent: number | null;
}

interface StrategyEntryProfile {
  /** Half-width of the entry band as a fraction of the anchor. */
  halfWidth: number;
  /** Prefer a displayed range when band is meaningful. */
  preferZone: boolean;
  /** Force zone even when band is tiny (long-term accumulation). */
  forceZone: boolean;
}

const PROFILES: Record<InstitutionalStrategyId, StrategyEntryProfile> = {
  /** VWAP / ORB / CPR — tight intraday execution band. */
  intraday: { halfWidth: 0.0035, preferZone: true, forceZone: false },
  /** Breakout retest / EMA pullback / support. */
  swing: { halfWidth: 0.01, preferZone: true, forceZone: false },
  /** Closing accumulation — tight around projected close. */
  btst: { halfWidth: 0.0025, preferZone: true, forceZone: false },
  /** Very tight scalping execution range. */
  scalping: { halfWidth: 0.0012, preferZone: true, forceZone: false },
  /** Short-term accumulation zone. */
  short_term: { halfWidth: 0.008, preferZone: true, forceZone: false },
  /** Medium-term fair-value accumulation. */
  medium_term: { halfWidth: 0.012, preferZone: true, forceZone: false },
  /** Long-term accumulation — always a zone, never a single tick. */
  long_term: { halfWidth: 0.025, preferZone: true, forceZone: true },
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function positive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function differsFrom(
  anchor: number,
  current: number | null,
  tolerance = ENTRY_AT_MARKET_TOLERANCE
): boolean {
  if (current == null || current <= 0) return true;
  return Math.abs(anchor - current) / current > tolerance;
}

function metricNumber(
  metrics: OpportunityCandidate["scanMetrics"],
  key: string
): number | null {
  if (!metrics) return null;
  return positive(metrics[key]);
}

/**
 * Collect structural anchors that are not merely "copy of live LTP".
 * Order within each strategy is applied by pickAnchor().
 */
function collectAnchors(
  candidate: OpportunityCandidate,
  recommendation: SharedRecommendation
): {
  vwap: number | null;
  open: number | null;
  previousClose: number | null;
  ema20: number | null;
  ema50: number | null;
  signalEntry: number | null;
  zoneMid: number | null;
  recommendationEntry: number | null;
  atr: number | null;
} {
  const quote = candidate.quote;
  const zoneLow = positive(candidate.entryZone?.low);
  const zoneHigh = positive(candidate.entryZone?.high);
  const zoneMid =
    zoneLow != null && zoneHigh != null
      ? round2((zoneLow + zoneHigh) / 2)
      : null;

  return {
    vwap: positive(quote?.vwap) ?? metricNumber(candidate.scanMetrics, "vwap"),
    open: positive(quote?.open),
    previousClose: positive(quote?.previousClose),
    ema20: metricNumber(candidate.scanMetrics, "ema20"),
    ema50: metricNumber(candidate.scanMetrics, "ema50"),
    signalEntry: positive(candidate.strategySignal?.entry),
    zoneMid,
    recommendationEntry: positive(recommendation.entry),
    atr: metricNumber(candidate.scanMetrics, "atr"),
  };
}

function pickAnchor(
  strategyId: InstitutionalStrategyId,
  anchors: ReturnType<typeof collectAnchors>,
  current: number | null
): number {
  const preference: Array<number | null> = (() => {
    switch (strategyId) {
      case "intraday":
        // VWAP / ORB open / CPR-style prior close, then signal.
        return [
          anchors.vwap,
          anchors.open,
          anchors.previousClose,
          anchors.signalEntry,
          anchors.zoneMid,
          anchors.recommendationEntry,
        ];
      case "swing":
        // EMA pullback / support, then breakout retest zone.
        return [
          anchors.ema20,
          anchors.ema50,
          anchors.zoneMid,
          anchors.signalEntry,
          anchors.previousClose,
          anchors.recommendationEntry,
        ];
      case "btst":
        // Closing accumulation around projected / prior close.
        return [
          anchors.previousClose,
          anchors.vwap,
          anchors.signalEntry,
          anchors.zoneMid,
          anchors.recommendationEntry,
        ];
      case "scalping":
        return [
          anchors.vwap,
          anchors.signalEntry,
          anchors.open,
          anchors.zoneMid,
          anchors.recommendationEntry,
        ];
      case "short_term":
        return [
          anchors.zoneMid,
          anchors.ema20,
          anchors.signalEntry,
          anchors.previousClose,
          anchors.recommendationEntry,
        ];
      case "medium_term":
        return [
          anchors.ema50,
          anchors.ema20,
          anchors.zoneMid,
          anchors.signalEntry,
          anchors.recommendationEntry,
        ];
      case "long_term":
        return [
          anchors.ema50,
          anchors.zoneMid,
          anchors.previousClose,
          anchors.signalEntry,
          anchors.recommendationEntry,
        ];
    }
  })();

  // Prefer an anchor that is structurally distinct from live LTP.
  for (const candidate of preference) {
    if (candidate != null && differsFrom(candidate, current)) {
      return round2(candidate);
    }
  }
  for (const candidate of preference) {
    if (candidate != null) return round2(candidate);
  }

  // Last resort: slight structural offset from current so Entry ≠ Current in UI.
  if (current != null && current > 0) {
    const atr = anchors.atr;
    const offset =
      atr != null && atr > 0 ? Math.min(atr * 0.25, current * 0.004) : current * 0.003;
    return round2(current - offset);
  }

  return 0;
}

function buildBand(
  ideal: number,
  halfWidth: number,
  atr: number | null
): { low: number; high: number } {
  let half = ideal * halfWidth;
  if (atr != null && atr > 0) {
    // Blend ATR so wider names get a sensible zone without exploding.
    half = Math.max(half, Math.min(atr * 0.35, ideal * halfWidth * 2.5));
  }
  half = Math.max(half, ideal * 0.0008); // never collapse to a single tick
  return {
    low: round2(ideal - half),
    high: round2(ideal + half),
  };
}

function upsidePercent(ideal: number, target: number, side: "Long" | "Short"): number | null {
  if (!(ideal > 0) || !(target > 0)) return null;
  const raw =
    side === "Short"
      ? ((ideal - target) / ideal) * 100
      : ((target - ideal) / ideal) * 100;
  if (!Number.isFinite(raw)) return null;
  return Math.round(raw * 10) / 10;
}

/**
 * Build the dashboard entry plan for one institutional strategy pick.
 * Pure — safe for SSR projection cache; no I/O.
 */
export function planInstitutionalEntry(
  strategyId: InstitutionalStrategyId,
  candidate: OpportunityCandidate,
  recommendation: SharedRecommendation,
  currentPrice: number | null
): InstitutionalEntryPlan {
  const profile = PROFILES[strategyId];
  const anchors = collectAnchors(candidate, recommendation);
  const ideal = pickAnchor(strategyId, anchors, currentPrice);
  const band = buildBand(ideal, profile.halfWidth, anchors.atr);
  const bandWidthPct =
    ideal > 0 ? (band.high - band.low) / ideal : 0;
  const useZone =
    profile.forceZone ||
    (profile.preferZone && bandWidthPct >= ENTRY_AT_MARKET_TOLERANCE);

  const reference = useZone
    ? round2((band.low + band.high) / 2)
    : ideal;

  const atMarket =
    currentPrice != null &&
    currentPrice > 0 &&
    Math.abs(currentPrice - reference) / currentPrice <= ENTRY_AT_MARKET_TOLERANCE;

  const target =
    positive(recommendation.targets[0]) ??
    positive(candidate.target1) ??
    reference;

  return {
    mode: useZone ? "zone" : "ideal",
    ideal: reference,
    low: useZone ? band.low : null,
    high: useZone ? band.high : null,
    atMarket,
    expectedUpsidePercent: upsidePercent(
      reference,
      target,
      candidate.side === "Short" ? "Short" : "Long"
    ),
  };
}

/**
 * Fallback planner when only a SharedRecommendation is available (no candidate).
 * Still applies strategy band so Entry is presented as a plan, not raw LTP copy.
 */
export function planInstitutionalEntryFromRecommendation(
  strategyId: InstitutionalStrategyId,
  recommendation: SharedRecommendation,
  currentPrice: number | null = null
): InstitutionalEntryPlan {
  const profile = PROFILES[strategyId];
  const base =
    positive(recommendation.entry) ??
    (currentPrice != null && currentPrice > 0
      ? round2(currentPrice * 0.997)
      : 0);
  const band = buildBand(base, profile.halfWidth, null);
  const useZone = profile.forceZone || profile.preferZone;
  const reference = useZone ? round2((band.low + band.high) / 2) : base;
  const target = positive(recommendation.targets[0]) ?? reference;
  const atMarket =
    currentPrice != null &&
    currentPrice > 0 &&
    Math.abs(currentPrice - reference) / currentPrice <= ENTRY_AT_MARKET_TOLERANCE;

  return {
    mode: useZone ? "zone" : "ideal",
    ideal: reference,
    low: useZone ? band.low : null,
    high: useZone ? band.high : null,
    atMarket,
    expectedUpsidePercent: upsidePercent(
      reference,
      target,
      recommendation.action === "SELL" ? "Short" : "Long"
    ),
  };
}
