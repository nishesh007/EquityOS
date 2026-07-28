/**
 * Consensus Recommendation Engine v1.
 * Final read-time ranking layer after Institutional Rank + Win Rate Filter.
 * Does not mutate Published SSOT / Quality Gate / paper schema.
 */

import "server-only";

import type { RankingMarketContext } from "@/lib/recommendations/institutional-ranking/types";
import type { InstitutionalStrategySlot } from "@/lib/recommendations/institutional-strategy-dashboard";
import { rankInstitutionalSlotsFromRecommendations } from "@/lib/recommendations/institutional-strategy-dashboard";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import {
  applyHistoricalWinRateFilter,
  type WinRateRankedRecommendation,
  WIN_RATE_MIN_SAMPLE,
  WIN_RATE_INSUFFICIENT_REASON,
  isExpectedWinRateReliable,
} from "@/lib/recommendations/win-rate-filter";

const BASE_WEIGHTS = {
  institutionalRank: 0.35,
  expectedWinRate: 0.25,
  conviction: 0.15,
  riskReward: 0.15,
  regimeCompatibility: 0.1,
} as const;

export type ConsensusWeightKey = keyof typeof BASE_WEIGHTS;

export interface ConsensusWeights {
  institutionalRank: number;
  expectedWinRate: number;
  conviction: number;
  riskReward: number;
  regimeCompatibility: number;
}

