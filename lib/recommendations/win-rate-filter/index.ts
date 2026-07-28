/**
 * Highest Win Rate Recommendation Filter.
 * Read-time layer after Quality Gate — does not mutate Published SSOT.
 * Uses ONLY completed paper-trading outcomes.
 */

import "server-only";

import { isTradeClosed } from "@/lib/paper-trading/kpis";
import { loadPaperTradingState } from "@/lib/paper-trading/persistence";
import type { PaperTrade } from "@/lib/paper-trading/types";
import {
  classifyRegimeText,
  convictionBucketKey,
  liquidityBucketFromText,
  mapRecommendationToPaperStrategy,
  resolveSector,
} from "@/lib/recommendations/institutional-ranking/expectancy";
import {
  rankRecommendations,
  selectInstitutionallyRankedStrategyDashboard as selectByInstitutionalRank,
} from "@/lib/recommendations/institutional-ranking/engine";
import type { RankingMarketContext } from "@/lib/recommendations/institutional-ranking/types";
import type { RankedRecommendation } from "@/lib/recommendations/institutional-ranking/types";
import type { InstitutionalStrategySlot } from "@/lib/recommendations/institutional-strategy-dashboard";
import { rankInstitutionalSlotsFromRecommendations } from "@/lib/recommendations/institutional-strategy-dashboard";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";

/** Minimum closed trades before Expected Win Rate is statistically meaningful / shown. */
export const WIN_RATE_MIN_SAMPLE = 30;

export const WIN_RATE_INSUFFICIENT_REASON =
  "Historical dataset is insufficient for statistically meaningful win-rate estimation.";

export function isExpectedWinRateReliable(sampleSize: number): boolean {
  return sampleSize >= WIN_RATE_MIN_SAMPLE;
}

export interface WinRateAssessment {
  expectedWinRate: number;
  sampleSize: number;
  expectedWinRateEstimated: boolean;
  bucketSamples: {
    strategy: number;
    regime: number;
    sector: number;
    conviction: number;
    riskReward: number;
    liquidity: number;
  };
}

