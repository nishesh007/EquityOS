/**
 * Institutional Ranking Engine v2.
 * Scores Quality Gate–passed recommendations with historical expectancy.
 * Read-only vs Published SSOT / Quality Gate / paper persistence.
 */

import "server-only";

import { loadPaperTradingState } from "@/lib/paper-trading/persistence";
import type { PaperTrade } from "@/lib/paper-trading/types";
import {
  rankInstitutionalSlotsFromRecommendations,
} from "@/lib/recommendations/institutional-strategy-dashboard";
import type { InstitutionalStrategySlot } from "@/lib/recommendations/institutional-strategy-dashboard";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import {
  buildHistoricalExpectancyTables,
  classifyRegimeText,
  convictionBucketKey,
  liquidityBucketFromText,
  lookupExpectancy,
  mapRecommendationToPaperStrategy,
  resolveSector,
  type ExpectancyStats,
  type HistoricalExpectancyTables,
} from "@/lib/recommendations/institutional-ranking/expectancy";
import type {
  InstitutionalRankingReport,
  RankedRecommendation,
  RankingFactorContribution,
  RankingMarketContext,
  RankingScoreDistribution,
} from "@/lib/recommendations/institutional-ranking/types";

const MIN_SAMPLE = 3;

export const INSTITUTIONAL_RANKING_WEIGHTS = {
  conviction: 0.15,
  riskReward: 0.1,
  expectancyStrategy: 0.15,
  expectancySector: 0.12,
  expectancyRegime: 0.12,
  expectancyConviction: 0.1,
  expectancyLiquidity: 0.08,
  marketBreadth: 0.08,
  sectorStrength: 0.05,
  trendQuality: 0.05,
} as const;

export const INSTITUTIONAL_RANKING_FACTORS = [
  { key: "conviction", label: "Conviction", weight: INSTITUTIONAL_RANKING_WEIGHTS.conviction },
  { key: "riskReward", label: "Risk/Reward", weight: INSTITUTIONAL_RANKING_WEIGHTS.riskReward },
  {
    key: "expectancyStrategy",
    label: "Historical expectancy (strategy)",
    weight: INSTITUTIONAL_RANKING_WEIGHTS.expectancyStrategy,
  },
  {
    key: "expectancySector",
    label: "Historical expectancy (sector)",
    weight: INSTITUTIONAL_RANKING_WEIGHTS.expectancySector,
  },
  {
    key: "expectancyRegime",
    label: "Historical expectancy (regime)",
    weight: INSTITUTIONAL_RANKING_WEIGHTS.expectancyRegime,
  },
  {
    key: "expectancyConviction",
    label: "Historical expectancy (conviction bucket)",
    weight: INSTITUTIONAL_RANKING_WEIGHTS.expectancyConviction,
  },
  {
    key: "expectancyLiquidity",
    label: "Historical expectancy (liquidity bucket)",
    weight: INSTITUTIONAL_RANKING_WEIGHTS.expectancyLiquidity,
  },
  {
    key: "marketBreadth",
    label: "Market Breadth",
    weight: INSTITUTIONAL_RANKING_WEIGHTS.marketBreadth,
  },
  {
    key: "sectorStrength",
    label: "Sector Strength",
    weight: INSTITUTIONAL_RANKING_WEIGHTS.sectorStrength,
  },
  {
    key: "trendQuality",
    label: "Trend quality",
    weight: INSTITUTIONAL_RANKING_WEIGHTS.trendQuality,
  },
] as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Map expectancy % (roughly -10…+10) → 0–100. */
function normalizeExpectancy(expectancy: number): number {
  return round2(clamp(((expectancy + 10) / 20) * 100, 0, 100));
}

function normalizeConviction(conviction: number): number {
  return round2(clamp(conviction, 0, 100));
}

function normalizeRiskReward(rr: number): number {
  // 1.0 → ~33, 1.5 → 50, 3.0 → 100
  return round2(clamp(((rr - 0.5) / 2.5) * 100, 0, 100));
}

function factor(
  key: string,
  label: string,
  weight: number,
  raw: number,
  normalized: number,
  sampleSize: number,
  note?: string
): RankingFactorContribution {
  return {
    key,
    label,
    weight,
    raw: round2(raw),
    normalized: round2(normalized),
    weighted: round2(normalized * weight),
    sampleSize,
    note,
  };
}

