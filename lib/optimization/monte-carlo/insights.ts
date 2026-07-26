import type { MonteCarloDashboard, MonteCarloRiskMetrics, SimulationResult } from "./types";
import { aggregateStabilityScore, gradeRisk } from "./metrics";

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Deterministic institutional risk insights (no generative AI).
 */
export function generateMonteCarloInsights(input: {
  results: readonly SimulationResult[];
  stabilityScore: number;
  probabilityOfRuin: number;
  worstDrawdown: number;
}): string[] {
  const insights: string[] = [];
  const { results, stabilityScore, probabilityOfRuin, worstDrawdown } = input;
  if (results.length === 0) {
    return ["No simulations available — run Monte Carlo to generate risk insights."];
  }

  const bearish = results.filter((r) =>
    ["bear_market", "crisis_2008", "covid_2020", "flash_crash"].includes(
      r.scenarioId
    )
  );
  const highVol = results.filter((r) =>
    ["high_volatility", "flash_crash", "covid_2020"].includes(r.scenarioId)
  );

  const avgBear = mean(bearish.map((r) => r.metrics.expectedReturn));
  const avgVolSharpe = mean(highVol.map((r) => r.metrics.sharpe));

  if (avgVolSharpe >= 0.4 && worstDrawdown <= 25) {
    insights.push("Strategy remains stable during high volatility.");
  }
  if (avgBear < -8) {
    insights.push("Significant deterioration during bear markets.");
  }
  if (worstDrawdown <= 20 && probabilityOfRuin <= 25) {
    insights.push("High probability of acceptable drawdown.");
  }
  if (probabilityOfRuin >= 40 || worstDrawdown >= 30) {
    insights.push("Tail-risk exceeds institutional threshold.");
  }
  if (stabilityScore >= 70) {
    insights.push("Strategy demonstrates strong resilience.");
  }
  if (worstDrawdown > 22 || probabilityOfRuin > 30) {
    insights.push("Consider tighter stop-loss parameters.");
  }
  if (insights.length === 0) {
    insights.push("Risk profile is mixed — review scenario comparison and CVaR tails.");
  }
  return insights.slice(0, 7);
}

export function annotateSimulation(
  metrics: MonteCarloRiskMetrics,
  scenarioLabel: string
): Pick<
  SimulationResult,
  "strengths" | "weaknesses" | "riskCommentary" | "suggestions"
> {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (metrics.sharpe >= 0.8) strengths.push("Constructive risk-adjusted Sharpe under stress.");
  if (metrics.maxDrawdown <= 18) strengths.push("Drawdown contained versus institutional budgets.");
  if (metrics.probabilityOfRuin <= 20) strengths.push("Low modeled probability of ruin.");
  if (metrics.probabilityOfTarget >= 55) strengths.push("Reasonable probability of target achievement.");

  if (metrics.maxDrawdown > 25) weaknesses.push("Peak drawdown elevated in this scenario.");
  if (metrics.probabilityOfRuin > 35) weaknesses.push("Ruin probability warrants caution.");
  if (metrics.sharpe < 0.3) weaknesses.push("Weak Sharpe under stressed paths.");
  if (metrics.cvar > 4) weaknesses.push("Conditional VaR indicates heavy left-tail outcomes.");

  if (strengths.length === 0) strengths.push("Baseline observability established for this path.");
  if (weaknesses.length === 0) weaknesses.push("No material red flags versus configured limits.");

  return {
    strengths,
    weaknesses,
    riskCommentary: `${scenarioLabel}: expected return ${metrics.expectedReturn}%, max DD ${metrics.maxDrawdown}%, VaR ${metrics.var}%, CVaR ${metrics.cvar}%, ruin probability ${metrics.probabilityOfRuin}%.`,
    suggestions:
      metrics.maxDrawdown > 22
        ? ["Tighten stops", "Reduce position risk", "Re-run with conservative mode"]
        : ["Maintain risk caps", "Monitor CVaR across combined scenarios"],
  };
}

export function buildMonteCarloDashboard(input: {
  results: SimulationResult[];
  status: MonteCarloDashboard["status"];
}): MonteCarloDashboard {
  const metrics = input.results.map((r) => r.metrics);
  const returns = metrics.map((m) => m.expectedReturn).sort((a, b) => a - b);
  const dds = metrics.map((m) => m.maxDrawdown).sort((a, b) => a - b);
  const median =
    returns.length === 0
      ? 0
      : returns[Math.floor(returns.length / 2)]!;
  const worstDrawdown = dds.length ? dds[dds.length - 1]! : 0;
  const probabilityOfRuin = mean(metrics.map((m) => m.probabilityOfRuin));
  const stability = aggregateStabilityScore(metrics);
  const avgMetrics: MonteCarloRiskMetrics = {
    expectedReturn: mean(metrics.map((m) => m.expectedReturn)),
    medianReturn: median,
    worstReturn: returns[0] ?? 0,
    bestReturn: returns[returns.length - 1] ?? 0,
    maxDrawdown: worstDrawdown,
    averageDrawdown: mean(metrics.map((m) => m.averageDrawdown)),
    recoveryTime: mean(metrics.map((m) => m.recoveryTime)),
    volatility: mean(metrics.map((m) => m.volatility)),
    sharpe: mean(metrics.map((m) => m.sharpe)),
    sortino: mean(metrics.map((m) => m.sortino)),
    calmar: mean(metrics.map((m) => m.calmar)),
    ulcerIndex: mean(metrics.map((m) => m.ulcerIndex)),
    var: mean(metrics.map((m) => m.var)),
    cvar: mean(metrics.map((m) => m.cvar)),
    probabilityOfRuin,
    probabilityOfTarget: mean(metrics.map((m) => m.probabilityOfTarget)),
    profitFactor: mean(metrics.map((m) => m.profitFactor)),
    winRate: mean(metrics.map((m) => m.winRate)),
  };

  const p05 = returns[Math.floor(returns.length * 0.05)] ?? 0;
  const p95Dd = dds[Math.floor(dds.length * 0.95)] ?? 0;

  const insights = generateMonteCarloInsights({
    results: input.results,
    stabilityScore: stability,
    probabilityOfRuin,
    worstDrawdown,
  });

  return {
    totalSimulations: input.results.length,
    status: input.status,
    averageReturn: Number(avgMetrics.expectedReturn.toFixed(2)),
    medianReturn: Number(median.toFixed(2)),
    worstDrawdown: Number(worstDrawdown.toFixed(2)),
    probabilityOfRuin: Number(probabilityOfRuin.toFixed(1)),
    confidence95Return: Number(p05.toFixed(2)),
    confidence95Drawdown: Number(p95Dd.toFixed(2)),
    riskGrade: gradeRisk(avgMetrics),
    overallStabilityScore: stability,
    insights,
  };
}
