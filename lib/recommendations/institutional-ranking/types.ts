/**
 * Institutional Ranking Engine v2 — types.
 * Ranks Quality Gate–passed recommendations using historical expectancy.
 */

import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";

export interface RankingMarketContext {
  breadthScore?: number | null;
  /** ISO cutoff — only paper trades closed at/before this time influence expectancy. */
  asOf?: string | null;
}

export interface RankingFactorContribution {
  key: string;
  label: string;
  weight: number;
  raw: number;
  normalized: number;
  weighted: number;
  sampleSize: number;
  note?: string;
}

export interface RankedRecommendation extends SharedRecommendation {
  institutionalRank: number;
  rankReason: string[];
  expectedWinRate: number;
  expectedExpectancy: number;
  /** Ranking confidence from closed-outcome sample depth (0–1). */
  rankingConfidence: number;
  /** Alias for Intelligence Pack consumers (0–100 scale of rankingConfidence). */
  confidenceScore: number;
  rankingFactors: RankingFactorContribution[];
}

export interface RankingScoreDistribution {
  min: number;
  max: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
  buckets: Array<{ label: string; count: number }>;
}

export interface InstitutionalRankingReport {
  generatedAt: string;
  candidateCount: number;
  closedOutcomesUsed: number;
  rankingFactors: Array<{ key: string; label: string; weight: number }>;
  ranked: RankedRecommendation[];
  top10: RankedRecommendation[];
  lowest: RankedRecommendation | null;
  highest: RankedRecommendation | null;
  scoreDistribution: RankingScoreDistribution;
  notes: string[];
}
