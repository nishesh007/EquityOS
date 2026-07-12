/**
 * Decision scoring engine — multi-factor composite for institutional AI decisions.
 */

import { clamp, round } from "@/lib/engine/utils";
import { recommendationCompositeScore } from "@/lib/valuation";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import type { RetrievedChunk } from "@/lib/rag/retriever";
import type { InstitutionalMoatAssessment } from "@/lib/research/moatEngine";
import type { InstitutionalRiskAssessment } from "@/lib/research/riskEngine";
import type { InstitutionalValuation } from "@/lib/research/valuationEngine";
import type { EquityIntelligence, Opportunity } from "@/types";

export interface DecisionScoreBundle {
  compositeScore: number;
  valuationScore: number;
  qualityScore: number;
  growthScore: number;
  riskScore: number;
  technicalScore: number;
  moatScore: number;
  financialStrengthScore: number;
  earningsTrendScore: number;
  ragCoverageScore: number;
}

function earningsTrendScore(context: CompanyContext): number {
  const quarters = context.quarterlyResults.slice(0, 4);
  if (quarters.length < 2) return 50;

  const margins = quarters.map((q) => q.margin);
  const eps = quarters.map((q) => q.eps);
  const marginDelta = (margins[0] ?? 0) - (margins.at(-1) ?? 0);
  const epsDelta = (eps[0] ?? 0) - (eps.at(-1) ?? 0);

  let score = 50;
  if (marginDelta > 0.5) score += 15;
  if (marginDelta < -0.5) score -= 15;
  if (epsDelta > 0) score += 12;
  if (epsDelta < 0) score -= 12;

  const latest = context.latestResults;
  if (latest) {
    if (latest.revenueGrowthYoY > 10) score += 8;
    if (latest.netProfitGrowthYoY > latest.revenueGrowthYoY) score += 8;
    if (latest.verdict === "bullish") score += 10;
    if (latest.verdict === "bearish") score -= 10;
  }

  return clamp(Math.round(score), 0, 100);
}

function ragCoverageScore(chunks: RetrievedChunk[]): number {
  if (chunks.length === 0) return 35;
  if (chunks.length >= 8) return 88;
  if (chunks.length >= 5) return 75;
  if (chunks.length >= 2) return 62;
  return 48;
}

export function buildDecisionScores(input: {
  context: CompanyContext;
  valuation: InstitutionalValuation;
  risk: InstitutionalRiskAssessment;
  moat: InstitutionalMoatAssessment;
  intelligence: EquityIntelligence | null;
  ragChunks: RetrievedChunk[];
  opportunities: Opportunity[];
}): DecisionScoreBundle {
  const fi = input.context.financialIntelligence;
  const technical = input.context.technicalIndicators?.score ?? 50;

  const valuationScore = clamp(
    50 +
      input.valuation.marginOfSafety * 0.55 +
      (input.valuation.analysis.overallVerdict === "Undervalued"
        ? 14
        : input.valuation.analysis.overallVerdict === "Overvalued"
          ? -14
          : 0)
  );

  const qualityScore = fi?.scores.qualityScore ?? 50;
  const growthScore = fi?.scores.growthScore ?? 50;
  const riskScore = clamp(100 - input.risk.aggregateRiskScore);
  const technicalScore = clamp(technical);
  const moatScore = clamp(Math.round(input.moat.overallMoatScore * 10));
  const financialStrengthScore =
    fi?.scores.solvencyScore ?? fi?.scores.financialHealthScore ?? 50;
  const earnings = earningsTrendScore(input.context);
  const ragCoverage = ragCoverageScore(input.ragChunks);

  const compositeScore = recommendationCompositeScore({
    valuation: {
      intrinsicValue: input.valuation.intrinsicValue,
      fairValue: input.valuation.fairValue,
      marginOfSafety: input.valuation.marginOfSafety,
      upsidePercent: input.valuation.upsidePercent,
      expectedCagr: input.valuation.analysis.expectedCagr,
      models: input.valuation.analysis.models,
      blendedConfidence: input.valuation.analysis.confidence,
      overallVerdict: input.valuation.analysis.overallVerdict,
      available: input.valuation.analysis.available,
    },
    qualityScore,
    financialScore: financialStrengthScore,
    technicalScore,
    growthScore,
    riskScore: input.risk.aggregateRiskScore,
    cashFlowScore: fi?.scores.financialHealthScore ?? 55,
    balanceSheetScore: financialStrengthScore,
    redFlagCount: input.risk.redFlags.length,
    highSeverityFlags: input.risk.redFlags.filter((flag) => flag.severity === "High").length,
  });

  const weightedComposite = clamp(
    Math.round(
      compositeScore * 0.28 +
        moatScore * 0.12 +
        earnings * 0.15 +
        ragCoverage * 0.05 +
        qualityScore * 0.15 +
        growthScore * 0.1 +
        technicalScore * 0.08 +
        valuationScore * 0.07
    )
  );

  return {
    compositeScore: weightedComposite,
    valuationScore: round(valuationScore),
    qualityScore: round(qualityScore),
    growthScore: round(growthScore),
    riskScore: round(riskScore),
    technicalScore: round(technicalScore),
    moatScore: round(moatScore),
    financialStrengthScore: round(financialStrengthScore),
    earningsTrendScore: round(earnings),
    ragCoverageScore: round(ragCoverage),
  };
}

export function deriveEarningsTrendLabel(context: CompanyContext): string {
  const score = earningsTrendScore(context);
  const latest = context.latestResults;

  if (score >= 70) {
    return latest
      ? `Improving — ${latest.quarter} revenue ${latest.revenueGrowthYoY > 0 ? "+" : ""}${latest.revenueGrowthYoY}% YoY, profit ${latest.netProfitGrowthYoY > 0 ? "+" : ""}${latest.netProfitGrowthYoY}% YoY (${latest.verdict}).`
      : "Improving earnings trajectory across recent quarters.";
  }
  if (score >= 45) {
    return latest
      ? `Mixed — ${latest.quarter} shows ${latest.verdict} signals with moderating momentum.`
      : "Mixed quarterly earnings trend; monitor next results.";
  }
  return latest
    ? `Softening — ${latest.quarter} margin/earnings momentum weakening (${latest.verdict}).`
    : "Softening earnings trend across recent quarters.";
}