function resolveExpectancyFactor(
  stats: ExpectancyStats,
  overall: ExpectancyStats,
  key: string,
  label: string,
  weight: number
): RankingFactorContribution {
  const useOverall = stats.trades < MIN_SAMPLE;
  const effective = useOverall ? overall : stats;
  const note = useOverall
    ? stats.trades === 0
      ? "No closed outcomes — using overall historical expectancy"
      : `Sample ${stats.trades} < ${MIN_SAMPLE} — blending overall expectancy`
    : undefined;
  const raw = effective.expectancy;
  return factor(
    key,
    label,
    weight,
    raw,
    normalizeExpectancy(raw),
    effective.trades,
    note
  );
}

function trendQualityScore(rec: SharedRecommendation): number {
  const trendScore = rec.longTermRanking?.trendScore;
  if (typeof trendScore === "number") {
    return clamp(trendScore, 0, 100);
  }
  // Proxy: framework + opportunity blend (no scanMetrics on SharedRecommendation).
  return clamp(rec.frameworkScore * 0.5 + rec.opportunityScore * 0.5, 0, 100);
}

function sectorStrengthScore(rec: SharedRecommendation): number {
  const fromRanking = rec.longTermRanking?.sectorStrength;
  if (typeof fromRanking === "number" && Number.isFinite(fromRanking)) {
    return clamp(fromRanking, 0, 100);
  }
  return 50;
}

function expectedMetricsFor(
  rec: SharedRecommendation,
  tables: HistoricalExpectancyTables
): { expectedWinRate: number; expectedExpectancy: number; confidence: number } {
  const strategyKey = mapRecommendationToPaperStrategy(rec);
  const sectorKey = resolveSector(rec.symbol);
  const regimeKey = classifyRegimeText(`${rec.marketRegime} ${rec.marketContext}`);
  const convictionKey = convictionBucketKey(Math.max(rec.conviction, rec.confidence));
  const liquidityKey = liquidityBucketFromText(
    rec.evidence.join(" "),
    rec.reasons.join(" ")
  );

  const parts: ExpectancyStats[] = [
    lookupExpectancy(tables, "byStrategy", strategyKey),
    lookupExpectancy(tables, "bySector", sectorKey),
    lookupExpectancy(tables, "byRegime", regimeKey),
    lookupExpectancy(tables, "byConviction", convictionKey),
    lookupExpectancy(tables, "byLiquidity", liquidityKey),
  ].filter((s) => s.trades >= 1);

  if (parts.length === 0) {
    return {
      expectedWinRate: tables.overall.winRate,
      expectedExpectancy: tables.overall.expectancy,
      confidence: tables.closedTradesUsed >= MIN_SAMPLE ? 0.4 : 0.25,
    };
  }

  const totalTrades = parts.reduce((s, p) => s + p.trades, 0);
  const expectedWinRate = round2(
    parts.reduce((s, p) => s + p.winRate * p.trades, 0) / totalTrades
  );
  const expectedExpectancy = round2(
    parts.reduce((s, p) => s + p.expectancy * p.trades, 0) / totalTrades
  );
  const confidence = round2(
    clamp(
      0.35 +
        Math.min(totalTrades, 40) * 0.012 +
        (tables.closedTradesUsed >= MIN_SAMPLE ? 0.1 : 0),
      0.25,
      0.92
    )
  );

  return { expectedWinRate, expectedExpectancy, confidence };
}

