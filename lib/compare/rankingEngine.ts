/**
 * Compare ranking engine — overall ranking, verdict derivation, and matrix builders.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InvestorProfile } from "@/lib/ai/decision/decisionEngine";
import type { CompareScorecard, CompareDimensionKey } from "@/lib/compare/scorecardEngine";
import { COMPARE_DIMENSIONS } from "@/lib/compare/scorecardEngine";
import type { RecommendationLevel } from "@/types";

export interface RankedCompareCompany {
  symbol: string;
  name: string;
  sector: string;
  overallScore: number;
  compareRank: number;
  sectorRank: number;
}

export interface CompareAIVerdict {
  winner: { symbol: string; name: string; overallScore: number };
  runnerUp: { symbol: string; name: string; overallScore: number };
  rationale: string[];
  risks: string[];
  suitableInvestor: InvestorProfile[];
  confidence: number;
}

function recommendationRank(rec: RecommendationLevel): number {
  const ranks: Record<RecommendationLevel, number> = {
    "Strong Buy": 7,
    Buy: 6,
    Accumulate: 5,
    Hold: 4,
    Reduce: 3,
    Sell: 2,
    "Strong Sell": 1,
  };
  return ranks[rec];
}

export function rankCompareCompanies(
  companies: Array<{
    symbol: string;
    name: string;
    sector: string;
    overallScore: number;
    recommendation: RecommendationLevel;
    confidenceScore: number;
  }>
): RankedCompareCompany[] {
  const bySector = new Map<string, typeof companies>();

  for (const company of companies) {
    const bucket = bySector.get(company.sector) ?? [];
    bucket.push(company);
    bySector.set(company.sector, bucket);
  }

  const sectorRankMap = new Map<string, number>();
  for (const [, bucket] of bySector) {
    const sorted = [...bucket].sort((a, b) => b.overallScore - a.overallScore);
    sorted.forEach((item, index) => sectorRankMap.set(item.symbol, index + 1));
  }

  const sorted = [...companies].sort((a, b) => {
    if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
    if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
    return recommendationRank(b.recommendation) - recommendationRank(a.recommendation);
  });

  return sorted.map((company, index) => ({
    symbol: company.symbol,
    name: company.name,
    sector: company.sector,
    overallScore: company.overallScore,
    compareRank: index + 1,
    sectorRank: sectorRankMap.get(company.symbol) ?? index + 1,
  }));
}

function topDimensionGaps(
  winner: { symbol: string; scorecard: CompareScorecard },
  runnerUp: { symbol: string; scorecard: CompareScorecard },
  limit = 4
): string[] {
  const gaps: Array<{ label: string; delta: number }> = [];

  for (const dimension of COMPARE_DIMENSIONS) {
    const delta =
      winner.scorecard[dimension.key] - runnerUp.scorecard[dimension.key];
    if (delta > 3) {
      gaps.push({
        label: dimension.label,
        delta: round(delta),
      });
    }
  }

  return gaps
    .sort((a, b) => b.delta - a.delta)
    .slice(0, limit)
    .map((gap) => `${gap.label} (+${gap.delta} pts)`);
}

export function buildCompareAIVerdict(input: {
  ranked: RankedCompareCompany[];
  companies: Array<{
    symbol: string;
    name: string;
    scorecard: CompareScorecard;
    decision: {
      recommendation: RecommendationLevel;
      confidenceScore: number;
      suitableInvestor: InvestorProfile[];
      redFlags: string[];
      reasonsToBuy: string[];
    };
  }>;
}): CompareAIVerdict | null {
  if (input.ranked.length < 2) return null;

  const winnerRank = input.ranked[0];
  const runnerRank = input.ranked[1];
  const winnerData = input.companies.find((c) => c.symbol === winnerRank.symbol);
  const runnerData = input.companies.find((c) => c.symbol === runnerRank.symbol);

  if (!winnerData || !runnerData) return null;

  const dimensionGaps = topDimensionGaps(
    { symbol: winnerData.symbol, scorecard: winnerData.scorecard },
    { symbol: runnerData.symbol, scorecard: runnerData.scorecard }
  );

  const rationale = [
    `**${winnerRank.name}** (${winnerRank.symbol}) leads with an overall score of **${winnerRank.overallScore}/100** vs **${runnerRank.name}** at **${runnerRank.overallScore}/100**.`,
    `Recommendation: ${winnerData.decision.recommendation} vs ${runnerData.decision.recommendation}.`,
  ];

  if (dimensionGaps.length > 0) {
    rationale.push(`Key advantages: ${dimensionGaps.join(", ")}.`);
  }

  if (winnerData.decision.reasonsToBuy[0]) {
    rationale.push(winnerData.decision.reasonsToBuy[0]);
  }

  const risks = [
    ...winnerData.decision.redFlags.slice(0, 2),
    ...runnerData.decision.redFlags.slice(0, 1),
  ].filter(Boolean);

  if (risks.length === 0) {
    risks.push(
      "Monitor relative valuation spreads and quarterly earnings revisions across the peer set."
    );
  }

  const investorSet = new Set<InvestorProfile>();
  for (const company of input.companies) {
    for (const profile of company.decision.suitableInvestor) {
      investorSet.add(profile);
    }
  }

  const avgConfidence = round(
    input.companies.reduce((sum, c) => sum + c.decision.confidenceScore, 0) /
      input.companies.length
  );

  return {
    winner: {
      symbol: winnerRank.symbol,
      name: winnerRank.name,
      overallScore: winnerRank.overallScore,
    },
    runnerUp: {
      symbol: runnerRank.symbol,
      name: runnerRank.name,
      overallScore: runnerRank.overallScore,
    },
    rationale,
    risks: risks.slice(0, 5),
    suitableInvestor: [...investorSet].slice(0, 4),
    confidence: clamp(avgConfidence, 0, 100),
  };
}

export function findDimensionLeaders(
  companies: Array<{ symbol: string; name: string; scorecard: CompareScorecard }>
): Array<{ dimension: CompareDimensionKey; label: string; leader: string; score: number }> {
  return COMPARE_DIMENSIONS.map((dimension) => {
    let leader = companies[0];
    for (const company of companies) {
      if (company.scorecard[dimension.key] > leader.scorecard[dimension.key]) {
        leader = company;
      }
    }
    return {
      dimension: dimension.key,
      label: dimension.label,
      leader: leader.symbol,
      score: leader.scorecard[dimension.key],
    };
  });
}
