/**
 * AI Research Narrative Engine — institutional-quality research sections.
 */

import type { ResearchNarrative, ResearchNarrativeInput } from "@/lib/valuation/types";
export function buildResearchNarrative(input: ResearchNarrativeInput): ResearchNarrative {
  const { profile, financials: f, valuation, redFlags, opportunities } = input;
  const fairValue = valuation.intrinsicValue;

  const investmentThesis = `${profile.name} scores ${input.equityScore}/100 on EquityOS with ${valuation.overallVerdict.toLowerCase()} valuation. ${input.recommendation} recommendation based on ${f.roce}% ROCE, ${f.revenueGrowth}% revenue growth, and ${f.pe}x P/E. Fair value estimate ₹${fairValue.toLocaleString("en-IN")} implies ${valuation.expectedCagr}% expected CAGR.`;

  const businessQuality = `${profile.name} operates in ${profile.industry} with ${f.roe}% ROE and ${f.roce}% ROCE. ${f.roce >= 20 ? "Capital efficiency exceeds institutional benchmarks." : "Return ratios indicate room for operational improvement."} Promoter holding at ${input.promoterHolding}% ${input.promoterHolding >= 50 ? "signals strong alignment" : "reflects institutional ownership structure"}.`;

  const financialQuality = `Financial quality score ${input.financialQualityScore}/100. Debt at ${f.debtEquity}x D/E ${f.debtEquity < 0.8 ? "is conservative" : "requires monitoring"}. ${f.profitGrowth > 0 ? "Earnings are growing" : "Earnings face headwinds"}. Cash conversion and balance-sheet strength support ${input.financialQualityScore >= 70 ? "high" : "moderate"} financial confidence.`;

  const growthDrivers = `Revenue grew ${f.revenueGrowth}% and profit ${f.profitGrowth}% YoY. ${f.profitGrowth > f.revenueGrowth ? "Operating leverage is positive — profit growth exceeds revenue growth." : "Profit growth tracks or lags revenue, suggesting margin pressure or investment phase."} Expected earnings CAGR of ${valuation.expectedCagr}% over the medium term.`;

  const valuationOpinion = `${valuation.overallVerdict} at ${f.pe}x P/E with ${valuation.marginOfSafety > 0 ? `${valuation.marginOfSafety}% margin of safety` : "limited margin of safety"}. Blended intrinsic value ₹${fairValue.toLocaleString("en-IN")} from ${valuation.models.length} valuation models with ${valuation.upsidePercent}% upside potential.`;

  const technicalStructure = `Technical score ${input.technicalScore}/100 — ${input.technicalSummary}. Price structure ${input.technicalScore >= 60 ? "supports accumulation on dips" : input.technicalScore >= 45 ? "is neutral; await confirmation" : "suggests caution until trend improves"}.`;

  const riskFactors =
    redFlags.length > 0
      ? `${redFlags.length} red flag(s) detected: ${redFlags.slice(0, 3).map((r) => r.label).join(", ")}. ${redFlags[0].description}`
      : `Primary risks include ${profile.sector} cyclicality, competitive intensity in ${profile.industry}, and execution on ${f.revenueGrowth}% growth targets.`;

  const catalysts =
    opportunities.length > 0
      ? opportunities.slice(0, 3).map((o) => o.description).join(" ")
      : `Earnings delivery above ${f.revenueGrowth}% revenue growth, ROCE improvement beyond ${f.roce}%, and sector re-rating in ${profile.industry}.`;

  const bullCase = `${profile.name} can compound earnings through ${f.revenueGrowth}% revenue growth and ${f.roce}% ROCE in ${profile.industry}. ${valuation.overallVerdict === "Undervalued" ? `At ${f.pe}x P/E, valuation offers ${valuation.marginOfSafety}% margin of safety.` : "Sustained execution could re-rate the stock."}`;

  const bearCase = `${valuation.overallVerdict === "Overvalued" ? `Market prices strong execution at ${f.pe}x P/E with negative margin of safety. ` : ""}Slower demand or margin compression at ${f.pe}x earnings could limit upside. ${redFlags.length > 0 ? `Key concern: ${redFlags[0].label}.` : "Competitive intensity remains the primary risk."}`;

  const managementQuality =
    input.promoterHolding >= 50
      ? `Strong promoter alignment at ${input.promoterHolding}% with track record of ${f.roe}% ROE.`
      : `Institutional governance with ${input.fiiHolding + input.diiHolding}% FII+DII ownership.`;

  const moat = `${profile.name}'s ${f.roce >= 20 ? "superior returns and" : ""} scale in ${profile.industry} create ${f.roce >= 20 ? "meaningful" : "moderate"} barriers to entry.`;

  const capitalAllocation = `Management deployed capital at ${f.roce}% ROCE with ${f.debtEquity}x leverage. ${f.profitGrowth > 10 ? "Reinvestment is generating above-cost returns." : "Capital returns are modest; watch for improved deployment."}`;

  const corporateGovernance = `Promoter holding ${input.promoterHolding}%, FII ${input.fiiHolding}%, DII ${input.diiHolding}%. ${input.promoterHolding >= 50 ? "High promoter skin-in-the-game supports governance quality." : "Institutional oversight provides governance checks."}`;

  const researchConclusion = `${input.recommendation} — ${profile.name} at ₹${profile.price.toLocaleString("en-IN")} vs intrinsic ₹${fairValue.toLocaleString("en-IN")}. ${valuation.upsidePercent > 0 ? `${valuation.upsidePercent}% upside` : `${Math.abs(valuation.upsidePercent)}% downside risk`} with ${valuation.expectedCagr}% expected CAGR and ${valuation.blendedConfidence}% valuation confidence.`;

  return {
    sections: [
      { title: "Investment Thesis", content: investmentThesis },
      { title: "Business Quality", content: businessQuality },
      { title: "Financial Quality", content: financialQuality },
      { title: "Growth Drivers", content: growthDrivers },
      { title: "Valuation Opinion", content: valuationOpinion },
      { title: "Technical Structure", content: technicalStructure },
      { title: "Risk Factors", content: riskFactors },
      { title: "Catalysts", content: catalysts },
      { title: "Bear Case", content: bearCase },
      { title: "Bull Case", content: bullCase },
      { title: "Management Quality", content: managementQuality },
      { title: "Moat", content: moat },
      { title: "Capital Allocation", content: capitalAllocation },
      { title: "Corporate Governance", content: corporateGovernance },
      { title: "Research Conclusion", content: researchConclusion },
    ],
    bullCase,
    bearCase,
    keyRisks:
      redFlags.length > 0
        ? redFlags.slice(0, 3).map((r) => r.description)
        : [
            `${profile.sector} demand or regulatory conditions weaken`,
            `Margins fail to keep pace with ${f.revenueGrowth}% revenue growth`,
            f.debtEquity > 1
              ? `Leverage at ${f.debtEquity}x debt-to-equity`
              : "Competitive intensity increases costs",
          ],
    keyCatalysts: [
      `Earnings delivery above ${f.revenueGrowth}% revenue growth`,
      `ROCE improvement beyond ${f.roce}%`,
      valuation.overallVerdict === "Undervalued"
        ? `Re-rating toward fair value ₹${fairValue.toLocaleString("en-IN")}`
        : `Favourable ${profile.industry} cycle`,
    ],
    managementQuality,
    moat,
    valuationOpinion,
  };
}
