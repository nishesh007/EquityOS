/**
 * Research Confidence Engine — Sprint 8D confidence dimensions.
 */

import type { AnalysisContext } from "@/lib/engine/analysis-context";
import { calculateValuationConfidence } from "@/lib/valuation";
import type {
  EquityScore,
  FinancialQualityAnalysis,
  ResearchConfidence,
  ValuationAnalysis,
} from "@/types";

export function calculateResearchConfidence(
  ctx: AnalysisContext,
  equityScore: EquityScore,
  financialQuality: FinancialQualityAnalysis,
  valuation: ValuationAnalysis,
  technicalScore?: number
): ResearchConfidence {
  const businessQuality = equityScore.factors.find((x) => x.key === "business-quality");
  const financialStrength = equityScore.factors.find((x) => x.key === "financial-strength");
  const risk = equityScore.factors.find((x) => x.key === "risk");
  const techScore = technicalScore ?? equityScore.factors.find((x) => x.key === "momentum")?.score ?? 50;

  const result = calculateValuationConfidence({
    businessScore: businessQuality?.score ?? financialQuality.overallScore,
    financialScore: financialStrength?.score ?? financialQuality.overallScore,
    technicalScore: techScore,
    valuationConfidence: valuation.confidence,
    riskScore: risk?.score ?? 50,
    profile: {
      sector: ctx.profile.sector,
      industry: ctx.profile.industry,
      changePercent: ctx.profile.changePercent,
    },
    valuation: {
      intrinsicValue: valuation.intrinsicValue,
      fairValue: valuation.estimatedFairValue,
      marginOfSafety: valuation.marginOfSafety,
      upsidePercent: valuation.upsidePercent,
      expectedCagr: valuation.expectedCagr,
      models: valuation.models,
      blendedConfidence: valuation.confidence,
      overallVerdict: valuation.overallVerdict,
      available: valuation.available,
    },
  });

  return result;
}
