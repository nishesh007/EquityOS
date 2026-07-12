/**
 * Compare scorecard engine — 13-dimension institutional comparison scores.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import type { AIDecisionSummary } from "@/lib/ai/decision/decisionEngine";
import type { InstitutionalMoatAssessment } from "@/lib/research/moatEngine";
import type { InstitutionalRating } from "@/lib/research/ratingEngine";
import type { InstitutionalRiskAssessment } from "@/lib/research/riskEngine";
import type { InstitutionalValuation } from "@/lib/research/valuationEngine";
import type { DecisionScoreBundle } from "@/lib/ai/decision/scoringEngine";

export const COMPARE_DIMENSIONS = [
  { key: "business", label: "Business" },
  { key: "financials", label: "Financials" },
  { key: "growth", label: "Growth" },
  { key: "margins", label: "Margins" },
  { key: "cashFlow", label: "Cash Flow" },
  { key: "balanceSheet", label: "Balance Sheet" },
  { key: "valuation", label: "Valuation" },
  { key: "technicals", label: "Technicals" },
  { key: "shareholding", label: "Shareholding" },
  { key: "risk", label: "Risk" },
  { key: "moat", label: "Moat" },
  { key: "management", label: "Management" },
  { key: "capitalAllocation", label: "Capital Allocation" },
] as const;

export type CompareDimensionKey = (typeof COMPARE_DIMENSIONS)[number]["key"];

export type CompareScorecard = Record<CompareDimensionKey, number>;

export interface CompareRadarDimension {
  key: CompareDimensionKey;
  label: string;
  maxScore: number;
  values: Record<string, number>;
}

function scoreShareholding(context: CompanyContext): number {
  const sh = context.shareholding;
  let score = 50;

  if (sh.promoter >= 40 && sh.promoter <= 75) score += 15;
  else if (sh.promoter >= 25) score += 5;
  else score -= 8;

  if (sh.fii >= 10 && sh.fii <= 40) score += 10;
  if (sh.dii >= 5) score += 5;

  const promoterChange = sh.changes?.promoter ?? 0;
  if (promoterChange > 0) score += 5;
  if (promoterChange < -1) score -= 10;

  return clamp(round(score), 0, 100);
}

function scoreMargins(context: CompanyContext): number {
  const fi = context.financialIntelligence;
  if (!fi) return 50;

  const opm = fi.ratios.operatingMargin ?? null;
  const npm = fi.ratios.netMargin ?? null;
  let score = fi.scores.profitabilityScore;

  if (opm != null && opm >= 18) score += 8;
  if (npm != null && npm >= 12) score += 6;
  if (opm != null && opm < 8) score -= 10;

  return clamp(round(score), 0, 100);
}

function scoreCashFlow(context: CompanyContext): number {
  const fi = context.financialIntelligence;
  if (!fi) return 50;

  let score = fi.scores.financialHealthScore;
  const cfoPat = fi.ratios.cfoToPat ?? null;
  const fcf = fi.ttm.freeCashFlow;

  if (cfoPat != null && cfoPat >= 90) score += 10;
  if (cfoPat != null && cfoPat < 60) score -= 12;
  if (fcf != null && fcf > 0) score += 8;
  if (fcf != null && fcf < 0) score -= 15;

  return clamp(round(score), 0, 100);
}

function scoreBalanceSheet(context: CompanyContext): number {
  const fi = context.financialIntelligence;
  if (!fi) return 50;
  return clamp(round(fi.scores.solvencyScore), 0, 100);
}

function scoreCapitalAllocation(context: CompanyContext): number {
  const fi = context.financialIntelligence;
  if (!fi) return 50;

  const roce = fi.ratios.roce ?? 0;
  const roe = fi.ratios.roe ?? 0;
  const debt = fi.ratios.debtToEquity ?? 0;
  const divYield = fi.ratios.dividendYield ?? 0;

  let score = 50;
  if (roce >= 18) score += 15;
  if (roe >= 15) score += 10;
  if (debt <= 0.5) score += 12;
  if (debt > 1.5) score -= 12;
  if (divYield >= 1) score += 5;

  return clamp(round(score), 0, 100);
}

export function buildCompareScorecard(input: {
  context: CompanyContext;
  rating: InstitutionalRating;
  valuation: InstitutionalValuation;
  risk: InstitutionalRiskAssessment;
  moat: InstitutionalMoatAssessment;
  decisionScores: DecisionScoreBundle;
}): CompareScorecard {
  const fi = input.context.financialIntelligence;

  return {
    business: clamp(
      round(
        input.moat.overallMoatScore * 10 * 0.45 +
          (fi?.scores.qualityScore ?? 50) * 0.55
      ),
      0,
      100
    ),
    financials: clamp(round(fi?.scores.financialHealthScore ?? input.rating.dimensions.financialStrength * 10), 0, 100),
    growth: clamp(round(fi?.scores.growthScore ?? input.rating.dimensions.growth * 10), 0, 100),
    margins: scoreMargins(input.context),
    cashFlow: scoreCashFlow(input.context),
    balanceSheet: scoreBalanceSheet(input.context),
    valuation: clamp(round(input.rating.dimensions.valuation * 10), 0, 100),
    technicals: clamp(round(input.rating.dimensions.technical * 10), 0, 100),
    shareholding: scoreShareholding(input.context),
    risk: clamp(round(100 - input.risk.aggregateRiskScore), 0, 100),
    moat: clamp(round(input.moat.overallMoatScore * 10), 0, 100),
    management: clamp(round(input.rating.dimensions.management * 10), 0, 100),
    capitalAllocation: scoreCapitalAllocation(input.context),
  };
}

const DIMENSION_WEIGHTS: Record<CompareDimensionKey, number> = {
  business: 0.1,
  financials: 0.1,
  growth: 0.09,
  margins: 0.07,
  cashFlow: 0.08,
  balanceSheet: 0.08,
  valuation: 0.09,
  technicals: 0.06,
  shareholding: 0.05,
  risk: 0.09,
  moat: 0.08,
  management: 0.06,
  capitalAllocation: 0.05,
};

export function computeOverallCompareScore(scorecard: CompareScorecard): number {
  let total = 0;
  for (const dimension of COMPARE_DIMENSIONS) {
    total += scorecard[dimension.key] * DIMENSION_WEIGHTS[dimension.key];
  }
  return round(clamp(total, 0, 100));
}

export function buildRadarDimensions(
  companies: Array<{ symbol: string; scorecard: CompareScorecard }>
): CompareRadarDimension[] {
  return COMPARE_DIMENSIONS.map((dimension) => ({
    key: dimension.key,
    label: dimension.label,
    maxScore: 100,
    values: Object.fromEntries(
      companies.map((company) => [company.symbol, company.scorecard[dimension.key]])
    ),
  }));
}

export interface StrengthWeaknessEntry {
  symbol: string;
  name: string;
  strengths: Array<{ dimension: string; score: number; label: string }>;
  weaknesses: Array<{ dimension: string; score: number; label: string }>;
}

export function buildStrengthWeaknessMatrix(
  companies: Array<{
    symbol: string;
    name: string;
    scorecard: CompareScorecard;
  }>
): StrengthWeaknessEntry[] {
  return companies.map((company) => {
    const entries = COMPARE_DIMENSIONS.map((dimension) => ({
      dimension: dimension.key,
      label: dimension.label,
      score: company.scorecard[dimension.key],
    }));

    const sorted = [...entries].sort((a, b) => b.score - a.score);

    return {
      symbol: company.symbol,
      name: company.name,
      strengths: sorted.slice(0, 3),
      weaknesses: [...sorted].reverse().slice(0, 3),
    };
  });
}

export interface RecommendationMatrixEntry {
  symbol: string;
  name: string;
  recommendation: AIDecisionSummary["recommendation"];
  confidenceScore: number;
  aiConvictionScore: number;
  positionSizing: AIDecisionSummary["positionSizing"];
  timeHorizon: AIDecisionSummary["timeHorizon"];
}

export function buildRecommendationMatrix(
  companies: Array<{
    symbol: string;
    name: string;
    decision: AIDecisionSummary;
  }>
): RecommendationMatrixEntry[] {
  return companies.map((company) => ({
    symbol: company.symbol,
    name: company.name,
    recommendation: company.decision.recommendation,
    confidenceScore: company.decision.confidenceScore,
    aiConvictionScore: company.decision.aiConvictionScore,
    positionSizing: company.decision.positionSizing,
    timeHorizon: company.decision.timeHorizon,
  }));
}