export interface ConsensusRankedRecommendation extends WinRateRankedRecommendation {
  consensusScore: number;
  consensusRank: number;
  consensusReason: string[];
  consensusConfidence: number;
  consensusWeights: ConsensusWeights;
  usedWinRate: boolean;
  winRateSampleSize: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeRank(institutionalRank: number): number {
  return clamp(institutionalRank, 0, 100);
}

function normalizeWinRate(winRate: number): number {
  return clamp(winRate, 0, 100);
}

function normalizeConviction(conviction: number): number {
  return clamp(conviction, 0, 100);
}

function normalizeRiskReward(rr: number): number {
  // 1.0 → ~33, 1.5 → 50, 3.0 → 100
  return clamp(((rr - 0.5) / 2.5) * 100, 0, 100);
}

function regimeCompatibilityScore(rec: SharedRecommendation): number {
  const text = `${rec.marketRegime} ${rec.marketContext}`.toLowerCase();
  if (/\bbull|\bbullish|risk[- ]?on|strong\s*bull|uptrend/.test(text)) {
    return 78;
  }
  if (/\bbear|\bbearish|risk[- ]?off|weak\s*bear|downtrend/.test(text)) {
    // Long-biased book: mild penalty in bear, not a hard veto.
    return 42;
  }
  return 58;
}

/**
 * If win-rate sample is thin, drop win-rate weight and redistribute
 * proportionally across the remaining factors.
 */
export function resolveConsensusWeights(usedWinRate: boolean): ConsensusWeights {
  if (usedWinRate) {
    return { ...BASE_WEIGHTS };
  }
  const remaining =
    BASE_WEIGHTS.institutionalRank +
    BASE_WEIGHTS.conviction +
    BASE_WEIGHTS.riskReward +
    BASE_WEIGHTS.regimeCompatibility;
  const scale = 1 / remaining;
  return {
    institutionalRank: round2(BASE_WEIGHTS.institutionalRank * scale),
    expectedWinRate: 0,
    conviction: round2(BASE_WEIGHTS.conviction * scale),
    riskReward: round2(BASE_WEIGHTS.riskReward * scale),
    regimeCompatibility: round2(BASE_WEIGHTS.regimeCompatibility * scale),
  };
}

function scoreOne(
  rec: WinRateRankedRecommendation
): Omit<ConsensusRankedRecommendation, "consensusRank"> {
  const winRateSampleSize = rec.sampleSize;
  const useWr =
    !rec.expectedWinRateEstimated && winRateSampleSize >= WIN_RATE_MIN_SAMPLE;
  const weights = resolveConsensusWeights(useWr);

  const parts = {
    institutionalRank: normalizeRank(rec.institutionalRank),
    expectedWinRate: useWr ? normalizeWinRate(rec.expectedWinRate) : 0,
    conviction: normalizeConviction(Math.max(rec.conviction, rec.confidence)),
    riskReward: normalizeRiskReward(rec.riskReward),
    regimeCompatibility: regimeCompatibilityScore(rec),
  };

  const consensusScore = round2(
    parts.institutionalRank * weights.institutionalRank +
      parts.expectedWinRate * weights.expectedWinRate +
      parts.conviction * weights.conviction +
      parts.riskReward * weights.riskReward +
      parts.regimeCompatibility * weights.regimeCompatibility
  );

  const consensusReason = [
    `Consensus ${consensusScore.toFixed(1)} / 100`,
    `Institutional Rank ${rec.institutionalRank.toFixed(1)} × ${(weights.institutionalRank * 100).toFixed(0)}%`,
    useWr
      ? `Expected Win Rate ${rec.expectedWinRate.toFixed(0)}% × ${(weights.expectedWinRate * 100).toFixed(0)}% (n=${winRateSampleSize})`
      : `Win Rate omitted (sample ${winRateSampleSize} < ${WIN_RATE_MIN_SAMPLE}) — weight redistributed`,
    `Conviction ${Math.max(rec.conviction, rec.confidence).toFixed(0)} × ${(weights.conviction * 100).toFixed(0)}%`,
    `Risk/Reward ${rec.riskReward.toFixed(2)} × ${(weights.riskReward * 100).toFixed(0)}%`,
    `Regime compatibility ${parts.regimeCompatibility.toFixed(0)} × ${(weights.regimeCompatibility * 100).toFixed(0)}%`,
  ];

  const consensusConfidence = round2(
    clamp(
      0.4 +
        (useWr ? 0.25 : 0.1) +
        Math.min(winRateSampleSize, 40) * 0.005 +
        Math.min(rec.rankingConfidence, 1) * 0.2,
      0.3,
      0.95
    )
  );

  return {
    ...rec,
    consensusScore,
    consensusReason,
    consensusConfidence,
    consensusWeights: weights,
    usedWinRate: useWr,
    winRateSampleSize,
  };
}

export function applyConsensusEngine(
  recommendations: readonly SharedRecommendation[],
  options?: { market?: RankingMarketContext }
): ConsensusRankedRecommendation[] {
  const winRanked = applyHistoricalWinRateFilter(recommendations, options);
  const scored = winRanked.map(scoreOne);
  scored.sort(
    (a, b) =>
      b.consensusScore - a.consensusScore ||
      b.institutionalRank - a.institutionalRank ||
      b.expectedWinRate - a.expectedWinRate ||
      Math.max(b.conviction, b.confidence) -
        Math.max(a.conviction, a.confidence) ||
      b.riskReward - a.riskReward
  );
  return scored.map((rec, index) => ({
    ...rec,
    consensusRank: index + 1,
  }));
}

export function buildConsensusReport(
  recommendations: readonly SharedRecommendation[],
  options?: { market?: RankingMarketContext }
) {
  const ranked = applyConsensusEngine(recommendations, options);
  return {
    generatedAt: new Date().toISOString(),
    candidateCount: ranked.length,
    minWinRateSample: WIN_RATE_MIN_SAMPLE,
    baseWeights: { ...BASE_WEIGHTS },
    recommendations: ranked.map((r) => ({
      recommendation: {
        id: r.id,
        symbol: r.symbol,
        company: r.company,
        primaryStrategy: r.primaryStrategy,
        primaryStrategyId: r.primaryStrategyId,
        conviction: r.conviction,
        riskReward: r.riskReward,
        institutionalRank: r.institutionalRank,
        expectedWinRate: r.expectedWinRate,
      },
      consensusScore: r.consensusScore,
      consensusRank: r.consensusRank,
      consensusReason: r.consensusReason,
      consensusConfidence: r.consensusConfidence,
      consensusWeights: r.consensusWeights,
      usedWinRate: r.usedWinRate,
      winRateSampleSize: r.winRateSampleSize,
      sampleSize: r.winRateSampleSize,
    })),
    top5: ranked.slice(0, 5).map((r) => ({
      symbol: r.symbol,
      company: r.company,
      consensusScore: r.consensusScore,
      consensusRank: r.consensusRank,
      consensusConfidence: r.consensusConfidence,
      usedWinRate: r.usedWinRate,
      winRateSampleSize: r.winRateSampleSize,
      consensusWeights: r.consensusWeights,
    })),
    notes: [
      "Consensus Engine is a read-time final ranking layer.",
      `When win-rate sample < ${WIN_RATE_MIN_SAMPLE}, win-rate weight is redistributed — no small-sample penalty.`,
      "Does not mutate Published SSOT, Quality Gate, paper schema, or existing API contracts.",
    ],
  };
}

export function selectConsensusStrategyDashboard(
  recommendations: readonly SharedRecommendation[],
  lastScanTime: string,
  market?: RankingMarketContext
): InstitutionalStrategySlot[] {
  const ranked = applyConsensusEngine(recommendations, { market });
  const byId = new Map(ranked.map((r) => [r.id, r] as const));
  const bySymbol = new Map(
    ranked.map((r) => [r.symbol.toUpperCase(), r] as const)
  );

  const slots = rankInstitutionalSlotsFromRecommendations(
    [...recommendations],
    lastScanTime,
    {
      scoreOf: (rec) => {
        const hit = byId.get(rec.id);
        if (!hit) return Math.max(rec.conviction, rec.confidence);
        return (
          hit.consensusScore * 1000 +
          hit.institutionalRank +
          hit.expectedWinRate * 0.01
        );
      },
    }
  );

  return slots.map((slot) => {
    if (!slot.pick) return slot;
    const hit =
      bySymbol.get(slot.pick.symbol.toUpperCase()) ??
      ranked.find(
        (r) => r.symbol.toUpperCase() === slot.pick!.symbol.toUpperCase()
      );
    if (!hit) return slot;
    return {
      ...slot,
      pick: {
        ...slot.pick,
        expectedWinRate: hit.expectedWinRate,
        expectedWinRateEstimated: hit.expectedWinRateEstimated,
        showExpectedWinRate: isExpectedWinRateReliable(hit.winRateSampleSize),
        aiConfidence: Math.max(hit.confidence, hit.conviction),
        historicalConfidence: Math.round(hit.rankingConfidence * 100),
        winRateSuppressedReason: isExpectedWinRateReliable(hit.winRateSampleSize)
          ? null
          : WIN_RATE_INSUFFICIENT_REASON,
        consensusScore: hit.consensusScore,
        consensusRank: hit.consensusRank,
        winRateSampleSize: hit.winRateSampleSize,
      },
    };
  });
}
