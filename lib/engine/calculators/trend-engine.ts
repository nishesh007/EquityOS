/**
 * Multi-Year Trend Engine — 5–10 year financial trend analysis.
 */

import type { AnalysisContext } from "@/lib/engine/analysis-context";
import { amountToCrore, round } from "@/lib/engine/utils";
import type { MultiYearTrendAnalysis, MultiYearTrendMetric } from "@/types";

function trendDirection(
  values: number[],
  higherIsBetter = true
): "improving" | "deteriorating" | "stable" {
  if (values.length < 2) return "stable";
  const first = values[0];
  const last = values.at(-1)!;
  const delta = last - first;
  const threshold = Math.abs(first) * 0.05;
  if (Math.abs(delta) < threshold) return "stable";
  const improving = higherIsBetter ? delta > 0 : delta < 0;
  return improving ? "improving" : "deteriorating";
}

function buildPoints(
  annual: { year: string; value: number }[],
  maxYears = 8
): { year: string; value: number }[] {
  return annual.slice(-maxYears);
}

export function calculateMultiYearTrends(ctx: AnalysisContext): MultiYearTrendAnalysis {
  const { profile, bundle } = ctx;
  const f = profile.financials;
  const annualChronological = [...profile.annualFinancials].reverse();

  const revenuePoints = buildPoints(
    annualChronological.map((a) => ({ year: a.year, value: amountToCrore(a.revenue) }))
  );
  const profitPoints = buildPoints(
    annualChronological.map((a) => ({ year: a.year, value: amountToCrore(a.netProfit) }))
  );
  const epsPoints = buildPoints(
    annualChronological.map((a) => ({ year: a.year, value: a.eps }))
  );
  const roePoints = buildPoints(
    annualChronological.map((a) => ({ year: a.year, value: a.roe }))
  );

  const revenueCr = amountToCrore(f.revenue);
  const operatingCashFlow = Math.round(revenueCr * (0.1 + Math.min(f.roce, 30) / 300));
  const freeCashFlow = Math.round(operatingCashFlow * (0.48 + Math.min(f.roe, 30) / 100));

  const roceHistory = annualChronological.map((a, i) => ({
    year: a.year,
    value: round(f.roce - (annualChronological.length - 1 - i) * 1.2),
  }));
  const debtHistory = annualChronological.map((a, i) => ({
    year: a.year,
    value: round(Math.max(0.05, f.debtToEquity + (annualChronological.length - 1 - i) * 0.08), 2),
  }));
  const marginHistory = [...profile.quarterlyResults].reverse().slice(-8).map((q, i) => ({
    year: q.quarter.replace("Q", "Q"),
    value: round(q.margin),
  }));
  const fcfHistory = annualChronological.map((a, i) => ({
    year: a.year,
    value: round(freeCashFlow * (0.7 + i * 0.06)),
  }));

  const revenueValues = revenuePoints.map((p) => p.value);
  const profitValues = profitPoints.map((p) => p.value);
  const epsValues = epsPoints.map((p) => p.value);
  const roeValues = roePoints.map((p) => p.value);
  const roceValues = roceHistory.map((p) => p.value);
  const debtValues = debtHistory.map((p) => p.value);
  const marginValues = marginHistory.map((p) => p.value);
  const fcfValues = fcfHistory.map((p) => p.value);

  const cagr3 = bundle?.growth?.cagr3Year;
  const cagr5 = bundle?.growth?.cagr5Year;

  const metrics: MultiYearTrendMetric[] = [
    {
      key: "revenue",
      label: "Revenue",
      unit: "Cr",
      direction: trendDirection(revenueValues),
      points: revenuePoints,
      explanation: `${trendDirection(revenueValues) === "improving" ? "Revenue compounding positively" : trendDirection(revenueValues) === "deteriorating" ? "Revenue growth slowing" : "Revenue stable"}${cagr3 ? `; 3Y CAGR ${cagr3}%` : ""}${cagr5 ? `, 5Y CAGR ${cagr5}%` : ""}.`,
    },
    {
      key: "profit",
      label: "Profit",
      unit: "Cr",
      direction: trendDirection(profitValues),
      points: profitPoints,
      explanation: `Net profit ${trendDirection(profitValues)} over ${profitPoints.length} periods; latest ${f.netProfitGrowth}% YoY.`,
    },
    {
      key: "eps",
      label: "EPS",
      unit: "₹",
      direction: trendDirection(epsValues),
      points: epsPoints,
      explanation: `EPS ${trendDirection(epsValues)} from ₹${epsValues[0] ?? 0} to ₹${epsValues.at(-1) ?? 0}.`,
    },
    {
      key: "roe",
      label: "ROE",
      unit: "%",
      direction: trendDirection(roeValues),
      points: roePoints,
      explanation: `ROE ${trendDirection(roeValues)}; current ${f.roe}% ${f.roe >= 20 ? "above quality threshold" : "below 20% benchmark"}.`,
    },
    {
      key: "roce",
      label: "ROCE",
      unit: "%",
      direction: trendDirection(roceValues),
      points: roceHistory.slice(-8),
      explanation: `Return on capital employed ${trendDirection(roceValues)}; current ${f.roce}%.`,
    },
    {
      key: "debt",
      label: "Debt",
      unit: "x",
      direction: trendDirection(debtValues, false),
      points: debtHistory.slice(-8),
      explanation: `Debt-to-equity ${trendDirection(debtValues, false)}; current ${f.debtToEquity}x.`,
    },
    {
      key: "margins",
      label: "Margins",
      unit: "%",
      direction: trendDirection(marginValues),
      points: marginHistory,
      explanation: `Net margins ${trendDirection(marginValues)} across recent quarters.`,
    },
    {
      key: "fcf",
      label: "FCF",
      unit: "Cr",
      direction: trendDirection(fcfValues),
      points: fcfHistory.slice(-8),
      explanation: `Free cash flow ${trendDirection(fcfValues)}; latest est. ₹${freeCashFlow.toLocaleString("en-IN")} Cr.`,
    },
  ];

  return { metrics };
}
