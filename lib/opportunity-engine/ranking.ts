import {
  buildBestCallReasons,
  computeBestCallScore,
} from "@/lib/opportunity-engine/best-call";
import type {
  ExpiredSetupOutcome,
  OpportunityCandidate,
  OpportunityEngineState,
  ScanHistoryEntry,
} from "@/lib/opportunity-engine/types";
import { OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-engine/types";
import { collectExcludedSymbols } from "@/lib/opportunity-engine/deduplication";

export const INTRADAY_DISPLAY_LIMIT = 18;
export const BEST_CALLS_LIMIT = 5;
export const TOMORROW_WATCHLIST_LIMIT = 15;
export const EXPIRED_SETUPS_LIMIT = 10;
/** @deprecated Use EXPIRED_SETUPS_LIMIT */
export const MISSED_OPPORTUNITIES_LIMIT = EXPIRED_SETUPS_LIMIT;

export interface RankedCandidate extends OpportunityCandidate {
  compositeScore: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function num(
  metrics: Record<string, number | string | null> | undefined,
  key: string
): number | null {
  if (!metrics) return null;
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function hoursActive(candidate: OpportunityCandidate, scannedAt: Date): number {
  const detected = new Date(candidate.firstDetectedAt);
  return (scannedAt.getTime() - detected.getTime()) / (1000 * 60 * 60);
}

function freshnessScore(candidate: OpportunityCandidate, scannedAt: Date): number {
  const hours = hoursActive(candidate, scannedAt);
  if (hours <= 1) return 100;
  if (hours <= 3) return 80;
  if (hours <= 6) return 60;
  return Math.max(20, 100 - hours * 8);
}

function technicalScore(candidate: OpportunityCandidate): number {
  const metrics = candidate.scanMetrics;
  const trend = num(metrics, "trend_score") ?? 50;
  const adx = num(metrics, "adx") ?? 0;
  const rsi = num(metrics, "rsi") ?? 50;
  const direction = candidate.side === "Long" ? 1 : -1;

  let score = trend * 0.5 + Math.min(30, adx) + 20;
  if (direction > 0 && rsi >= 45 && rsi <= 70) score += 8;
  if (direction < 0 && rsi >= 30 && rsi <= 55) score += 8;
  return clamp(score, 0, 100);
}

function liquidityScore(candidate: OpportunityCandidate): number {
  const metrics = candidate.scanMetrics;
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  const delivery = num(metrics, "delivery_percent") ?? 0;
  return clamp(volumeRatio * 25 + delivery * 0.4, 0, 100);
}

function volumeConfirmationScore(candidate: OpportunityCandidate): number {
  const volumeRatio = num(candidate.scanMetrics, "volume_ratio") ?? 0;
  if (volumeRatio >= 2.5) return 100;
  if (volumeRatio >= 1.8) return 85;
  if (volumeRatio >= 1.3) return 70;
  if (volumeRatio >= 1.1) return 55;
  return 35;
}

function sectorStrengthScore(candidate: OpportunityCandidate): number {
  const rs = num(candidate.scanMetrics, "relative_strength") ?? 50;
  const changePercent = num(candidate.scanMetrics, "change_percent") ?? 0;
  const direction = candidate.side === "Long" ? 1 : -1;
  return clamp(50 + direction * (rs - 50) * 0.8 + direction * changePercent * 2, 0, 100);
}

function gapProbabilityScore(candidate: OpportunityCandidate): number {
  const metrics = candidate.scanMetrics;
  let score = 0;
  const closingStrength = num(metrics, "closing_strength") ?? 0;
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  const changePercent = num(metrics, "change_percent") ?? 0;
  const priceToHigh = num(metrics, "price_to_52w_high") ?? 0;
  const delivery = num(metrics, "delivery_percent") ?? 0;

  if (closingStrength >= 70) score += 25;
  else if (closingStrength >= 55) score += 15;

  if (volumeRatio >= 1.8) score += 22;
  else if (volumeRatio >= 1.3) score += 12;

  if (changePercent >= 1.2 && candidate.side === "Long") score += 18;
  else if (changePercent >= 0.6) score += 10;

  if (priceToHigh >= 92 && priceToHigh < 100) score += 15;

  if (delivery >= 35) score += 10;

  return clamp(score, 0, 100);
}

function openingBias(candidate: OpportunityCandidate): string {
  const closingStrength = num(candidate.scanMetrics, "closing_strength") ?? 50;
  const changePercent = num(candidate.scanMetrics, "change_percent") ?? 0;
  if (candidate.side === "Long") {
    if (closingStrength >= 75 && changePercent >= 1) return "Gap-up bias";
    if (closingStrength >= 60) return "Mild gap-up bias";
    return "Neutral open";
  }
  if (closingStrength <= 30 && changePercent <= -1) return "Gap-down bias";
  if (closingStrength <= 45) return "Mild gap-down bias";
  return "Neutral open";
}

function expectedCatalyst(candidate: OpportunityCandidate): string {
  const revenueGrowth = num(candidate.scanMetrics, "revenue_growth") ?? 0;
  const fundamentalScore = num(candidate.scanMetrics, "fundamental_score") ?? 0;
  const volumeRatio = num(candidate.scanMetrics, "volume_ratio") ?? 0;
  const priceToHigh = num(candidate.scanMetrics, "price_to_52w_high") ?? 0;

  if (revenueGrowth >= 15 && fundamentalScore >= 55) return "Earnings momentum";
  if (priceToHigh >= 95) return "52-week breakout watch";
  if (volumeRatio >= 2) return "Volume continuation";
  if (candidate.category === "breakout") return "Breakout follow-through";
  if (candidate.category === "momentum") return "Momentum extension";
  return "Technical continuation";
}

/**
 * Composite rank score used to derive Intraday and post-market pools.
 */
export function computeCompositeScore(
  candidate: OpportunityCandidate,
  scannedAt: Date = new Date()
): number {
  const rrScore = clamp(candidate.riskReward * 20, 0, 100);
  const composite =
    candidate.aiConvictionScore * 0.28 +
    technicalScore(candidate) * 0.18 +
    liquidityScore(candidate) * 0.14 +
    volumeConfirmationScore(candidate) * 0.14 +
    rrScore * 0.12 +
    freshnessScore(candidate, scannedAt) * 0.08 +
    candidate.confidencePercent * 0.06;

  return Math.round(clamp(composite, 0, 100) * 100) / 100;
}

export function flattenRankedPool(
  state: OpportunityEngineState,
  scannedAt?: Date
): RankedCandidate[] {
  const at = scannedAt ?? (state.lastScannedAt ? new Date(state.lastScannedAt) : new Date());
  const bySymbol = new Map<string, RankedCandidate>();

  for (const category of OPPORTUNITY_CATEGORIES) {
    for (const candidate of state.categories[category] ?? []) {
      const key = candidate.symbol.toUpperCase();
      const ranked: RankedCandidate = {
        ...candidate,
        compositeScore: computeCompositeScore(candidate, at),
      };
      const existing = bySymbol.get(key);
      if (!existing || ranked.compositeScore > existing.compositeScore) {
        bySymbol.set(key, ranked);
      }
    }
  }

  return [...bySymbol.values()].sort((a, b) => b.compositeScore - a.compositeScore);
}

function withRanks(candidates: OpportunityCandidate[]): OpportunityCandidate[] {
  return candidates.map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

export function buildIntradayOpportunities(
  state: OpportunityEngineState
): OpportunityCandidate[] {
  const scannedAt = state.lastScannedAt ? new Date(state.lastScannedAt) : new Date();
  const intraday = (state.categories.intraday ?? []).map((candidate) => ({
    ...candidate,
    compositeScore: computeCompositeScore(candidate, scannedAt),
  }));

  const ranked = [...intraday]
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, INTRADAY_DISPLAY_LIMIT)
    .map(({ compositeScore: _composite, ...candidate }) => candidate);

  return withRanks(ranked);
}

export function buildBestCalls(
  pool: RankedCandidate[],
  intraday: OpportunityCandidate[],
  limit = BEST_CALLS_LIMIT
): OpportunityCandidate[] {
  const intradaySymbols = new Set(intraday.map((c) => c.symbol.toUpperCase()));

  const scored = pool
    .filter((c) => !intradaySymbols.has(c.symbol.toUpperCase()))
    .map((candidate) => ({
      candidate,
      score: computeBestCallScore(candidate),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, limit);

  if (top.length >= limit) {
    return withRanks(
      top.map(({ candidate, score }) => ({
        ...candidate,
        bestCallScore: score,
        bestCallReasons: buildBestCallReasons(candidate, scored),
      }))
    );
  }

  const used = new Set(top.map((entry) => entry.candidate.symbol.toUpperCase()));
  const fallback = pool
    .filter((c) => !intradaySymbols.has(c.symbol.toUpperCase()) && !used.has(c.symbol.toUpperCase()))
    .filter((c) => c.category !== "intraday")
    .sort((a, b) => b.aiConvictionScore - a.aiConvictionScore)
    .map((candidate) => ({
      candidate,
      score: computeBestCallScore(candidate),
    }));

  const blended = [...top, ...fallback].slice(0, limit);
  return withRanks(
    blended.map(({ candidate, score }) => ({
      ...candidate,
      bestCallScore: score,
      bestCallReasons: buildBestCallReasons(candidate, [...scored, ...fallback]),
    }))
  );
}

export function buildTomorrowWatchlist(
  pool: RankedCandidate[],
  intraday: OpportunityCandidate[]
): OpportunityCandidate[] {
  const intradaySymbols = new Set(intraday.map((c) => c.symbol.toUpperCase()));

  const candidates = pool.filter((c) => !intradaySymbols.has(c.symbol.toUpperCase()));
  const source = candidates.length > 0 ? candidates : pool.filter((c) => c.category !== "intraday");
  const finalPool = source.length > 0 ? source : pool;

  const ranked = [...finalPool]
    .map((candidate) => ({
      candidate,
      gapProbability: gapProbabilityScore(candidate),
      sectorStrength: sectorStrengthScore(candidate),
    }))
    .sort(
      (a, b) =>
        b.gapProbability - a.gapProbability ||
        b.candidate.aiConvictionScore - a.candidate.aiConvictionScore ||
        b.sectorStrength - a.sectorStrength
    )
    .slice(0, TOMORROW_WATCHLIST_LIMIT)
    .map(({ candidate, gapProbability, sectorStrength }) => ({
      ...candidate,
      gapProbability,
      sectorStrength,
      openingBias: openingBias(candidate),
      expectedCatalyst: expectedCatalyst(candidate),
    }));

  return withRanks(ranked);
}

function peakConviction(candidate: OpportunityCandidate): number {
  return Math.max(
    candidate.highestConviction ?? candidate.aiConvictionScore,
    candidate.aiConvictionScore
  );
}

function moveAfterSignal(candidate: OpportunityCandidate): number {
  if (candidate.moveAfterSignalPercent !== undefined) {
    return candidate.moveAfterSignalPercent;
  }
  const changePercent = num(candidate.scanMetrics, "change_percent") ?? 0;
  return candidate.side === "Long" ? changePercent : -changePercent;
}

function deriveExpiredOutcome(
  candidate: OpportunityCandidate,
  scannedAt: Date
): { outcome: ExpiredSetupOutcome; reason: string } {
  const move = moveAfterSignal(candidate);
  const peak = peakConviction(candidate);
  const current = candidate.aiConvictionScore;
  const adx = num(candidate.scanMetrics, "adx") ?? 0;
  const volumeRatio = num(candidate.scanMetrics, "volume_ratio") ?? 0;
  const priceToHigh = num(candidate.scanMetrics, "price_to_52w_high") ?? 0;

  if (move >= candidate.riskReward * 1.5 && candidate.side === "Long") {
    return { outcome: "Target Hit", reason: "Target zone reached before signal weakened" };
  }
  if (move <= -2.5) {
    return { outcome: "Stopped Out", reason: "Stop loss hit" };
  }
  if (peak - current >= 12) {
    return { outcome: "Conviction Dropped", reason: "Conviction dropped" };
  }
  if (adx < 20 && Math.abs(move) < 0.8) {
    return { outcome: "Range Bound", reason: "Range bound — no follow-through" };
  }
  if (
    candidate.category === "breakout" &&
    priceToHigh < 90 &&
    move < 0.5
  ) {
    return { outcome: "Breakout Failed", reason: "Breakout failed" };
  }
  if (priceToHigh >= 95 && move < 0.3 && candidate.side === "Long") {
    return { outcome: "Rejected at Resistance", reason: "Rejected at resistance" };
  }
  if (Math.abs(move) < 0.5 && volumeRatio < 1.1) {
    return { outcome: "Target Never Triggered", reason: "Target never triggered" };
  }
  if (hoursActive(candidate, scannedAt) >= 2 && move < 1) {
    return { outcome: "Momentum Faded", reason: "Momentum faded" };
  }

  return { outcome: "Momentum Faded", reason: "Momentum faded" };
}

export function buildExpiredSetups(
  pool: RankedCandidate[],
  bestCalls: OpportunityCandidate[],
  intraday: OpportunityCandidate[],
  scanHistory: ScanHistoryEntry[],
  scannedAt: Date
): OpportunityCandidate[] {
  const exclude = collectExcludedSymbols([bestCalls, intraday.slice(0, 5)]);

  const enrich = (candidate: RankedCandidate): OpportunityCandidate => {
    const { outcome, reason } = deriveExpiredOutcome(candidate, scannedAt);
    return {
      ...candidate,
      highestConviction: peakConviction(candidate),
      moveAfterSignalPercent: moveAfterSignal(candidate),
      peakTime: candidate.lastDetectedAt,
      expiredOutcome: outcome,
      expiredReason: reason,
      reasonMissed: reason,
      reason: reason,
    };
  };

  const tiers = [
    () =>
      pool.filter((c) => {
        if (exclude.has(c.symbol.toUpperCase())) return false;
        const move = moveAfterSignal(c);
        return (
          hoursActive(c, scannedAt) >= 1.5 &&
          c.previousRank !== null &&
          c.previousRank <= 8 &&
          move >= 1 &&
          peakConviction(c) >= 68
        );
      }),
    () =>
      pool.filter((c) => {
        if (exclude.has(c.symbol.toUpperCase())) return false;
        return (
          hoursActive(c, scannedAt) >= 2 &&
          peakConviction(c) >= 72 &&
          moveAfterSignal(c) >= 0.8
        );
      }),
    () =>
      pool.filter((c) => {
        if (exclude.has(c.symbol.toUpperCase())) return false;
        return c.previousRank !== null && c.rank > c.previousRank && peakConviction(c) >= 65;
      }),
    () =>
      pool.filter((c) => {
        if (exclude.has(c.symbol.toUpperCase())) return false;
        return peakConviction(c) >= 66 && moveAfterSignal(c) >= 0.5;
      }),
    () =>
      pool.filter((c) => {
        if (exclude.has(c.symbol.toUpperCase())) return false;
        return peakConviction(c) >= 60;
      }),
  ];

  for (const tier of tiers) {
    const matches = tier();
    if (matches.length > 0) {
      const ranked = [...matches]
        .sort((a, b) => {
          const moveA = moveAfterSignal(a);
          const moveB = moveAfterSignal(b);
          return moveB - moveA || peakConviction(b) - peakConviction(a);
        })
        .slice(0, EXPIRED_SETUPS_LIMIT)
        .map(enrich);
      return withRanks(ranked);
    }
  }

  if (scanHistory.length === 0 && pool.length === 0) return [];

  const fallback = pool
    .filter((c) => !exclude.has(c.symbol.toUpperCase()))
    .sort((a, b) => moveAfterSignal(b) - moveAfterSignal(a))
    .slice(0, EXPIRED_SETUPS_LIMIT)
    .map(enrich);

  return withRanks(fallback);
}

/** @deprecated Use buildExpiredSetups */
export function buildMissedOpportunities(
  pool: RankedCandidate[],
  bestCalls: OpportunityCandidate[],
  intraday: OpportunityCandidate[],
  scanHistory: ScanHistoryEntry[],
  scannedAt: Date
): OpportunityCandidate[] {
  return buildExpiredSetups(pool, bestCalls, intraday, scanHistory, scannedAt);
}
