/**
 * Institutional rating engine — composite scores and recommendation mapping.
 */

import { clamp, round } from "@/lib/engine/utils";
import { deriveRecommendation } from "@/lib/valuation";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import type {
  EquityIntelligence,
  RecommendationLevel,
  TechnicalAnalysis,
} from "@/types";
import type { InstitutionalMoatAssessment } from "@/lib/research/moatEngine";
import type { InstitutionalRiskAssessment } from "@/lib/research/riskEngine";
import type { InstitutionalValuation } from "@/lib/research/valuationEngine";

export interface InstitutionalRatingDimensions {
  businessQuality: number;
  financialStrength: number;
  valuation: number;
  growth: number;
  risk: number;
  management: number;
  technical: number;
}

export interface InstitutionalRating {
  overallRating: RecommendationLevel;
  overallScore: number;
  dimensions: InstitutionalRatingDimensions;
  rationale: string;
}

function toTenScale(score: number | null | undefined, fallback = 5): number {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return fallback;
  }
  return round(clamp(score / 10, 0, 10), 1);
}

function scoreManagement(
  context: CompanyContext,
  intelligence: EquityIntelligence | null
): number {
  const promoter = context.shareholding.promoter;
  const changes = context.shareholding.changes;
  let score = 5;

  if (promoter >= 50) score += 2;
  else if (promoter >= 35) score += 1;
  else if (promoter < 25) score -= 1;

  if (changes?.promoter && changes.promoter > 0) score += 0.5;
  if (changes?.promoter && changes.promoter < -0.5) score -= 1;

  if (intelligence?.thesis.managementQuality) {
    const text = intelligence.thesis.managementQuality.toLowerCase();
    if (text.includes("strong") || text.includes("proven")) score += 1.5;
    if (text.includes("weak") || text.includes("concern")) score -= 1.5;
  }

  return round(clamp(score, 0, 10), 1);
}

function scoreTechnical(technicals: TechnicalAnalysis | null): number {
  if (!technicals) return 5;
  return round(clamp(technicals.score / 10, 0, 10), 1);
}

function scoreValuationDimension(valuation: InstitutionalValuation): number {
  const upside = valuation.upsidePercent;
  const mos = valuation.marginOfSafety;
  let score = 5;
  if (valuation.analysis.overallVerdict === "Undervalued") score += 2;
  if (valuation.analysis.overallVerdict === "Overvalued") score -= 2;
  if (upside > 20) score += 1.5;
  if (upside < -10) score -= 1.5;
  if (mos > 15) score += 1;
  return round(clamp(score, 0, 10), 1);
}

function scoreRiskDimension(risk: InstitutionalRiskAssessment): number {
  return round(clamp(10 - risk.aggregateRiskScore / 10, 0, 10), 1);
}

function scoreBusinessQuality(
  moat: InstitutionalMoatAssessment,
  context: CompanyContext
): number {
  const fi = context.financialIntelligence;
  const quality = fi?.scores.qualityScore ?? 50;
  const moatComponent = moat.overallMoatScore;
  return round(clamp((quality / 10) * 0.55 + moatComponent * 0.45, 0, 10), 1);
}

export function buildInstitutionalRating(input: {
  context: CompanyContext;
  valuation: InstitutionalValuation;
  risk: InstitutionalRiskAssessment;
  moat: InstitutionalMoatAssessment;
  intelligence: EquityIntelligence | null;
}): InstitutionalRating {
  const { context, valuation, risk, moat, intelligence } = input;
  const fi = context.financialIntelligence;

  const dimensions: InstitutionalRatingDimensions = {
    businessQuality: scoreBusinessQuality(moat, context),
    financialStrength: toTenScale(fi?.scores.solvencyScore ?? fi?.scores.financialHealthScore),
    valuation: scoreValuationDimension(valuation),
    growth: toTenScale(fi?.scores.growthScore),
    risk: scoreRiskDimension(risk),
    management: scoreManagement(context, intelligence),
    technical: scoreTechnical(context.technicalIndicators),
  };

  const overallScore = round(
    clamp(
      dimensions.businessQuality * 10 * 0.18 +
        dimensions.financialStrength * 10 * 0.16 +
        dimensions.valuation * 10 * 0.14 +
        dimensions.growth * 10 * 0.14 +
        dimensions.risk * 10 * 0.12 +
        dimensions.management * 10 * 0.12 +
        dimensions.technical * 10 * 0.14,
      0,
      100
    )
  );

  const recommendation = deriveRecommendation({
    valuation: {
      intrinsicValue: valuation.intrinsicValue,
      fairValue: valuation.fairValue,
      marginOfSafety: valuation.marginOfSafety,
      upsidePercent: valuation.upsidePercent,
      expectedCagr: valuation.analysis.expectedCagr,
      models: valuation.analysis.models,
      blendedConfidence: valuation.analysis.confidence,
      overallVerdict: valuation.analysis.overallVerdict,
      available: valuation.analysis.available,
    },
    qualityScore: fi?.scores.qualityScore ?? dimensions.businessQuality * 10,
    financialScore: fi?.scores.financialHealthScore ?? dimensions.financialStrength * 10,
    technicalScore: dimensions.technical * 10,
    growthScore: fi?.scores.growthScore ?? dimensions.growth * 10,
    riskScore: risk.aggregateRiskScore,
    cashFlowScore: fi?.scores.financialHealthScore ?? 55,
    balanceSheetScore: fi?.scores.solvencyScore ?? dimensions.financialStrength * 10,
    redFlagCount: risk.redFlags.length,
    highSeverityFlags: risk.redFlags.filter((flag) => flag.severity === "High").length,
  });

  const rationale = intelligence?.thesis.recommendationRationale
    ?? `Composite score ${overallScore}/100 across business quality, financial strength, valuation, growth, risk, management, and technical dimensions.`;

  return {
    overallRating: recommendation,
    overallScore,
    dimensions,
    rationale,
  };
}

export function deriveProbabilityMatrix(rating: InstitutionalRating): {
  bull: number;
  base: number;
  bear: number;
} {
  const score = rating.overallScore;
  const bull = clamp(Math.round(20 + score * 0.35), 15, 55);
  const bear = clamp(Math.round(55 - score * 0.3), 15, 45);
  const base = 100 - bull - bear;
  return { bull, base: clamp(base, 20, 60), bear };
}
