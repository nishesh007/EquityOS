/**
 * AI executive summary — historical results only.
 */

import type { AnalyticsInsight } from "@/lib/analytics/types";
import type { StrategyValidationReport } from "@/lib/backtesting/validation/types";
import { totalReturnPercent } from "@/lib/backtesting/validation/metrics";
import type { ExecutiveSummaryBlock } from "@/lib/backtesting/reports/types";

export function buildExecutiveSummary(
  validation: StrategyValidationReport
): ExecutiveSummaryBlock {
  const best = validation.strategyComparison[0];
  const weakest = [...validation.strategyComparison].sort(
    (a, b) => a.totalReturn - b.totalReturn
  )[0];
  const total = totalReturnPercent(validation.trades);
  const stats = validation.strategyComparison[0]?.statistics;
  const dd = stats?.maximumDrawdown;
  const wr = stats?.winRate;
  const rv = validation.recommendationValidation;

  const reliabilityParts = [
    rv.entryTimingAccuracy != null
      ? `entry timing ${rv.entryTimingAccuracy.toFixed(0)}%`
      : null,
    rv.targetAccuracy != null
      ? `target accuracy ${rv.targetAccuracy.toFixed(0)}%`
      : null,
    rv.recommendationConsistency != null
      ? `consistency ${rv.recommendationConsistency.toFixed(0)}%`
      : null,
  ].filter(Boolean);

  const keyFindings: string[] = [];
  if (best) {
    keyFindings.push(
      `${best.label} leads with ${best.totalReturn.toFixed(2)}% cumulative return.`
    );
  }
  if (validation.benchmarkComparison[0]) {
    const b = validation.benchmarkComparison[0];
    keyFindings.push(
      `Excess vs ${b.benchmarkLabel}: ${b.excessReturn.toFixed(2)} pts.`
    );
  }
  if (validation.failureAnalysis.losingTrades > 0) {
    keyFindings.push(validation.failureAnalysis.summary);
  }

  const improvements = validation.insights
    .filter((i) => i.id === "calibration_gaps" || i.id === "common_failures")
    .map((i) => i.body);

  if (improvements.length === 0) {
    improvements.push(
      "Expand sample size across regimes to stabilize Sharpe/Sortino estimates."
    );
  }

  return {
    overallPerformance: `Filtered sample delivered ${total.toFixed(2)}% cumulative return across ${validation.trades.filter((t) => t.status === "closed").length} closed trades${wr != null ? ` with a ${wr.toFixed(1)}% win rate` : ""}.`,
    bestStrategy: best
      ? `${best.label} (${best.totalReturn.toFixed(2)}% total · PF ${best.statistics.profitFactor ?? "—"})`
      : "Insufficient strategy sample.",
    weakestStrategy: weakest
      ? `${weakest.label} (${weakest.totalReturn.toFixed(2)}% total · win rate ${weakest.statistics.winRate.toFixed(1)}%)`
      : "Insufficient strategy sample.",
    riskAssessment:
      dd == null
        ? "Drawdown not available for the current sample."
        : `Peak-to-trough drawdown on the cumulative return path is approximately ${dd.toFixed(1)}%. ${validation.failureAnalysis.losingTrades} losing trade(s) were classified for failure attribution.`,
    recommendationReliability:
      reliabilityParts.length > 0
        ? `Recommendation quality signals: ${reliabilityParts.join(", ")}.`
        : "Recommendation reliability metrics unavailable for this filter set.",
    keyFindings,
    improvementOpportunities: improvements,
  };
}

export function executiveInsightsFromSummary(
  summary: ExecutiveSummaryBlock
): AnalyticsInsight[] {
  return [
    {
      id: "exec_overall",
      title: "Overall Performance",
      body: summary.overallPerformance,
      tone: "neutral",
    },
    {
      id: "exec_best",
      title: "Best Strategy",
      body: summary.bestStrategy,
      tone: "positive",
    },
    {
      id: "exec_weak",
      title: "Weakest Strategy",
      body: summary.weakestStrategy,
      tone: "caution",
    },
    {
      id: "exec_risk",
      title: "Risk Assessment",
      body: summary.riskAssessment,
      tone: "caution",
    },
    {
      id: "exec_reco",
      title: "Recommendation Reliability",
      body: summary.recommendationReliability,
      tone: "neutral",
    },
  ];
}
