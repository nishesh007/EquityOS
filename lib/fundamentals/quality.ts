/**
 * Quality score — composite of profitability, balance sheet, and cash flow quality.
 */

import { normalizeScore, weightedScore } from "@/lib/fundamentals/registry";

export interface QualityScoreInput {
  profitabilityScore: number;
  financialStrength: number;
  cashConversion: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  promoterHolding?: number;
}

function scoreCashQuality(conversion: number | null): number {
  if (conversion === null) return 55;
  if (conversion >= 90) return 92;
  if (conversion >= 70) return normalizeScore(78 + (conversion - 70) * 0.7);
  if (conversion >= 50) return normalizeScore(58 + (conversion - 50) * 1);
  if (conversion >= 0) return normalizeScore(35 + conversion * 0.46);
  return 28;
}

function scoreConsistency(revenueGrowth: number | null, profitGrowth: number | null): number {
  if (revenueGrowth === null || profitGrowth === null) return 55;
  if (revenueGrowth > 0 && profitGrowth > 0 && profitGrowth >= revenueGrowth * 0.8) return 88;
  if (revenueGrowth > 0 && profitGrowth > 0) return 72;
  if (revenueGrowth > 0) return 58;
  if (profitGrowth > 0) return 52;
  return normalizeScore(40 + revenueGrowth * 0.8 + profitGrowth * 0.5);
}

export function computeQualityScore(input: QualityScoreInput): number {
  const {
    profitabilityScore,
    financialStrength,
    cashConversion,
    revenueGrowth,
    profitGrowth,
    promoterHolding,
  } = input;

  const cashScore = scoreCashQuality(cashConversion);
  const consistencyScore = scoreConsistency(revenueGrowth, profitGrowth);
  const alignmentScore =
    promoterHolding !== undefined && promoterHolding > 0
      ? normalizeScore(42 + promoterHolding * 0.65)
      : 62;

  return weightedScore([
    { score: profitabilityScore, weight: 0.3 },
    { score: financialStrength, weight: 0.25 },
    { score: cashScore, weight: 0.2 },
    { score: consistencyScore, weight: 0.15 },
    { score: alignmentScore, weight: 0.1 },
  ]);
}