export function scoreRecommendation(
  rec: SharedRecommendation,
  tables: HistoricalExpectancyTables,
  market: RankingMarketContext = {}
): RankedRecommendation {
  const strategyKey = mapRecommendationToPaperStrategy(rec);
  const sectorKey = resolveSector(rec.symbol);
  const regimeKey = classifyRegimeText(`${rec.marketRegime} ${rec.marketContext}`);
  const convictionKey = convictionBucketKey(Math.max(rec.conviction, rec.confidence));
  const liquidityKey = liquidityBucketFromText(
    (rec.evidence ?? []).join(" "),
    (rec.reasons ?? []).join(" ")
  );

  const breadth = market.breadthScore ?? 50;
  const factors: RankingFactorContribution[] = [
    factor(
      "conviction",
      "Conviction",
      INSTITUTIONAL_RANKING_WEIGHTS.conviction,
      Math.max(rec.conviction, rec.confidence),
      normalizeConviction(Math.max(rec.conviction, rec.confidence)),
      0
    ),
    factor(
      "riskReward",
      "Risk/Reward",
      INSTITUTIONAL_RANKING_WEIGHTS.riskReward,
      rec.riskReward,
      normalizeRiskReward(rec.riskReward),
      0
    ),
    resolveExpectancyFactor(
      lookupExpectancy(tables, "byStrategy", strategyKey),
      tables.overall,
      "expectancyStrategy",
      "Historical expectancy (strategy)",
      INSTITUTIONAL_RANKING_WEIGHTS.expectancyStrategy
    ),
    resolveExpectancyFactor(
      lookupExpectancy(tables, "bySector", sectorKey),
      tables.overall,
      "expectancySector",
      "Historical expectancy (sector)",
      INSTITUTIONAL_RANKING_WEIGHTS.expectancySector
    ),
    resolveExpectancyFactor(
      lookupExpectancy(tables, "byRegime", regimeKey),
      tables.overall,
      "expectancyRegime",
      "Historical expectancy (regime)",
      INSTITUTIONAL_RANKING_WEIGHTS.expectancyRegime
    ),
    resolveExpectancyFactor(
      lookupExpectancy(tables, "byConviction", convictionKey),
      tables.overall,
      "expectancyConviction",
      "Historical expectancy (conviction bucket)",
      INSTITUTIONAL_RANKING_WEIGHTS.expectancyConviction
    ),
    resolveExpectancyFactor(
      lookupExpectancy(tables, "byLiquidity", liquidityKey),
      tables.overall,
      "expectancyLiquidity",
      "Historical expectancy (liquidity bucket)",
      INSTITUTIONAL_RANKING_WEIGHTS.expectancyLiquidity
    ),
    factor(
      "marketBreadth",
      "Market Breadth",
      INSTITUTIONAL_RANKING_WEIGHTS.marketBreadth,
      breadth,
      clamp(breadth, 0, 100),
      0
    ),
    factor(
      "sectorStrength",
      "Sector Strength",
      INSTITUTIONAL_RANKING_WEIGHTS.sectorStrength,
      sectorStrengthScore(rec),
      sectorStrengthScore(rec),
      0
    ),
    factor(
      "trendQuality",
      "Trend quality",
      INSTITUTIONAL_RANKING_WEIGHTS.trendQuality,
      trendQualityScore(rec),
      trendQualityScore(rec),
      0
    ),
  ];

  const institutionalRank = round2(
    factors.reduce((sum, f) => sum + f.weighted, 0)
  );

  const metrics = expectedMetricsFor(rec, tables);
  const topFactors = [...factors]
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 4);

  const rankReason = [
    `Institutional Rank ${institutionalRank.toFixed(1)}`,
    ...topFactors.map(
      (f) =>
        `${f.label}: ${f.normalized.toFixed(0)} (w=${(f.weight * 100).toFixed(0)}% → ${f.weighted.toFixed(1)})`
    ),
    `Expected expectancy ${metrics.expectedExpectancy}% · win rate ${metrics.expectedWinRate}%`,
    `Buckets: strategy=${strategyKey}, sector=${sectorKey}, regime=${regimeKey}, conviction=${convictionKey}, liquidity=${liquidityKey}`,
  ];

  return {
    ...rec,
    institutionalRank,
    rankReason,
    expectedWinRate: metrics.expectedWinRate,
    expectedExpectancy: metrics.expectedExpectancy,
    rankingConfidence: metrics.confidence,
    confidenceScore: round2(metrics.confidence * 100),
    rankingFactors: factors,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = clamp((sorted.length - 1) * p, 0, sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function buildScoreDistribution(scores: number[]): RankingScoreDistribution {
  if (scores.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p25: 0,
      p75: 0,
      buckets: [],
    };
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const mean = round2(scores.reduce((a, b) => a + b, 0) / scores.length);
  const bucketDefs = [
    { label: "<40", test: (n: number) => n < 40 },
    { label: "40–50", test: (n: number) => n >= 40 && n < 50 },
    { label: "50–60", test: (n: number) => n >= 50 && n < 60 },
    { label: "60–70", test: (n: number) => n >= 60 && n < 70 },
    { label: "70–80", test: (n: number) => n >= 70 && n < 80 },
    { label: "≥80", test: (n: number) => n >= 80 },
  ];
  return {
    min: round2(sorted[0]),
    max: round2(sorted[sorted.length - 1]),
    mean,
    median: round2(percentile(sorted, 0.5)),
    p25: round2(percentile(sorted, 0.25)),
    p75: round2(percentile(sorted, 0.75)),
    buckets: bucketDefs.map((b) => ({
      label: b.label,
      count: scores.filter(b.test).length,
    })),
  };
}

export function rankRecommendations(
  recommendations: readonly SharedRecommendation[],
  options?: {
    market?: RankingMarketContext;
    trades?: readonly PaperTrade[];
  }
): RankedRecommendation[] {
  const market = options?.market ?? {};
  const trades = options?.trades ?? loadPaperTradingState().trades;
  const asOf =
    market.asOf ??
    recommendations.reduce<string | null>((latest, rec) => {
      if (!latest || rec.timestamp > latest) return rec.timestamp;
      return latest;
    }, null);

  const tables = buildHistoricalExpectancyTables(trades, asOf);
  return recommendations
    .filter((rec) => rec.action !== "WATCHLIST")
    .map((rec) => scoreRecommendation(rec, tables, market))
    .sort(
      (a, b) =>
        b.institutionalRank - a.institutionalRank ||
        Math.max(b.conviction, b.confidence) -
          Math.max(a.conviction, a.confidence)
    );
}

export function buildInstitutionalRankingReport(
  recommendations: readonly SharedRecommendation[],
  options?: {
    market?: RankingMarketContext;
    trades?: readonly PaperTrade[];
  }
): InstitutionalRankingReport {
  const ranked = rankRecommendations(recommendations, options);
  const trades = options?.trades ?? loadPaperTradingState().trades;
  const asOf =
    options?.market?.asOf ??
    recommendations.reduce<string | null>((latest, rec) => {
      if (!latest || rec.timestamp > latest) return rec.timestamp;
      return latest;
    }, null);
  const tables = buildHistoricalExpectancyTables(trades, asOf);

  const notes = [
    "Institutional Ranking uses completed paper-trading outcomes only (exitAt ≤ recommendation asOf).",
    "Does not mutate Published SSOT, Quality Gate thresholds, or paper-trading persistence.",
    "Strategy Dashboard picks the highest institutionalRank per horizon at read time.",
  ];
  if (tables.closedTradesUsed < MIN_SAMPLE) {
    notes.push(
      `Closed outcomes sample ${tables.closedTradesUsed} is thin — historical expectancy factors fall back toward overall/neutral.`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    candidateCount: ranked.length,
    closedOutcomesUsed: tables.closedTradesUsed,
    rankingFactors: INSTITUTIONAL_RANKING_FACTORS.map((f) => ({
      key: f.key,
      label: f.label,
      weight: f.weight,
    })),
    ranked,
    top10: ranked.slice(0, 10),
    highest: ranked[0] ?? null,
    lowest: ranked.length > 0 ? ranked[ranked.length - 1] : null,
    scoreDistribution: buildScoreDistribution(
      ranked.map((r) => r.institutionalRank)
    ),
    notes,
  };
}

export function runInstitutionalRanking(
  recommendations: readonly SharedRecommendation[],
  market?: RankingMarketContext
): InstitutionalRankingReport {
  return buildInstitutionalRankingReport(recommendations, { market });
}

/**
 * Re-rank Strategy Dashboard slots by Institutional Rank (highest per horizon).
 * Does not write Published SSOT.
 */
export function selectInstitutionallyRankedStrategyDashboard(
  recommendations: readonly SharedRecommendation[],
  lastScanTime: string,
  market?: RankingMarketContext
): InstitutionalStrategySlot[] {
  const ranked = rankRecommendations(recommendations, { market });
  const scoreById = new Map(
    ranked.map((r) => [r.id, r.institutionalRank] as const)
  );
  return rankInstitutionalSlotsFromRecommendations(
    [...recommendations],
    lastScanTime,
    {
      scoreOf: (rec) =>
        scoreById.get(rec.id) ?? Math.max(rec.conviction, rec.confidence),
    }
  );
}
