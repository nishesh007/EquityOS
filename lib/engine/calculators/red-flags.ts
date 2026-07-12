/**
 * Red Flag Engine — automatic detection of financial and valuation risks.
 */

import type { EnrichedShareholding } from "@/lib/fundamentals/types";
import type { AnalysisContext } from "@/lib/engine/analysis-context";
import { amountToCrore, round } from "@/lib/engine/utils";
import type { RedFlag, SeverityLevel, ValuationAnalysis } from "@/types";

function severity(score: number): SeverityLevel {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function detectRedFlags(
  ctx: AnalysisContext,
  valuation: ValuationAnalysis
): RedFlag[] {
  const { profile, bundle } = ctx;
  const f = profile.financials;
  const ratios = bundle?.ratios;
  const flags: RedFlag[] = [];
  const isBanking = profile.sector === "Banking";
  const debtThreshold = isBanking ? 7 : 0.8;

  const quarterlyMargins = [...profile.quarterlyResults].reverse().map((q) => q.margin);
  if (quarterlyMargins.length >= 2) {
    const marginDelta = quarterlyMargins.at(-1)! - quarterlyMargins[0];
    if (marginDelta < -1.5) {
      flags.push({
        key: "falling-margins",
        label: "Falling Margins",
        severity: severity(Math.abs(marginDelta) * 20),
        description: `Net margins contracted ${round(Math.abs(marginDelta), 1)}% over recent quarters, signalling pricing or cost pressure.`,
        metric: `${round(quarterlyMargins.at(-1)!)}% net margin`,
      });
    }
  }

  const annualRoe = [...profile.annualFinancials].reverse().map((a) => a.roe);
  if (annualRoe.length >= 2 && annualRoe.at(-1)! < annualRoe[0] - 3) {
    flags.push({
      key: "declining-roe",
      label: "Declining ROE",
      severity: severity((annualRoe[0] - annualRoe.at(-1)!) * 10),
      description: `ROE fell from ${annualRoe[0]}% to ${annualRoe.at(-1)}%, indicating deteriorating capital efficiency.`,
      metric: `${f.roe}% ROE`,
    });
  }

  if (f.debtToEquity > debtThreshold) {
    flags.push({
      key: "increasing-debt",
      label: "Elevated Debt",
      severity: severity((f.debtToEquity / debtThreshold - 1) * 50 + 30),
      description: `Debt-to-equity at ${f.debtToEquity}x exceeds the ${debtThreshold}x threshold for ${profile.sector}.`,
      metric: `${f.debtToEquity}x D/E`,
    });
  }

  const revenueCr = amountToCrore(f.revenue);
  const freeCashFlow = ratios?.freeCashFlow
    ? round(ratios.freeCashFlow / 10_000_000)
    : Math.round(revenueCr * 0.05);
  if (freeCashFlow < 0) {
    flags.push({
      key: "negative-cash-flow",
      label: "Negative Cash Flow",
      severity: "High",
      description: "Free cash flow is negative, requiring external funding for operations and capex.",
      metric: `₹${freeCashFlow.toLocaleString("en-IN")} Cr FCF`,
    });
  }

  const receivablesRatio = ratios?.currentRatio ? 1 / ratios.currentRatio : 0.3;
  if (receivablesRatio > 0.4 && f.revenueGrowth > 15) {
    flags.push({
      key: "high-receivables",
      label: "High Receivables Risk",
      severity: "Medium",
      description: `Strong ${f.revenueGrowth}% revenue growth with tight liquidity may indicate receivables buildup.`,
      metric: `${round(receivablesRatio * 100)}% est. receivables/revenue`,
    });
  }

  const shareholding: EnrichedShareholding = bundle?.shareholding ?? { ...profile.shareholding };
  if (shareholding.changes && shareholding.changes.promoter < -1) {
    flags.push({
      key: "equity-dilution",
      label: "Promoter Stake Reduction",
      severity: severity(Math.abs(shareholding.changes.promoter) * 15),
      description: `Promoter holding reduced ${Math.abs(shareholding.changes.promoter)}% QoQ, signalling potential dilution or stake sale.`,
      metric: `${shareholding.promoter}% promoter`,
    });
  }

  if (f.netProfitGrowth > f.revenueGrowth + 20 && f.revenueGrowth < 10) {
    flags.push({
      key: "weak-earnings-quality",
      label: "Weak Earnings Quality",
      severity: "Medium",
      description: `Profit growth (${f.netProfitGrowth}%) significantly exceeds revenue growth (${f.revenueGrowth}%), suggesting non-operating gains.`,
      metric: `${f.netProfitGrowth}% profit vs ${f.revenueGrowth}% revenue`,
    });
  }

  if (valuation.overallVerdict === "Overvalued" && valuation.marginOfSafety < -5) {
    flags.push({
      key: "valuation-risk",
      label: "High Valuation Risk",
      severity: severity(Math.abs(valuation.marginOfSafety) * 3),
      description: `Trading at ${f.pe}x P/E with ${valuation.marginOfSafety}% negative margin of safety vs intrinsic value ₹${valuation.intrinsicValue.toLocaleString("en-IN")}.`,
      metric: `${f.pe}x P/E`,
    });
  }

  return flags.sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.severity] - order[b.severity];
  });
}
