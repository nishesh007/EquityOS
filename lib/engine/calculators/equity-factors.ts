import { createScoreResult, weightedOverallScore } from "@/lib/engine/framework";
import {
  DEFAULT_EQUITY_WEIGHTS,
  type CompanyScoreBundle,
} from "@/lib/engine/types";
import { clamp } from "@/lib/engine/utils";
import type { FinancialFundamentals } from "@/lib/fundamentals/types";
import type { CompanyProfile } from "@/types";

function debtQuality(profile: CompanyProfile, fundamentals?: FinancialFundamentals): number {
  const debtEquity = fundamentals?.debtEquity ?? profile.financials.debtToEquity;
  const isFinancial = profile.sector === "Banking";
  return isFinancial
    ? clamp(78 - Math.max(0, debtEquity - 6) * 5)
    : clamp(92 - debtEquity * 34);
}

function promoterStrength(profile: CompanyProfile): number {
  return profile.shareholding.promoter > 0
    ? clamp(45 + profile.shareholding.promoter * 0.65)
    : 72;
}

/**
 * Computes all six EquityOS factor scores and the weighted overall score.
 * Consumes Sprint 8C FinancialFundamentals when available.
 */
export function calculateEquityScores(
  profile: CompanyProfile,
  fundamentals?: FinancialFundamentals
): CompanyScoreBundle {
  const financials = profile.financials;
  const ff = fundamentals ?? profile.fundamentals;
  const debt = debtQuality(profile, ff);
  const promoter = promoterStrength(profile);

  const roe = ff?.roe ?? financials.roe;
  const roce = ff?.roce ?? financials.roce;
  const revenueGrowth = ff?.revenueCagr ?? financials.revenueGrowth;
  const profitGrowth = ff?.profitCagr ?? financials.netProfitGrowth;
  const pe = ff?.pe ?? financials.pe;
  const pb = ff?.pb ?? financials.pb;

  const businessQuality = createScoreResult({
    key: "business-quality",
    label: "Business Quality",
    category: "quality",
    rawScore: ff?.qualityScore ?? roe * 1.3 + roce * 0.7 + promoter * 0.35,
    weight: DEFAULT_EQUITY_WEIGHTS.businessQuality,
    explanation: `${profile.name} has an established ${profile.industry.toLowerCase()} franchise with ${roe}% ROE and durable sector positioning.`,
    contributingFactors: [
      { key: "roe", label: "ROE", value: roe, weight: 1.3, impact: "positive" },
      { key: "roce", label: "ROCE", value: roce, weight: 0.7, impact: "positive" },
      { key: "promoter", label: "Promoter Strength", value: promoter, weight: 0.35, impact: "positive" },
    ],
  });

  const financialStrength = createScoreResult({
    key: "financial-strength",
    label: "Financial Strength",
    category: "fundamental",
    rawScore: ff?.financialStrength ?? roe * 1.5 + roce * 1.1 + debt * 0.4,
    weight: DEFAULT_EQUITY_WEIGHTS.financialStrength,
    explanation: `${debt >= 70 ? "Balance-sheet resilience is healthy" : "Leverage needs monitoring"}; ROCE is ${roce}% and debt-to-equity is ${ff?.debtEquity ?? financials.debtToEquity}x.`,
    contributingFactors: [
      { key: "roe", label: "ROE", value: roe, weight: 1.5 },
      { key: "roce", label: "ROCE", value: roce, weight: 1.1 },
      { key: "debt-quality", label: "Debt Quality", value: debt, weight: 0.4 },
    ],
  });

  const growth = createScoreResult({
    key: "growth",
    label: "Growth",
    category: "growth",
    rawScore: ff?.growthScore ?? 38 + revenueGrowth * 1.6 + profitGrowth * 1.2,
    weight: DEFAULT_EQUITY_WEIGHTS.growth,
    explanation: `Revenue is growing ${revenueGrowth}% and profit ${profitGrowth}% year-on-year, indicating ${profitGrowth > revenueGrowth ? "operating leverage" : "steady execution"}.`,
    contributingFactors: [
      { key: "revenue-growth", label: "Revenue Growth", value: revenueGrowth, weight: 1.6 },
      { key: "profit-growth", label: "Profit Growth", value: profitGrowth, weight: 1.2 },
    ],
  });

  const valuation = createScoreResult({
    key: "valuation",
    label: "Valuation",
    category: "valuation",
    rawScore: ff?.valuationScore ?? 95 - pe * 1.15 - pb * 1.8 + profitGrowth * 0.7,
    weight: DEFAULT_EQUITY_WEIGHTS.valuation,
    explanation: `At ${pe}x earnings and ${pb}x book, valuation is ${pe < 22 ? "supportive" : pe < 35 ? "reasonable for the growth profile" : "pricing in strong execution"}.`,
    contributingFactors: [
      { key: "pe", label: "P/E", value: pe, weight: -1.15, impact: "negative" },
      { key: "pb", label: "P/B", value: pb, weight: -1.8, impact: "negative" },
      { key: "profit-growth", label: "Profit Growth", value: profitGrowth, weight: 0.7, impact: "positive" },
    ],
  });

  const momentum = createScoreResult({
    key: "momentum",
    label: "Momentum",
    category: "momentum",
    rawScore:
      52 + profile.changePercent * 10 + profitGrowth * 0.7,
    weight: DEFAULT_EQUITY_WEIGHTS.momentum,
    explanation: `Price momentum is ${profile.changePercent >= 0 ? "positive" : "soft"} at ${profile.changePercent > 0 ? "+" : ""}${profile.changePercent}%, supported by ${profitGrowth}% profit growth.`,
    contributingFactors: [
      { key: "change-percent", label: "Price Change", value: profile.changePercent, weight: 10 },
      { key: "profit-growth", label: "Profit Growth", value: profitGrowth, weight: 0.7 },
    ],
  });

  const risk = createScoreResult({
    key: "risk",
    label: "Risk",
    category: "risk",
    rawScore: debt * 0.75 + Math.min(roce, 30) * 1.1,
    weight: DEFAULT_EQUITY_WEIGHTS.risk,
    explanation: `${debt >= 70 ? "Financial risk is contained" : "Risk is elevated by leverage"}; the score also reflects return stability and earnings cyclicality.`,
    contributingFactors: [
      { key: "debt-quality", label: "Debt Quality", value: debt, weight: 0.75 },
      { key: "roce", label: "ROCE Cap", value: Math.min(roce, 30), weight: 1.1 },
    ],
  });

  const factors = [
    businessQuality,
    financialStrength,
    growth,
    valuation,
    momentum,
    risk,
  ];

  const weights = [
    DEFAULT_EQUITY_WEIGHTS.businessQuality,
    DEFAULT_EQUITY_WEIGHTS.financialStrength,
    DEFAULT_EQUITY_WEIGHTS.growth,
    DEFAULT_EQUITY_WEIGHTS.valuation,
    DEFAULT_EQUITY_WEIGHTS.momentum,
    DEFAULT_EQUITY_WEIGHTS.risk,
  ];

  const overall = weightedOverallScore(factors, weights);
  overall.explanation = `${profile.name} scores ${overall.normalizedScore}/100 on EquityOS's blended quality, growth, valuation, momentum and risk framework.`;

  const fundamental = createScoreResult({
    key: "fundamental",
    label: "Fundamental Score",
    category: "fundamental",
    rawScore:
      businessQuality.normalizedScore * 0.35 +
      financialStrength.normalizedScore * 0.35 +
      growth.normalizedScore * 0.3,
    weight: 1,
    explanation: `Composite of business quality (${businessQuality.normalizedScore}), financial strength (${financialStrength.normalizedScore}), and growth (${growth.normalizedScore}).`,
    contributingFactors: [
      { key: "business-quality", label: "Business Quality", value: businessQuality.normalizedScore, weight: 0.35 },
      { key: "financial-strength", label: "Financial Strength", value: financialStrength.normalizedScore, weight: 0.35 },
      { key: "growth", label: "Growth", value: growth.normalizedScore, weight: 0.3 },
    ],
  });

  return {
    overall,
    businessQuality,
    financialStrength,
    growth,
    valuation,
    momentum,
    risk,
    quality: businessQuality,
    fundamental,
  };
}
