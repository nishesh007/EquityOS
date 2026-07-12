/**
 * Financial Quality Engine — scores 16 quality metrics (0–100).
 */

import type { EnrichedShareholding } from "@/lib/fundamentals/types";
import type { AnalysisContext } from "@/lib/engine/analysis-context";
import { createScoreResult } from "@/lib/engine/framework";
import { amountToCrore, clamp, round } from "@/lib/engine/utils";
import type { FinancialQualityAnalysis, QualityScoreItem } from "@/types";

function scoreGrowth(value: number, excellent = 20, good = 10): number {
  if (value >= excellent) return clamp(85 + value * 0.5);
  if (value >= good) return clamp(60 + (value - good) * 2.5);
  if (value >= 0) return clamp(40 + value * 2);
  return clamp(40 + value * 1.5);
}

function scoreReturn(value: number, excellent = 20, good = 15): number {
  if (value >= excellent) return clamp(80 + (value - excellent) * 1.5);
  if (value >= good) return clamp(55 + (value - good) * 5);
  if (value >= 10) return clamp(35 + (value - 10) * 4);
  return clamp(20 + value * 1.5);
}

function scoreDebt(debtToEquity: number, isBanking: boolean): number {
  const threshold = isBanking ? 7 : 0.8;
  if (debtToEquity <= threshold * 0.5) return 90;
  if (debtToEquity <= threshold) return clamp(75 - (debtToEquity - threshold * 0.5) * 20);
  return clamp(50 - (debtToEquity - threshold) * 15);
}

function scoreInterestCoverage(coverage: number): number {
  if (coverage >= 10) return 92;
  if (coverage >= 5) return clamp(70 + (coverage - 5) * 4);
  if (coverage >= 2) return clamp(45 + (coverage - 2) * 8);
  return clamp(20 + coverage * 12);
}

function scoreTrend(current: number, previous: number, higherIsBetter = true): "up" | "down" | "stable" {
  const delta = current - previous;
  if (Math.abs(delta) < 0.5) return "stable";
  return higherIsBetter ? (delta > 0 ? "up" : "down") : (delta < 0 ? "up" : "down");
}

function scoreMarginTrend(margins: number[]): number {
  if (margins.length < 2) return 55;
  const latest = margins.at(-1)!;
  const earliest = margins[0];
  const delta = latest - earliest;
  if (delta >= 2) return clamp(75 + delta * 3);
  if (delta >= 0) return clamp(55 + delta * 10);
  return clamp(55 + delta * 8);
}

function scoreHoldingTrend(change: number, higherIsBetter = true): number {
  if (Math.abs(change) < 0.2) return 60;
  const positive = higherIsBetter ? change > 0 : change < 0;
  return positive ? clamp(70 + Math.abs(change) * 5) : clamp(45 - Math.abs(change) * 8);
}

function scoreDividendConsistency(actions: { type: string }[]): number {
  const dividends = actions.filter((a) => a.type === "Dividend").length;
  if (dividends >= 4) return 88;
  if (dividends >= 2) return 70;
  if (dividends >= 1) return 55;
  return 40;
}

function scoreCapitalAllocation(
  roe: number,
  roce: number,
  profitGrowth: number,
  debtToEquity: number
): number {
  const returnScore = (scoreReturn(roe) + scoreReturn(roce)) / 2;
  const growthBonus = profitGrowth > 10 ? 10 : profitGrowth > 0 ? 5 : 0;
  const debtPenalty = debtToEquity > 1 ? 10 : 0;
  return clamp(returnScore * 0.6 + growthBonus + 25 - debtPenalty);
}

function scoreCashConversion(profitCr: number, fcfCr: number): number {
  if (profitCr <= 0) return fcfCr > 0 ? 65 : 30;
  const ratio = fcfCr / profitCr;
  if (ratio >= 0.8) return clamp(85 + ratio * 10);
  if (ratio >= 0.5) return clamp(60 + (ratio - 0.5) * 50);
  if (ratio >= 0) return clamp(35 + ratio * 50);
  return 25;
}

function scoreWorkingCapital(days: number): number {
  if (days <= 30) return 88;
  if (days <= 60) return clamp(75 - (days - 30) * 0.5);
  if (days <= 90) return clamp(60 - (days - 60) * 0.4);
  return clamp(40 - (days - 90) * 0.3);
}

