import type {
  OptimizationResult,
  RankingMetric,
  RankingMode,
} from "./types";

function metricValue(result: OptimizationResult, metric: RankingMetric): number {
  switch (metric) {
    case "profitFactor":
      return result.metrics.profitFactor;
    case "winRate":
      return result.metrics.winRate;
    case "riskReward":
      return result.metrics.riskReward;
    case "sharpe":
      return result.metrics.sharpe;
    case "sortino":
      return result.metrics.sortino;
    case "maxDrawdown":
      return -result.metrics.maxDrawdown;
    case "expectancy":
      return result.metrics.expectancy;
    case "cagr":
      return result.metrics.cagr;
    case "avgReturn":
      return result.metrics.avgReturn;
    case "score":
      return result.score;
    default:
      return result.score;
  }
}

function weightedScore(result: OptimizationResult): number {
  const m = result.metrics;
  return (
    m.profitFactor * 20 +
    m.winRate * 0.4 +
    m.sharpe * 14 +
    m.sortino * 10 +
    m.riskReward * 8 +
    m.expectancy * 6 +
    m.cagr * 0.5 -
    m.maxDrawdown * 0.7
  );
}

function balancedScore(result: OptimizationResult): number {
  const m = result.metrics;
  return (
    m.profitFactor * 14 +
    m.winRate * 0.45 +
    m.sharpe * 10 +
    m.riskReward * 8 +
    m.cagr * 0.35 -
    m.maxDrawdown * 0.5
  );
}

function riskAdjustedScore(result: OptimizationResult): number {
  const m = result.metrics;
  return (
    m.sharpe * 22 +
    m.sortino * 18 +
    m.profitFactor * 8 +
    m.riskReward * 6 -
    m.maxDrawdown * 1.1 +
    m.expectancy * 4
  );
}

export function computeRankingScore(
  result: OptimizationResult,
  mode: RankingMode,
  primary: RankingMetric
): number {
  switch (mode) {
    case "single":
      return metricValue(result, primary);
    case "weighted":
      return weightedScore(result);
    case "risk_adjusted":
      return riskAdjustedScore(result);
    case "balanced":
    default:
      return balancedScore(result);
  }
}

/**
 * Rank results in-place semantics — returns a new sorted array with ranks assigned.
 */
export function rankResults(
  results: readonly OptimizationResult[],
  mode: RankingMode,
  primary: RankingMetric
): OptimizationResult[] {
  const scored = results.map((r) => ({
    ...r,
    score: Number(computeRankingScore(r, mode, primary).toFixed(2)),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.metrics.profitFactor - a.metrics.profitFactor;
  });

  return scored.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function sortResultsByMetric(
  results: readonly OptimizationResult[],
  metric: RankingMetric,
  direction: "asc" | "desc" = "desc"
): OptimizationResult[] {
  const mul = direction === "asc" ? 1 : -1;
  return [...results].sort((a, b) => {
    const av = metric === "maxDrawdown" ? a.metrics.maxDrawdown : metricValue(a, metric);
    const bv = metric === "maxDrawdown" ? b.metrics.maxDrawdown : metricValue(b, metric);
    if (metric === "maxDrawdown") return (av - bv) * (direction === "asc" ? 1 : -1);
    return (av - bv) * mul;
  });
}
