/**
 * Multi-strategy comparison helpers.
 */

import type { BuiltStrategy, ComparisonHighlight } from "./types";

export function buildComparisonHighlight(
  strategies: readonly BuiltStrategy[]
): ComparisonHighlight {
  if (strategies.length === 0) {
    return {
      bestReturnId: null,
      lowestDrawdownId: null,
      highestSharpeId: null,
      highestWinRateId: null,
      bestRiskRewardId: null,
      bestConsistencyId: null,
    };
  }

  const pickMax = (
    score: (s: BuiltStrategy) => number
  ): string =>
    strategies.reduce((best, s) =>
      score(s) > score(best) ? s : best
    ).id;

  const pickMin = (
    score: (s: BuiltStrategy) => number
  ): string =>
    strategies.reduce((best, s) =>
      score(s) < score(best) ? s : best
    ).id;

  return {
    bestReturnId: pickMax((s) => s.performance.historicalReturn),
    lowestDrawdownId: pickMin((s) => s.performance.maxDrawdown),
    highestSharpeId: pickMax((s) => s.performance.sharpe),
    highestWinRateId: pickMax((s) => s.performance.winRate),
    bestRiskRewardId: pickMax((s) => s.performance.riskReward),
    bestConsistencyId: pickMax((s) => s.scores.consistency),
  };
}

export function resolveComparedStrategies(
  all: readonly BuiltStrategy[],
  ids: readonly string[]
): BuiltStrategy[] {
  const map = new Map(all.map((s) => [s.id, s]));
  return ids.map((id) => map.get(id)).filter((s): s is BuiltStrategy => Boolean(s));
}
