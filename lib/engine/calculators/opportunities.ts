/**
 * Opportunity Engine — automatic detection of positive investment signals.
 */

import type { EnrichedShareholding } from "@/lib/fundamentals/types";
import type { AnalysisContext } from "@/lib/engine/analysis-context";
import { amountToCrore, round } from "@/lib/engine/utils";
import type { Opportunity } from "@/types";

export function detectOpportunities(ctx: AnalysisContext): Opportunity[] {
  const { profile, bundle } = ctx;
  const f = profile.financials;
  const shareholding: EnrichedShareholding = bundle?.shareholding ?? { ...profile.shareholding };
  const opportunities: Opportunity[] = [];

  if (f.roce >= 20) {
    opportunities.push({
      key: "high-roce",
      label: "High ROCE",
      description: `ROCE of ${f.roce}% exceeds the 20% institutional quality threshold, indicating efficient capital deployment.`,
      metric: `${f.roce}% ROCE`,
    });
  }

  if (f.roe >= 18) {
    opportunities.push({
      key: "high-roe",
      label: "High ROE",
      description: `Return on equity at ${f.roe}% demonstrates strong shareholder value creation.`,
      metric: `${f.roe}% ROE`,
    });
  }

  const revenueCr = amountToCrore(f.revenue);
  const operatingCashFlow = Math.round(revenueCr * (0.1 + Math.min(f.roce, 30) / 300));
  const freeCashFlow = Math.round(operatingCashFlow * (0.48 + Math.min(f.roe, 30) / 100));
  const fcfGrowth = bundle?.growth?.freeCashFlowGrowth ?? 0;

  if (fcfGrowth > 10 || freeCashFlow > 0) {
    opportunities.push({
      key: "fcf-improving",
      label: "FCF Improving",
      description: `Free cash flow ${fcfGrowth > 0 ? `growing ${fcfGrowth}% YoY` : "positive"} at est. ₹${freeCashFlow.toLocaleString("en-IN")} Cr supports reinvestment and dividends.`,
      metric: `₹${freeCashFlow.toLocaleString("en-IN")} Cr FCF`,
    });
  }

  const isBanking = profile.sector === "Banking";
  const debtThreshold = isBanking ? 7 : 0.8;
  if (f.debtToEquity < debtThreshold * 0.6) {
    opportunities.push({
      key: "debt-reducing",
      label: "Low Leverage",
      description: `Debt-to-equity at ${f.debtToEquity}x provides balance-sheet flexibility for growth or acquisitions.`,
      metric: `${f.debtToEquity}x D/E`,
    });
  }

  if (f.netProfitGrowth > f.revenueGrowth + 5 && f.revenueGrowth > 8) {
    opportunities.push({
      key: "operating-leverage",
      label: "Operating Leverage",
      description: `Profit growing ${f.netProfitGrowth}% vs revenue ${f.revenueGrowth}% indicates positive operating leverage.`,
      metric: `${f.netProfitGrowth}% profit growth`,
    });
  }

  if (shareholding.changes && shareholding.changes.fii + shareholding.changes.dii > 0.5) {
    const instChange = round(shareholding.changes.fii + shareholding.changes.dii, 1);
    opportunities.push({
      key: "institutional-buying",
      label: "Institutional Buying",
      description: `FII/DII holdings increased ${instChange}% QoQ, signalling institutional confidence.`,
      metric: `+${instChange}% institutional`,
    });
  }

  if (shareholding.changes && shareholding.changes.promoter > 0.3) {
    opportunities.push({
      key: "promoter-buying",
      label: "Promoter Buying",
      description: `Promoter stake increased ${shareholding.changes.promoter}% QoQ, aligning management with shareholders.`,
      metric: `+${shareholding.changes.promoter}% promoter`,
    });
  }

  const quarterlyMargins = [...profile.quarterlyResults].reverse().map((q) => q.margin);
  if (quarterlyMargins.length >= 2) {
    const marginDelta = quarterlyMargins.at(-1)! - quarterlyMargins[0];
    if (marginDelta > 1) {
      opportunities.push({
        key: "margin-expansion",
        label: "Margin Expansion",
        description: `Net margins expanded ${round(marginDelta, 1)}% over recent quarters, reflecting pricing power or cost efficiency.`,
        metric: `${round(quarterlyMargins.at(-1)!)}% net margin`,
      });
    }
  }

  return opportunities;
}
