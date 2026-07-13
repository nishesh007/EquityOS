import {
  buildBestCallReasons,
  computeBestCallScore,
} from "@/lib/opportunity-engine/best-call";
import type {
  ExpiredSetupOutcome,
  GapProbabilityLevel,
  OpportunityCandidate,
  OpportunityEngineState,
  ScanHistoryEntry,
} from "@/lib/opportunity-engine/types";
import { OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-engine/types";
import { collectExcludedSymbols } from "@/lib/opportunity-engine/deduplication";

export const INTRADAY_DISPLAY_LIMIT = 18;
export const BEST_CALLS_LIMIT = 5;
export const BEST_CALLS_INTRADAY_OVERLAP_LIMIT = 2;
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

function gapProbabilityLevel(score: number): GapProbabilityLevel {
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
  return "Low";
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
  const delivery = num(candidate.scanMetrics, "delivery_percent") ?? 0;
  const relativeStrength = num(candidate.scanMetrics, "relative_strength") ?? 50;
  const adx = num(candidate.scanMetrics, "adx") ?? 0;

  if (revenueGrowth >= 15 && fundamentalScore >= 55) return "Earnings";
  if (revenueGrowth >= 10 && fundamentalScore >= 50) return "Results";
  if (priceToHigh >= 95) return "Breakout";
  if (relativeStrength >= 62 && adx >= 25) return "Relative Strength";
  if (delivery >= 40 && volumeRatio >= 1.5) return "Institutional Buying";
  if (volumeRatio >= 2.2) return "Delivery";
  if (volumeRatio >= 1.8) return "Sector Rotation";
  if (candidate.category === "breakout") return "Breakout";
  if (candidate.category === "momentum") return "Relative Strength";
  if (relativeStrength >= 58) return "Sector Rotation";
  if (adx >= 28) return "Breakout";
  return "Sector Rotation";
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

function selectBestCallsWithOverlapLimit(
  scored: { candidate: RankedCandidate; score: number }[],
  intradaySymbols: Set<string>,
  limit: number
): { candidate: RankedCandidate; score: number }[] {
  const selected: { candidate: RankedCandidate; score: number }[] = [];
  let intradayOverlap = 0;

  for (const entry of scored) {
    if (selected.length >= limit) break;
    const isIntraday = intradaySymbols.has(entry.candidate.symbol.toUpperCase());
    if (isIntraday && intradayOverlap >= BEST_CALLS_INTRADAY_OVERLAP_LIMIT) {
      continue;
    }
    selected.push(entry);
    if (isIntraday) intradayOverlap += 1;
  }

  if (selected.length < limit) {
    const used = new Set(selected.map((entry) => entry.candidate.symbol.toUpperCase()));
    for (const entry of scored) {
      if (selected.length >= limit) break;
      if (used.has(entry.candidate.symbol.toUpperCase())) continue;
      selected.push(entry);
    }
  }

  return selected;
}

export function buildBestCalls(
  pool: RankedCandidate[],
  intraday: OpportunityCandidate[],
  limit = BEST_CALLS_LIMIT
): OpportunityCandidate[] {
  const intradaySymbols = new Set(intraday.map((c) => c.symbol.toUpperCase()));

  const scored = pool
    .map((candidate) => ({
      candidate,
      score: computeBestCallScore(candidate),
    }))
    .sort((a, b) => b.score - a.score || b.candidate.aiConvictionScore - a.candidate.aiConvictionScore);

  const top = selectBestCallsWithOverlapLimit(scored, intradaySymbols, limit);

  return withRanks(
    top.map(({ candidate, score }) => ({
      ...candidate,
      bestCallScore: score,
      bestCallReasons: buildBestCallReasons(candidate, scored),
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
    .map((candidate) => {
      const gapProbability = gapProbabilityScore(candidate);
      return {
        candidate,
        gapProbability,
        gapProbabilityLevel: gapProbabilityLevel(gapProbability),
        sectorStrength: sectorStrengthScore(candidate),
      };
    })
    .sort(
      (a, b) =>
        b.gapProbability - a.gapProbability ||
        b.candidate.aiConvictionScore - a.candidate.aiConvictionScore ||
        b.sectorStrength - a.sectorStrength
    )
    .slice(0, TOMORROW_WATCHLIST_LIMIT)
    .map(({ candidate, gapProbability, gapProbabilityLevel: level, sectorStrength }) => ({
      ...candidate,
      gapProbability,
      gapProbabilityLevel: level,
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

function estimateMaximumGain(candidate: OpportunityCandidate, move: number): number {
  const closingStrength = num(candidate.scanMetrics, "closing_strength") ?? 50;
  const volumeRatio = num(candidate.scanMetrics, "volume_ratio") ?? 1;
  const peakEstimate = move + Math.max(0, (closingStrength - 50) * 0.02 + (volumeRatio - 1) * 0.5);
  return Math.round(Math.max(move, peakEstimate) * 100) / 100;
}

function estimateMaximumDrawdown(candidate: OpportunityCandidate, move: number): number {
  const volatility = num(candidate.scanMetrics, "volatility") ?? 20;
  const adverse = move < 0 ? move : -Math.min(volatility * 0.15, 3);
  return Math.round(adverse * 100) / 100;
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
  const rsi = num(candidate.scanMetrics, "rsi") ?? 50;
  const activeHours = hoursActive(candidate, scannedAt);

  if (move >= candidate.riskReward * 2 && candidate.side === "Long") {
    return { outcome: "Target Hit", reason: "Full target zone reached before signal weakened" };
  }
  if (move >= candidate.riskReward && candidate.side === "Long") {
    return { outcome: "Target1 Hit", reason: "Target 1 reached — partial profit captured" };
  }
  if (move <= -2.5) {
    return { outcome: "Stopped Out", reason: "Stop loss level breached" };
  }
  if (peak - current >= 12) {
    return { outcome: "Conviction Dropped", reason: "AI conviction fell sharply after signal" };
  }
  if (
    candidate.category === "breakout" &&
    priceToHigh < 90 &&
    move < 0.5
  ) {
    return { outcome: "Failed Breakout", reason: "Breakout lacked follow-through volume" };
  }
  if (adx < 20 && Math.abs(move) < 0.8) {
    return { outcome: "Range Bound", reason: "Price consolidated without directional follow-through" };
  }
  if (priceToHigh >= 95 && move < 0.3 && candidate.side === "Long") {
    return { outcome: "Rejected at Resistance", reason: "Rejected at key resistance zone" };
  }
  if (volumeRatio < 1.05 && activeHours >= 1.5) {
    return { outcome: "Volume Disappeared", reason: "Participation dried up after initial signal" };
  }
  if (
    (candidate.side === "Long" && rsi < 45 && move < 0) ||
    (candidate.side === "Short" && rsi > 55 && move > 0)
  ) {
    return { outcome: "Trend Reversed", reason: "Trend reversed against the original bias" };
  }
  if (Math.abs(move) < 0.5 && activeHours >= 2) {
    return { outcome: "Never Triggered", reason: "Entry zone never triggered during session" };
  }
  if (activeHours >= 2 && move < 1) {
    return { outcome: "Momentum Faded", reason: "Momentum faded without reaching targets" };
  }

  return { outcome: "Momentum Faded", reason: "Momentum faded without reaching targets" };
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
    const move = moveAfterSignal(candidate);
    const { outcome, reason } = deriveExpiredOutcome(candidate, scannedAt);
    const duration = hoursActive(candidate, scannedAt);
    return {
      ...candidate,
      highestConviction: peakConviction(candidate),
      moveAfterSignalPercent: move,
      maximumGainAfterSignal: estimateMaximumGain(candidate, move),
      maximumDrawdownAfterSignal: estimateMaximumDrawdown(candidate, move),
      setupDurationHours: Math.round(duration * 10) / 10,
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