export function calculateFinancialQuality(ctx: AnalysisContext): FinancialQualityAnalysis {
  const { profile, bundle, fundamentals: ff } = ctx;
  const f = profile.financials;
  const ratios = bundle?.ratios;
  const growth = bundle?.growth;
  const shareholding: EnrichedShareholding = bundle?.shareholding ?? { ...profile.shareholding };
  const isBanking = profile.sector === "Banking";

  const annualChronological = [...profile.annualFinancials].reverse();
  const quarterlyMargins = [...profile.quarterlyResults].reverse().map((q) => q.margin);
  const operatingMargin = ff?.operatingMargin ?? ratios?.operatingMargin ?? (quarterlyMargins.at(-1) ?? 0) + 4;
  const netMargin = ff?.netMargin ?? ratios?.netMargin ?? profile.quarterlyResults[0]?.margin ?? 0;
  const prevOperatingMargin = operatingMargin - (quarterlyMargins.at(-1)! - quarterlyMargins[0]);
  const prevNetMargin = netMargin - (quarterlyMargins.at(-1)! - quarterlyMargins[0]) / 2;

  const revenueCr = amountToCrore(f.revenue);
  const profitCr = amountToCrore(f.netProfit);
  const operatingCashFlow =
    ff?.fcf && ff.fcf !== "—"
      ? amountToCrore(ff.fcf)
      : Math.round(revenueCr * (0.1 + Math.min(f.roce, 30) / 300));
  const freeCashFlow =
    ff?.fcf && ff.fcf !== "—"
      ? amountToCrore(ff.fcf)
      : ratios?.freeCashFlow
        ? round(ratios.freeCashFlow / 10_000_000)
        : Math.round(operatingCashFlow * (0.48 + Math.min(f.roe, 30) / 100));
  const workingCapitalDays = Math.max(18, Math.round(82 - f.roce * 1.8));
  const interestCoverage = ff?.interestCoverage ?? ratios?.interestCoverage ?? (f.debtToEquity > 0 ? 8 : 15);

  const promoterChange = shareholding.changes?.promoter ?? 0;
  const institutionalChange = (shareholding.changes?.fii ?? 0) + (shareholding.changes?.dii ?? 0);
  const epsGrowth = growth?.epsGrowth ?? 0;

  const prevRoe = annualChronological.length >= 2
    ? annualChronological.at(-2)!.roe
    : f.roe - 2;
  const prevRoce = f.roce - 1.5;

  const scores: QualityScoreItem[] = [
    {
      key: "revenue-growth",
      label: "Revenue Growth",
      score: scoreGrowth(f.revenueGrowth),
      explanation: `Revenue grew ${f.revenueGrowth}% YoY${growth?.cagr3Year ? `; 3Y CAGR ${growth.cagr3Year}%` : ""}.`,
      trend: scoreTrend(f.revenueGrowth, 0),
    },
    {
      key: "profit-growth",
      label: "Profit Growth",
      score: scoreGrowth(f.netProfitGrowth),
      explanation: `Net profit grew ${f.netProfitGrowth}% YoY, ${f.netProfitGrowth > f.revenueGrowth ? "indicating operating leverage" : "tracking revenue growth"}.`,
      trend: scoreTrend(f.netProfitGrowth, 0),
    },
    {
      key: "eps-growth",
      label: "EPS Growth",
      score: scoreGrowth(epsGrowth),
      explanation: `EPS growth at ${epsGrowth}% reflects per-share earnings compounding.`,
      trend: scoreTrend(epsGrowth, 0),
    },
    {
      key: "operating-margin",
      label: "Operating Margin Trend",
      score: scoreMarginTrend(quarterlyMargins.map((m) => m + 4)),
      explanation: `Operating margin at ${round(operatingMargin)}% with ${operatingMargin >= prevOperatingMargin ? "expansion" : "contraction"} over recent quarters.`,
      trend: scoreTrend(operatingMargin, prevOperatingMargin),
    },
    {
      key: "net-margin",
      label: "Net Margin Trend",
      score: scoreMarginTrend(quarterlyMargins),
      explanation: `Net margin at ${round(netMargin)}%; ${netMargin >= prevNetMargin ? "improving" : "under pressure"} vs prior periods.`,
      trend: scoreTrend(netMargin, prevNetMargin),
    },
    {
      key: "roe",
      label: "ROE",
      score: scoreReturn(f.roe),
      explanation: `Return on equity of ${f.roe}% ${f.roe >= 20 ? "indicates high capital efficiency" : f.roe >= 15 ? "is acceptable" : "needs improvement"}.`,
      trend: scoreTrend(f.roe, prevRoe),
    },
    {
      key: "roce",
      label: "ROCE",
      score: scoreReturn(f.roce),
      explanation: `ROCE of ${f.roce}% ${f.roce >= 20 ? "exceeds the 20% quality threshold" : "is below institutional quality benchmarks"}.`,
      trend: scoreTrend(f.roce, prevRoce),
    },
    {
      key: "debt",
      label: "Debt",
      score: scoreDebt(f.debtToEquity, isBanking),
      explanation: `Debt-to-equity at ${f.debtToEquity}x ${f.debtToEquity <= (isBanking ? 7 : 0.8) ? "is manageable" : "elevates balance-sheet risk"}.`,
      trend: scoreTrend(f.debtToEquity, f.debtToEquity * 1.1, false),
    },
    {
      key: "interest-coverage",
      label: "Interest Coverage",
      score: scoreInterestCoverage(interestCoverage),
      explanation: `Interest coverage of ${round(interestCoverage, 1)}x ${interestCoverage >= 5 ? "provides comfortable debt servicing capacity" : "signals potential debt stress"}.`,
      trend: interestCoverage >= 5 ? "up" : interestCoverage >= 2 ? "stable" : "down",
    },
    {
      key: "free-cash-flow",
      label: "Free Cash Flow",
      score: freeCashFlow > 0 ? clamp(65 + Math.min(25, freeCashFlow / profitCr * 30)) : 25,
      explanation: `FCF of ₹${freeCashFlow.toLocaleString("en-IN")} Cr ${freeCashFlow > 0 ? "supports dividends and reinvestment" : "is negative, requiring external funding"}.`,
      trend: freeCashFlow > 0 ? "up" : "down",
    },
    {
      key: "working-capital",
      label: "Working Capital",
      score: scoreWorkingCapital(workingCapitalDays),
      explanation: `Estimated cash conversion cycle of ${workingCapitalDays} days ${workingCapitalDays < 60 ? "indicates efficient working capital management" : "suggests capital tied in operations"}.`,
      trend: workingCapitalDays < 60 ? "up" : workingCapitalDays < 90 ? "stable" : "down",
    },
    {
      key: "cash-conversion",
      label: "Cash Conversion",
      score: scoreCashConversion(profitCr, freeCashFlow),
      explanation: `${profitCr > 0 ? `${round((freeCashFlow / profitCr) * 100)}% of profit converts to free cash flow` : "Cash conversion metrics unavailable due to low profitability"}.`,
      trend: freeCashFlow >= profitCr * 0.5 ? "up" : "down",
    },
    {
      key: "promoter-holding",
      label: "Promoter Holding Trend",
      score: scoreHoldingTrend(promoterChange, true),
      explanation: `Promoter holding at ${shareholding.promoter}%${promoterChange !== 0 ? ` (${promoterChange > 0 ? "+" : ""}${promoterChange}% QoQ)` : ""}.`,
      trend: scoreTrend(shareholding.promoter + promoterChange, shareholding.promoter),
    },
    {
      key: "institutional-holding",
      label: "Institutional Holding Trend",
      score: scoreHoldingTrend(institutionalChange, true),
      explanation: `FII ${shareholding.fii}% + DII ${shareholding.dii}%${institutionalChange !== 0 ? ` (${institutionalChange > 0 ? "+" : ""}${round(institutionalChange, 1)}% QoQ)` : ""}.`,
      trend: scoreTrend(institutionalChange, 0),
    },
    {
      key: "dividend-consistency",
      label: "Dividend Consistency",
      score: scoreDividendConsistency(bundle?.corporateActions ?? []),
      explanation: `${(bundle?.corporateActions ?? []).filter((a) => a.type === "Dividend").length || "No recent"} dividend action(s) on record.`,
      trend: "stable",
    },
    {
      key: "capital-allocation",
      label: "Capital Allocation",
      score:
        ff?.capitalAllocationScore ??
        scoreCapitalAllocation(f.roe, f.roce, f.netProfitGrowth, f.debtToEquity),
      explanation: `Capital allocation quality reflects ${f.roe}% ROE, ${f.roce}% ROCE and ${f.netProfitGrowth}% profit growth against ${f.debtToEquity}x leverage.`,
      trend: f.roe >= 15 && f.netProfitGrowth > 0 ? "up" : "stable",
    },
  ];

  const overallRaw = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  const overall = createScoreResult({
    key: "financial-quality",
    label: "Financial Quality",
    category: "quality",
    rawScore: overallRaw,
    explanation: `Composite financial quality score across ${scores.length} metrics.`,
  });

  return {
    overallScore: overall.normalizedScore,
    scores,
  };
}
