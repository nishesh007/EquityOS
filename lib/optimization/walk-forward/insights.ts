import type {
  RobustnessScore,
  StabilityAnalysis,
  WalkForwardCycleResult,
} from "./types";

/**
 * Rule-based institutional research insights (no generative AI).
 */
export function generateWalkForwardInsights(input: {
  cycles: readonly WalkForwardCycleResult[];
  robustness: RobustnessScore;
  stability: StabilityAnalysis;
}): string[] {
  const { cycles, robustness, stability } = input;
  const insights: string[] = [];
  const evaluated = cycles.filter((c) => c.status !== "Insufficient Data");
  const passed = cycles.filter((c) => c.status === "Passed").length;
  const success =
    cycles.length === 0 ? 0 : (passed / cycles.length) * 100;

  const avgDd =
    evaluated.reduce((s, c) => s + c.metrics.maxDrawdown, 0) /
    Math.max(1, evaluated.length);
  const avgRet =
    evaluated.reduce((s, c) => s + c.metrics.totalReturn, 0) /
    Math.max(1, evaluated.length);
  const avgSharpe =
    evaluated.reduce((s, c) => s + c.metrics.sharpe, 0) /
    Math.max(1, evaluated.length);

  if (success >= 75 && robustness.score >= 70) {
    insights.push("Stable across walk-forward cycles and market regimes sampled.");
  }
  if (avgDd <= 15) {
    insights.push("Drawdown remains within acceptable institutional limits.");
  }
  if (stability.parameterStability >= 75) {
    insights.push("Parameters show high stability across training windows.");
  }
  if (stability.returnConsistency < 45 || stability.metricVariance.totalReturn > 40) {
    insights.push("Performance deteriorates or varies during weaker / sideways regimes.");
  }
  if (robustness.factors.outOfSamplePerformance < 45 && success < 55) {
    insights.push("Evidence of possible overfitting — in-sample edge does not transfer cleanly.");
  }
  if (avgRet < 0 || avgSharpe < 0.4) {
    insights.push("Out-of-sample expectancy is weak; additional optimization recommended.");
  }
  if (robustness.grade === "Excellent" || robustness.grade === "Strong") {
    insights.push("Suitable for production deployment pending risk committee review.");
  }
  if (robustness.grade === "Weak" || robustness.grade === "Poor") {
    insights.push("Additional optimization recommended before capital allocation.");
  }
  if (insights.length === 0) {
    insights.push("Walk-forward results are mixed — review failed cycles and tighten constraints.");
  }

  return insights.slice(0, 7);
}

export function annotateCycleNarrative(
  cycle: WalkForwardCycleResult
): Pick<
  WalkForwardCycleResult,
  "strengths" | "weaknesses" | "aiCommentary" | "suggestions"
> {
  const m = cycle.metrics;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (m.profitFactor >= 1.4) strengths.push("Solid out-of-sample profit factor.");
  if (m.winRate >= 52) strengths.push("Win rate held above institutional floor.");
  if (m.sharpe >= 0.9) strengths.push("Risk-adjusted Sharpe remains constructive.");
  if (m.maxDrawdown <= 15) strengths.push("Drawdown contained on unseen data.");
  if (m.calmarRatio >= 0.8) strengths.push("Calmar ratio indicates healthy recovery profile.");

  if (m.profitFactor < 1.15) weaknesses.push("Profit factor soft on the testing window.");
  if (m.winRate < 48) weaknesses.push("Hit rate leaves limited room for slippage.");
  if (m.maxDrawdown > 18) weaknesses.push("Testing drawdown elevated versus risk budget.");
  if (m.sharpe < 0.5) weaknesses.push("Sharpe indicates weak OOS risk-adjusted edge.");

  if (strengths.length === 0) strengths.push("Meets baseline observability for this cycle.");
  if (weaknesses.length === 0) weaknesses.push("No material OOS red flags versus pass rules.");

  const failed = cycle.failedRules.filter((r) => !r.passed);
  const aiCommentary =
    cycle.status === "Passed"
      ? `Cycle ${cycle.cycle} passed all gates on ${cycle.testing.start}→${cycle.testing.end} with PF ${m.profitFactor}, Sharpe ${m.sharpe}, and DD ${m.maxDrawdown}%.`
      : cycle.status === "Insufficient Data"
        ? `Cycle ${cycle.cycle} produced insufficient trades (${m.totalTrades}) for statistical confidence.`
        : `Cycle ${cycle.cycle} failed ${failed.length} rule(s): ${failed
            .map((r) => r.label)
            .join(", ")}.`;

  const suggestions: string[] = [];
  if (failed.some((r) => r.id === "max_drawdown")) {
    suggestions.push("Tighten stops or reduce holding period before the next training fold.");
  }
  if (failed.some((r) => r.id === "min_win_rate")) {
    suggestions.push("Raise entry quality filters (ADX / volume) in the training selection set.");
  }
  if (failed.some((r) => r.id === "min_sharpe")) {
    suggestions.push("Prefer risk-adjusted ranking when selecting frozen parameters.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Keep parameters frozen and monitor the next rolling fold.");
  }

  return { strengths, weaknesses, aiCommentary, suggestions };
}