export interface WinRateRankedRecommendation extends RankedRecommendation {
  expectedWinRate: number;
  sampleSize: number;
  expectedWinRateEstimated: boolean;
  winRateAssessment: WinRateAssessment;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function riskRewardBucket(rr: number): string {
  if (rr < 1.5) return "lt-1.5";
  if (rr < 2) return "1.5-2";
  if (rr < 2.5) return "2-2.5";
  if (rr < 3) return "2.5-3";
  return "gte-3";
}

function closedTrades(asOf?: string | null): PaperTrade[] {
  const asOfMs = asOf ? Date.parse(asOf) : Number.POSITIVE_INFINITY;
  return loadPaperTradingState().trades.filter((trade) => {
    if (!isTradeClosed(trade)) return false;
    const exitMs = Date.parse(trade.exitAt ?? trade.updatedAt);
    return Number.isFinite(exitMs) && exitMs <= asOfMs;
  });
}

function winRateOf(trades: PaperTrade[]): number {
  if (trades.length === 0) return 0;
  return (trades.filter((t) => t.pnl > 0).length / trades.length) * 100;
}

function recKeys(rec: SharedRecommendation) {
  return {
    strategy: mapRecommendationToPaperStrategy(rec),
    regime: classifyRegimeText(`${rec.marketRegime} ${rec.marketContext}`),
    sector: resolveSector(rec.symbol),
    conviction: convictionBucketKey(Math.max(rec.conviction, rec.confidence)),
    riskReward: riskRewardBucket(rec.riskReward),
    liquidity: liquidityBucketFromText(
      (rec.evidence ?? []).join(" "),
      (rec.reasons ?? []).join(" ")
    ),
  };
}

function tradeMatchesDimension(
  trade: PaperTrade,
  dimension: keyof ReturnType<typeof recKeys>,
  key: string
): boolean {
  switch (dimension) {
    case "strategy":
      return trade.strategy === key;
    case "regime":
      return (
        classifyRegimeText(
          `${trade.recommendation.marketRegime} ${trade.recommendation.marketContext}`
        ) === key
      );
    case "sector":
      return resolveSector(trade.symbol) === key;
    case "conviction":
      return (
        convictionBucketKey(Math.max(trade.conviction, trade.confidence)) ===
        key
      );
    case "riskReward":
      return riskRewardBucket(trade.riskReward) === key;
    case "liquidity":
      return (
        liquidityBucketFromText(
          trade.recommendation.evidence.join(" "),
          trade.recommendation.reasons.join(" ")
        ) === key
      );
  }
}

/**
 * Historical win rate from completed paper trades across factor buckets.
 * Relevant sample = trades matching strategy + regime (core cohort),
 * refined by other factors when they also match (intersection soft blend).
 */
export function assessHistoricalWinRate(
  rec: SharedRecommendation,
  trades: readonly PaperTrade[] = closedTrades()
): WinRateAssessment {
  const keys = recKeys(rec);
  const dimensions = [
    "strategy",
    "regime",
    "sector",
    "conviction",
    "riskReward",
    "liquidity",
  ] as const;

  const bucketSamples = {
    strategy: 0,
    regime: 0,
    sector: 0,
    conviction: 0,
    riskReward: 0,
    liquidity: 0,
  };

  let weighted = 0;
  let weightSum = 0;
  for (const dim of dimensions) {
    const matched = trades.filter((t) =>
      tradeMatchesDimension(t, dim, keys[dim])
    );
    bucketSamples[dim] = matched.length;
    if (matched.length === 0) continue;
    const w = Math.min(matched.length, 40);
    weighted += winRateOf(matched) * w;
    weightSum += w;
  }

  // Core cohort: strategy ∩ regime (most relevant bucket for sample gate).
  const core = trades.filter(
    (t) =>
      tradeMatchesDimension(t, "strategy", keys.strategy) &&
      tradeMatchesDimension(t, "regime", keys.regime)
  );
  const sampleSize = core.length > 0 ? core.length : Math.max(...Object.values(bucketSamples), 0);

  const expectedWinRate =
    weightSum > 0
      ? round2(weighted / weightSum)
      : core.length > 0
        ? round2(winRateOf(core))
        : round2(winRateOf([...trades]));

  const expectedWinRateEstimated = !isExpectedWinRateReliable(sampleSize);

  return {
    expectedWinRate,
    sampleSize,
    expectedWinRateEstimated,
    bucketSamples,
  };
}

function sortKey(rec: WinRateRankedRecommendation): number {
  // Reliable win rate dominates; thin samples fall back to institutional rank.
  if (!rec.expectedWinRateEstimated) {
    return rec.expectedWinRate * 1000 + rec.institutionalRank;
  }
  return rec.institutionalRank;
}

export function applyHistoricalWinRateFilter(
  recommendations: readonly SharedRecommendation[],
  options?: {
    market?: RankingMarketContext;
    trades?: readonly PaperTrade[];
  }
): WinRateRankedRecommendation[] {
  const market = options?.market ?? {};
  const trades = options?.trades ?? closedTrades(market.asOf);
  const ranked = rankRecommendations(recommendations, {
    market,
    trades,
  });

  return ranked
    .map((rec) => {
      const assessment = assessHistoricalWinRate(rec, trades);
      return {
        ...rec,
        expectedWinRate: assessment.expectedWinRate,
        sampleSize: assessment.sampleSize,
        expectedWinRateEstimated: assessment.expectedWinRateEstimated,
        winRateAssessment: assessment,
      };
    })
    .sort(
      (a, b) =>
        sortKey(b) - sortKey(a) ||
        b.expectedWinRate - a.expectedWinRate ||
        b.institutionalRank - a.institutionalRank ||
        Math.max(b.conviction, b.confidence) -
          Math.max(a.conviction, a.confidence) ||
        b.riskReward - a.riskReward
    );
}

export function buildWinRateFilterReport(
  recommendations: readonly SharedRecommendation[],
  options?: {
    market?: RankingMarketContext;
    trades?: readonly PaperTrade[];
  }
) {
  const ranked = applyHistoricalWinRateFilter(recommendations, options);
  const top = ranked[0] ?? null;
  return {
    generatedAt: new Date().toISOString(),
    candidateCount: ranked.length,
    minSample: WIN_RATE_MIN_SAMPLE,
    recommendations: ranked.map((r) => ({
      recommendationId: r.id,
      symbol: r.symbol,
      company: r.company,
      primaryStrategy: r.primaryStrategy,
      primaryStrategyId: r.primaryStrategyId,
      conviction: r.conviction,
      riskReward: r.riskReward,
      institutionalRank: r.institutionalRank,
      expectedWinRate: r.expectedWinRate,
      sampleSize: r.sampleSize,
      estimated: r.expectedWinRateEstimated,
      expectedWinRateEstimated: r.expectedWinRateEstimated,
      showExpectedWinRate: isExpectedWinRateReliable(r.sampleSize),
      aiConfidence: Math.max(r.confidence, r.conviction),
      historicalConfidence: round2(r.rankingConfidence * 100),
      winRateSuppressedReason: isExpectedWinRateReliable(r.sampleSize)
        ? null
        : WIN_RATE_INSUFFICIENT_REASON,
    })),
    top: top
      ? {
          recommendationId: top.id,
          symbol: top.symbol,
          company: top.company,
          expectedWinRate: isExpectedWinRateReliable(top.sampleSize)
            ? top.expectedWinRate
            : null,
          sampleSize: top.sampleSize,
          estimated: top.expectedWinRateEstimated,
          fallbackUsed: top.expectedWinRateEstimated,
          showExpectedWinRate: isExpectedWinRateReliable(top.sampleSize),
          institutionalRank: top.institutionalRank,
          aiConfidence: Math.max(top.confidence, top.conviction),
          historicalConfidence: round2(top.rankingConfidence * 100),
          reason: isExpectedWinRateReliable(top.sampleSize)
            ? null
            : WIN_RATE_INSUFFICIENT_REASON,
        }
      : null,
    notes: [
      "Historical win rate uses completed paper-trading outcomes only.",
      `Sample < ${WIN_RATE_MIN_SAMPLE} → Expected Win Rate hidden; show AI Confidence, Historical Confidence, Sample Size.`,
      "Does not mutate Published SSOT, Quality Gate, or paper-trading schema.",
    ],
  };
}

/**
 * Dashboard: each horizon shows the highest expectedWinRate pick
 * (Institutional Rank fallback when sample is thin).
 */
export function selectHighestWinRateStrategyDashboard(
  recommendations: readonly SharedRecommendation[],
  lastScanTime: string,
  market?: RankingMarketContext
): InstitutionalStrategySlot[] {
  const ranked = applyHistoricalWinRateFilter(recommendations, { market });
  const byId = new Map(ranked.map((r) => [r.id, r] as const));
  const bySymbol = new Map(ranked.map((r) => [r.symbol.toUpperCase(), r] as const));

  const slots = rankInstitutionalSlotsFromRecommendations(
    [...recommendations],
    lastScanTime,
    {
      scoreOf: (rec) => {
        const wr = byId.get(rec.id);
        if (!wr) return Math.max(rec.conviction, rec.confidence);
        return sortKey(wr);
      },
    }
  );

  return slots.map((slot) => {
    if (!slot.pick) return slot;
    const wr =
      bySymbol.get(slot.pick.symbol.toUpperCase()) ??
      ranked.find(
        (r) =>
          r.symbol.toUpperCase() === slot.pick!.symbol.toUpperCase()
      );
    if (!wr) return slot;
    return {
      ...slot,
      pick: {
        ...slot.pick,
        expectedWinRate: wr.expectedWinRate,
        expectedWinRateEstimated: wr.expectedWinRateEstimated,
        winRateSampleSize: wr.sampleSize,
        showExpectedWinRate: isExpectedWinRateReliable(wr.sampleSize),
        aiConfidence: Math.max(wr.confidence, wr.conviction),
        historicalConfidence: round2(wr.rankingConfidence * 100),
        winRateSuppressedReason: isExpectedWinRateReliable(wr.sampleSize)
          ? null
          : WIN_RATE_INSUFFICIENT_REASON,
      },
    };
  });
}

/** Prefer win-rate dashboard; keep institutional-rank helper available. */
export function selectWinRateAwareStrategyDashboard(
  recommendations: readonly SharedRecommendation[],
  lastScanTime: string,
  market?: RankingMarketContext
): InstitutionalStrategySlot[] {
  if (recommendations.length === 0) {
    return selectByInstitutionalRank(recommendations, lastScanTime, market);
  }
  return selectHighestWinRateStrategyDashboard(
    recommendations,
    lastScanTime,
    market
  );
}
