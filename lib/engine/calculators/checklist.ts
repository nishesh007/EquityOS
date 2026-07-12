import { createScoreResult } from "@/lib/engine/framework";
import type { ScoreResult } from "@/lib/engine/types";
import type { CompanyProfile, EquityScore, InvestmentChecklist } from "@/types";

export function calculateChecklistScore(
  profile: CompanyProfile,
  equityScore: EquityScore
): { checklist: InvestmentChecklist; scoreResult: ScoreResult } {
  const financials = profile.financials;
  const latestMargin = profile.quarterlyResults[0]?.margin ?? 0;
  const priorMargin = profile.quarterlyResults.at(-1)?.margin ?? latestMargin;
  const valuationFactor = equityScore.factors.find((item) => item.key === "valuation");

  const items = [
    {
      key: "revenue",
      label: "Revenue Growing",
      passed: financials.revenueGrowth > 5,
      detail: `${financials.revenueGrowth}% YoY`,
    },
    {
      key: "profit",
      label: "Profit Growing",
      passed: financials.netProfitGrowth > 5,
      detail: `${financials.netProfitGrowth}% YoY`,
    },
    {
      key: "roce",
      label: "ROCE >20",
      passed: financials.roce > 20,
      detail: `${financials.roce}%`,
    },
    {
      key: "debt",
      label: "Debt Low",
      passed: financials.debtToEquity < (profile.sector === "Banking" ? 7 : 0.8),
      detail: `${financials.debtToEquity}x D/E`,
    },
    {
      key: "cash-flow",
      label: "Cash Flow Positive",
      passed: financials.netProfitGrowth > 0,
      detail: "Positive operating cash flow",
    },
    {
      key: "promoter",
      label: "Promoter Holding Strong",
      passed: profile.shareholding.promoter >= 45 || profile.sector === "Banking",
      detail: `${profile.shareholding.promoter}% promoter`,
    },
    {
      key: "valuation",
      label: "Valuation Attractive",
      passed: (valuationFactor?.score ?? 0) >= 55,
      detail: `${financials.pe}x P/E`,
    },
    {
      key: "technical",
      label: "Technical Trend Positive",
      passed: profile.changePercent > 0 || latestMargin > priorMargin,
      detail: `${profile.changePercent > 0 ? "+" : ""}${profile.changePercent}% session`,
    },
  ];

  const passed = items.filter((item) => item.passed).length;
  const rawScore = (passed / items.length) * 100;

  const scoreResult = createScoreResult({
    key: "checklist",
    label: "Checklist Score",
    category: "checklist",
    rawScore,
    explanation: `${passed} of ${items.length} investment checklist criteria passed.`,
    contributingFactors: items.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.passed ? "passed" : "failed",
      impact: item.passed ? "positive" : "negative",
    })),
  });

  return {
    checklist: { score: scoreResult.normalizedScore, items },
    scoreResult,
  };
}
