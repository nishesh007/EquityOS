import type {
  OpportunityCandidate,
  OpportunityEngineState,
  ScanHistoryEntry,
} from "@/lib/opportunity-engine/types";
import { OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-engine/types";

export const INTRADAY_DISPLAY_LIMIT = 18;
export const BEST_CALLS_LIMIT = 5;
export const TOMORROW_WATCHLIST_LIMIT = 15;
export const MISSED_OPPORTUNITIES_LIMIT = 10;

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

/**
 * Composite rank score used to derive Intraday, Best Calls, and post-market lists.
 * Priority: AI Conviction + Technical + Liquidity + Volume + R/R + Freshness.
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
  const intradayTop5 = new Set(
    intraday.slice(0, 5).map((c) => c.symbol.toUpperCase())
  );

  const diversified: RankedCandidate[] = [];
  let intradayPicks = 0;

  for (const candidate of pool) {
    const symbol = candidate.symbol.toUpperCase();
    const isIntradayTop = intradayTop5.has(symbol);

    if (isIntradayTop && intradayPicks >= 1) continue;
    if (isIntradayTop) intradayPicks += 1;

    diversified.push(candidate);
    if (diversified.length >= limit * 3) break;
  }

  let selected = diversified.slice(0, limit);

  if (selected.length < 3) {
    selected = pool
      .filter((c) => c.aiConvictionScore >= 70)
      .slice(0, limit);
  }

  const isCopyOfIntraday =
    selected.length > 0 &&
    selected.length <= intraday.length &&
    selected.every((c, i) => intraday[i]?.symbol.toUpperCase() === c.symbol.toUpperCase());

  if (isCopyOfIntraday) {
    const nonIntraday = pool.filter((c) => !intradaySymbols.has(c.symbol.toUpperCase()));
    const blended = [...nonIntraday.slice(0, limit - 1), ...pool.slice(0, 1)];
    selected = blended.slice(0, limit);
  }

  return withRanks(selected);
}

function tomorrowWatchlistScore(candidate: RankedCandidate): number {
  const metrics = candidate.scanMetrics;
  let score = candidate.compositeScore * 0.4;

  const changePercent = num(metrics, "change_percent") ?? 0;
  const priceToHigh = num(metrics, "price_to_52w_high") ?? 0;
  const delivery = num(metrics, "delivery_percent") ?? 0;
  const rs = num(metrics, "relative_strength") ?? 50;
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  const trend = num(metrics, "trend_score") ?? 50;

  if (changePercent >= 0.8) score += 12;
  if (priceToHigh >= 95) score += 14;
  if (delivery >= 35) score += 10;
  if (rs >= 58) score += 10;
  if (volumeRatio >= 1.4) score += 10;
  if (trend >= 58) score += 8;
  if (changePercent >= 1.2 && volumeRatio >= 1.3) score += 8;

  return score;
}

export function buildTomorrowWatchlist(
  pool: RankedCandidate[],
  intraday: OpportunityCandidate[]
): OpportunityCandidate[] {
  const intradaySymbols = new Set(intraday.map((c) => c.symbol.toUpperCase()));

  const scoreCandidate = (candidate: RankedCandidate) => ({
    candidate,
    score: tomorrowWatchlistScore(candidate),
  });

  const tiers = [
    (c: RankedCandidate) =>
      !intradaySymbols.has(c.symbol.toUpperCase()) &&
      c.aiConvictionScore >= 68 &&
      c.confidencePercent >= 60 &&
      (num(c.scanMetrics, "trend_score") ?? 0) >= 55,
    (c: RankedCandidate) =>
      !intradaySymbols.has(c.symbol.toUpperCase()) &&
      c.aiConvictionScore >= 60 &&
      c.confidencePercent >= 52,
    (c: RankedCandidate) => !intradaySymbols.has(c.symbol.toUpperCase()),
    (c: RankedCandidate) => c.aiConvictionScore >= 55,
  ];

  for (const filter of tiers) {
    const filtered = pool.filter(filter);
    if (filtered.length > 0) {
      const ranked = filtered
        .map(scoreCandidate)
        .sort((a, b) => b.score - a.score)
        .slice(0, TOMORROW_WATCHLIST_LIMIT)
        .map((entry) => entry.candidate);
      return withRanks(ranked);
    }
  }

  return withRanks(pool.slice(0, TOMORROW_WATCHLIST_LIMIT));
}

function buildMissedReason(candidate: OpportunityCandidate): string {
  const parts: string[] = [];
  if (candidate.previousRank !== null && candidate.rank > candidate.previousRank) {
    parts.push(`Rank fell from #${candidate.previousRank} to #${candidate.rank}`);
  } else {
    parts.push("Setup faded after early-session trigger");
  }
  parts.push(`Peak conviction ${candidate.aiConvictionScore}`);
  return parts.join(" · ");
}

export function buildMissedOpportunities(
  pool: RankedCandidate[],
  bestCalls: OpportunityCandidate[],
  intraday: OpportunityCandidate[],
  scanHistory: ScanHistoryEntry[],
  scannedAt: Date
): OpportunityCandidate[] {
  if (scanHistory.length === 0) return [];

  const exclude = new Set([
    ...bestCalls.map((c) => c.symbol.toUpperCase()),
    ...intraday.slice(0, 5).map((c) => c.symbol.toUpperCase()),
  ]);

  const intradaySymbols = new Set(intraday.map((c) => c.symbol.toUpperCase()));

  const tiers = [
    () =>
      pool.filter((c) => {
        if (exclude.has(c.symbol.toUpperCase())) return false;
        return (
          hoursActive(c, scannedAt) >= 1.5 &&
          c.previousRank !== null &&
          c.previousRank <= 8 &&
          c.rank > c.previousRank + 2 &&
          c.aiConvictionScore >= 68
        );
      }),
    () =>
      pool.filter((c) => {
        if (exclude.has(c.symbol.toUpperCase())) return false;
        return (
          hoursActive(c, scannedAt) >= 2 &&
          c.aiConvictionScore >= 72 &&
          !intradaySymbols.has(c.symbol.toUpperCase())
        );
      }),
    () =>
      pool.filter((c) => {
        if (exclude.has(c.symbol.toUpperCase())) return false;
        return c.previousRank !== null && c.rank > c.previousRank && c.aiConvictionScore >= 65;
      }),
    () =>
      pool.filter((c) => {
        if (exclude.has(c.symbol.toUpperCase())) return false;
        return c.aiConvictionScore >= 66;
      }),
  ];

  for (const tier of tiers) {
    const matches = tier();
    if (matches.length > 0) {
      const ranked = [...matches]
        .sort((a, b) => {
          const rankDropA = (a.previousRank ?? a.rank) - a.rank;
          const rankDropB = (b.previousRank ?? b.rank) - b.rank;
          return rankDropB - rankDropA || b.aiConvictionScore - a.aiConvictionScore;
        })
        .slice(0, MISSED_OPPORTUNITIES_LIMIT)
        .map((candidate) => ({
          ...candidate,
          reason: buildMissedReason(candidate),
        }));
      return withRanks(ranked);
    }
  }

  return [];
}
