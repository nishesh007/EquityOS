/**
 * AI Recommendation Engine — composite recommendation from multi-factor analysis.
 */

import { clamp } from "@/lib/engine/utils";
import type { RecommendationLevel } from "@/types";
import type { RecommendationInput } from "@/lib/valuation/types";

const WEIGHTS = {
  valuation: 0.22,
  quality: 0.18,
  technical: 0.14,
  growth: 0.14,
  risk: 0.12,
  cashFlow: 0.1,
  balanceSheet: 0.1,
};

export function deriveRecommendation(input: RecommendationInput): RecommendationLevel {
  const valuationScore = clamp(
    50 +
      input.valuation.marginOfSafety * 0.6 +
      (input.valuation.overallVerdict === "Undervalued"
        ? 15
        : input.valuation.overallVerdict === "Overvalued"
          ? -15
          : 0)
  );

  const composite = clamp(
    valuationScore * WEIGHTS.valuation +
      input.qualityScore * WEIGHTS.quality +
      input.technicalScore * WEIGHTS.technical +
      input.growthScore * WEIGHTS.growth +
      input.riskScore * WEIGHTS.risk +
      input.cashFlowScore * WEIGHTS.cashFlow +
      input.balanceSheetScore * WEIGHTS.balanceSheet
  );

  const undervalued = input.valuation.overallVerdict === "Undervalued";
  const overvalued = input.valuation.overallVerdict === "Overvalued";
  const technicalWeak = input.technicalScore < 42;

  if (composite >= 82 && undervalued && input.highSeverityFlags === 0) return "Strong Buy";
  if (composite >= 74 && input.highSeverityFlags <= 1 && !technicalWeak) return "Buy";
  if (composite >= 65 && !overvalued) return "Accumulate";
  if (composite >= 52) return "Hold";
  if (composite >= 38 || input.highSeverityFlags >= 2) return "Reduce";
  if (composite >= 28) return "Sell";
  return "Strong Sell";
}

export function recommendationRationale(
  rec: RecommendationLevel,
  name: string,
  score: number,
  pe: number,
  roce: number,
  revenueGrowth: number,
  intrinsicValue: number,
  verdict: string
): string {
  switch (rec) {
    case "Strong Buy":
      return `EquityOS Score ${score}/100 with ${verdict.toLowerCase()} valuation at ${pe}x P/E and ${roce}% ROCE supports aggressive accumulation.`;
    case "Buy":
      return `Quality metrics (${roce}% ROCE, ${revenueGrowth}% revenue growth) outweigh valuation concerns at ${pe}x earnings.`;
    case "Accumulate":
      return `Solid fundamentals warrant gradual accumulation; monitor ${verdict.toLowerCase()} valuation at fair value ₹${intrinsicValue.toLocaleString("en-IN")}.`;
    case "Hold":
      return `Mixed signals — ${revenueGrowth}% growth vs ${pe}x P/E; maintain existing position and reassess on earnings.`;
    case "Reduce":
      return `Elevated risks or premium valuation (${pe}x P/E) suggest trimming exposure ahead of potential de-rating.`;
    case "Sell":
      return `Deteriorating quality metrics and ${verdict.toLowerCase()} valuation at ${pe}x P/E warrant exit.`;
    case "Strong Sell":
      return `Multiple high-severity risks and ${verdict.toLowerCase()} valuation at ${pe}x P/E — immediate de-risking recommended.`;
  }
}

export function recommendationCompositeScore(input: RecommendationInput): number {
  const valuationScore = clamp(
    50 +
      input.valuation.marginOfSafety * 0.6 +
      (input.valuation.overallVerdict === "Undervalued"
        ? 15
        : input.valuation.overallVerdict === "Overvalued"
          ? -15
          : 0)
  );

  return clamp(
    valuationScore * WEIGHTS.valuation +
      input.qualityScore * WEIGHTS.quality +
      input.technicalScore * WEIGHTS.technical +
      input.growthScore * WEIGHTS.growth +
      input.riskScore * WEIGHTS.risk +
      input.cashFlowScore * WEIGHTS.cashFlow +
      input.balanceSheetScore * WEIGHTS.balanceSheet
  );
}
