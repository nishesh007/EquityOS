/**
 * AI Research Summary Engine — why buy / why not buy synthesis.
 */

import type { ResearchSummary, ResearchSummaryInput } from "@/lib/valuation/types";

export function buildResearchSummary(input: ResearchSummaryInput): ResearchSummary {
  const { profile, financials: f, valuation, recommendation, decisionScore, redFlags, opportunities, thesis } = input;

  const whyBuy = [
    `${f.roce}% ROCE and ${f.roe}% ROE indicate ${f.roce >= 20 ? "superior" : "adequate"} capital efficiency.`,
    `${f.revenueGrowth}% revenue growth with ${valuation.expectedCagr}% expected earnings CAGR.`,
    thesis.valuationOpinion,
    opportunities.length > 0 ? opportunities[0].description : thesis.bullCase.slice(0, 120),
  ].slice(0, 4);

  const whyNotBuy = [
    thesis.bearCase.slice(0, 140),
    redFlags.length > 0 ? redFlags[0].description : `Premium at ${f.pe}x P/E if growth slows.`,
    f.debtEquity > 1 ? `Leverage at ${f.debtEquity}x debt-to-equity.` : "Sector cyclicality could compress margins.",
  ].slice(0, 3);

  return {
    institutionalSummary: `${profile.name} receives a Decision Score of ${decisionScore}/100 with a ${recommendation} recommendation. The engine synthesizes technical structure, ${f.revenueGrowth}% revenue growth, ${f.roce}% ROCE, and ${thesis.valuationOpinion.toLowerCase()}. Intrinsic value ₹${valuation.intrinsicValue.toLocaleString("en-IN")} with ${valuation.upsidePercent}% upside.`,
    whyBuy,
    whyNotBuy,
    majorRisks: redFlags.length > 0 ? redFlags.map((r) => r.description).slice(0, 4) : thesis.keyRisks,
    majorOpportunities: opportunities.length > 0 ? opportunities.map((o) => o.description).slice(0, 4) : [thesis.bullCase.slice(0, 120)],
    catalysts: thesis.keyCatalysts,
    redFlags: redFlags.map((r) => r.label),
    greenFlags: opportunities.map((o) => o.label).concat(
      f.roce >= 20 ? ["Superior ROCE"] : [],
      f.revenueGrowth >= 15 ? ["Strong revenue growth"] : [],
      valuation.marginOfSafety > 10 ? ["Attractive margin of safety"] : []
    ).slice(0, 5),
  };
}
