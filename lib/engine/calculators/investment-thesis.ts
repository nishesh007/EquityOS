/**
 * AI Investment Thesis Engine — institutional research via Sprint 8D narrative engine.
 */

import type { EnrichedShareholding } from "@/lib/fundamentals/types";
import type { AnalysisContext } from "@/lib/engine/analysis-context";
import {
  buildResearchNarrative,
  deriveRecommendation,
  recommendationRationale,
} from "@/lib/valuation";
import type {
  AIInvestmentThesis,
  EquityScore,
  FinancialQualityAnalysis,
  Opportunity,
  RedFlag,
  ValuationAnalysis,
} from "@/types";

export function buildInvestmentThesis(
  ctx: AnalysisContext,
  equityScore: EquityScore,
  financialQuality: FinancialQualityAnalysis,
  valuation: ValuationAnalysis,
  redFlags: RedFlag[],
  technicalScore?: number,
  opportunities: Opportunity[] = []
): AIInvestmentThesis {
  const { profile } = ctx;
  const f = profile.financials;
  const ff = ctx.fundamentals;
  const shareholding: EnrichedShareholding = ctx.bundle?.shareholding ?? { ...profile.shareholding };

  const recommendation = deriveRecommendation({
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
    qualityScore: ff?.qualityScore ?? financialQuality.overallScore,
    financialScore: financialQuality.overallScore,
    technicalScore: technicalScore ?? equityScore.factors.find((x) => x.key === "momentum")?.score ?? 50,
    growthScore: ff?.growthScore ?? equityScore.factors.find((x) => x.key === "growth")?.score ?? 50,
    riskScore: equityScore.factors.find((x) => x.key === "risk")?.score ?? 50,
    cashFlowScore: ff?.financialStrength ?? 55,
    balanceSheetScore: ff?.financialStrength ?? clampBalanceSheet(f.debtToEquity, profile.sector),
    redFlagCount: redFlags.length,
    highSeverityFlags: redFlags.filter((r) => r.severity === "High").length,
  });

  const techScore = technicalScore ?? equityScore.factors.find((x) => x.key === "momentum")?.score ?? 50;
  const technicalSummary =
    techScore >= 60 ? "bullish trend alignment" : techScore >= 45 ? "neutral price structure" : "bearish technical setup";

  const narrative = buildResearchNarrative({
    profile: {
      name: profile.name,
      sector: profile.sector,
      industry: profile.industry,
      price: profile.price,
    },
    financials: {
      roe: f.roe,
      roce: f.roce,
      revenueGrowth: f.revenueGrowth,
      profitGrowth: f.netProfitGrowth,
      debtEquity: f.debtToEquity,
      pe: f.pe,
      pb: f.pb,
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
    qualityScore: ff?.qualityScore ?? financialQuality.overallScore,
    financialQualityScore: financialQuality.overallScore,
    technicalScore: techScore,
    technicalSummary,
    recommendation,
    equityScore: equityScore.overall,
    redFlags,
    opportunities,
    promoterHolding: shareholding.promoter,
    fiiHolding: shareholding.fii,
    diiHolding: shareholding.dii,
  });

  return {
    bullCase: narrative.bullCase,
    bearCase: narrative.bearCase,
    keyRisks: narrative.keyRisks,
    keyCatalysts: narrative.keyCatalysts,
    managementQuality: narrative.managementQuality,
    moat: narrative.moat,
    valuationOpinion: narrative.valuationOpinion,
    fairValue: valuation.intrinsicValue,
    expectedCagr: valuation.expectedCagr,
    confidence: valuation.confidence,
    sections: narrative.sections,
    recommendation,
    recommendationRationale: recommendationRationale(
      recommendation,
      profile.name,
      equityScore.overall,
      f.pe,
      f.roce,
      f.revenueGrowth,
      valuation.intrinsicValue,
      valuation.overallVerdict
    ),
  };
}

function clampBalanceSheet(debtEquity: number, sector: string): number {
  const threshold = sector === "Banking" ? 7 : 0.8;
  return debtEquity <= threshold ? 75 : debtEquity <= threshold * 2 ? 55 : 35;
}
