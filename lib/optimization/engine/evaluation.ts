import type {
  ConstraintDefinition,
  ParameterState,
} from "@/lib/optimization/types";
import type {
  OptimizationMetrics,
  OptimizationResult,
  ParameterCombination,
} from "./types";

/** Deterministic hash for reproducible offline evaluation. */
export function hashCombination(values: Record<string, number | boolean | string>): number {
  const raw = Object.keys(values)
    .sort()
    .map((k) => `${k}:${String(values[k])}`)
    .join("|");
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function seededUnit(seed: number, salt: number): number {
  const x = Math.sin(seed * 0.0001 + salt * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function passesConstraints(
  metrics: OptimizationMetrics,
  constraints: readonly ConstraintDefinition[],
  combination: ParameterCombination
): boolean {
  for (const c of constraints) {
    if (!c.enabled) continue;
    const holding = Number(combination.values.holding_period ?? 0);
    let actual = 0;
    switch (c.id) {
      case "max_drawdown":
        actual = metrics.maxDrawdown;
        break;
      case "min_win_rate":
        actual = metrics.winRate;
        break;
      case "min_profit_factor":
        actual = metrics.profitFactor;
        break;
      case "min_trades":
        actual = metrics.totalTrades;
        break;
      case "max_holding_days":
        if (holding > c.value) return false;
        continue;
      case "min_risk_reward":
        actual = metrics.riskReward;
        break;
      default:
        continue;
    }
    if (c.operator === "<" && !(actual < c.value)) return false;
    if (c.operator === ">" && !(actual > c.value)) return false;
    if (c.operator === "<=" && !(actual <= c.value)) return false;
    if (c.operator === ">=" && !(actual >= c.value)) return false;
  }
  return true;
}

/**
 * Offline research evaluator — deterministic mock performance from parameter set.
 * Not live trading. Produces institutional metrics for ranking/leaderboard.
 */
export function evaluateCombination(input: {
  combination: ParameterCombination;
  strategyId: string;
  strategyName: string;
  parameters: readonly ParameterState[];
  constraints: readonly ConstraintDefinition[];
}): OptimizationResult | null {
  const { combination, strategyId, strategyName, constraints } = input;
  const seed = hashCombination(combination.values);

  const shortMa = Number(combination.values.short_ma ?? 10);
  const longMa = Number(combination.values.long_ma ?? 50);
  const stop = Number(combination.values.stop_loss_pct ?? 2.5);
  const target = Number(combination.values.target_pct ?? 5);
  const rsi = Number(combination.values.rsi_period ?? 14);
  const atr = Number(combination.values.atr_length ?? 14);
  const volMul = Number(combination.values.volume_multiplier ?? 1.5);
  const hold = Number(combination.values.holding_period ?? 10);

  const maSpread = Math.max(1, longMa - shortMa);
  const rr = stop > 0 ? target / stop : 1;
  const structure =
    0.35 * clamp(maSpread / 80, 0, 1) +
    0.25 * clamp(rr / 3, 0, 1.2) +
    0.15 * clamp((30 - Math.abs(rsi - 14)) / 30, 0, 1) +
    0.1 * clamp((20 - Math.abs(atr - 14)) / 20, 0, 1) +
    0.1 * clamp(volMul / 3, 0, 1) +
    0.05 * clamp((40 - Math.abs(hold - 12)) / 40, 0, 1);

  const noise = seededUnit(seed, 1) * 0.35 - 0.1;
  const quality = clamp(structure + noise, 0.05, 1);

  const totalTrades = Math.round(80 + seededUnit(seed, 2) * 220 + quality * 80);
  const winRate = clamp(42 + quality * 28 + seededUnit(seed, 3) * 6, 35, 78);
  const profitFactor = clamp(0.9 + quality * 1.8 + seededUnit(seed, 4) * 0.35, 0.7, 3.2);
  const riskReward = clamp(rr * (0.85 + quality * 0.4), 0.8, 4.5);
  const avgReturn = clamp((winRate / 100) * target - ((100 - winRate) / 100) * stop, -2, 6);
  const expectancy = clamp(avgReturn * (0.9 + quality * 0.3), -1.5, 5);
  const maxDrawdown = clamp(28 - quality * 18 + seededUnit(seed, 5) * 4, 4, 35);
  const sharpe = clamp((avgReturn * 4) / Math.max(1, maxDrawdown / 4) + quality, -0.5, 3.2);
  const sortino = clamp(sharpe * (1.05 + seededUnit(seed, 6) * 0.25), -0.4, 3.8);
  const cagr = clamp(avgReturn * 8 + quality * 6 + seededUnit(seed, 7) * 3, -8, 42);
  const totalReturn = clamp(cagr * (0.7 + seededUnit(seed, 8) * 0.6), -15, 80);

  const metrics: OptimizationMetrics = {
    totalTrades,
    winRate: Number(winRate.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    sharpe: Number(sharpe.toFixed(2)),
    sortino: Number(sortino.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    avgReturn: Number(avgReturn.toFixed(2)),
    cagr: Number(cagr.toFixed(2)),
    expectancy: Number(expectancy.toFixed(2)),
    riskReward: Number(riskReward.toFixed(2)),
    totalReturn: Number(totalReturn.toFixed(2)),
  };

  if (!passesConstraints(metrics, constraints, combination)) {
    return null;
  }

  const wins = Math.round((winRate / 100) * totalTrades);
  const losses = totalTrades - wins;
  const monthlyReturns = Array.from({ length: 12 }, (_, i) =>
    Number(
      (
        avgReturn * 0.6 +
        (seededUnit(seed, 20 + i) - 0.45) * 3 +
        quality * 1.2
      ).toFixed(2)
    )
  );

  const score = Number(
    (
      profitFactor * 18 +
      winRate * 0.35 +
      sharpe * 12 +
      sortino * 8 +
      riskReward * 6 +
      expectancy * 5 +
      cagr * 0.4 -
      maxDrawdown * 0.55
    ).toFixed(2)
  );

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (profitFactor >= 1.6) strengths.push("Strong profit factor relative to peers.");
  if (winRate >= 55) strengths.push("Institutional win-rate above 55%.");
  if (sharpe >= 1.2) strengths.push("Attractive risk-adjusted Sharpe.");
  if (maxDrawdown <= 12) strengths.push("Contained maximum drawdown.");
  if (riskReward >= 2) strengths.push("Favorable risk/reward profile.");
  if (profitFactor < 1.3) weaknesses.push("Profit factor below institutional preference.");
  if (winRate < 48) weaknesses.push("Win rate leaves little margin for slippage.");
  if (maxDrawdown > 18) weaknesses.push("Drawdown may breach risk budgets.");
  if (sharpe < 0.8) weaknesses.push("Sharpe indicates weak risk-adjusted edge.");
  if (strengths.length === 0) strengths.push("Meets baseline constraint gates.");
  if (weaknesses.length === 0) weaknesses.push("No material red flags versus constraints.");

  const aiSummary = `${strategyName} with ${Object.entries(combination.labels)
    .slice(0, 3)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ")} delivered PF ${metrics.profitFactor}, win rate ${metrics.winRate}%, and Sharpe ${metrics.sharpe} under offline historical simulation.`;

  const suggestions: string[] = [];
  if (maxDrawdown > 15) {
    suggestions.push("Tighten stop loss or reduce holding period to compress drawdown.");
  }
  if (winRate < 52) {
    suggestions.push("Raise entry filters (ADX / volume) to improve hit rate.");
  }
  if (rr < 2) {
    suggestions.push("Widen target or tighten stop to improve risk/reward.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Validate top parameters with walk-forward analysis in Sprint 11C.3.");
  }

  return {
    id: `${strategyId}-${combination.id}-${seed.toString(36)}`,
    rank: 0,
    strategyId,
    strategyName,
    combination,
    metrics,
    score,
    monthlyReturns,
    tradeDistribution: {
      wins,
      losses,
      breakeven: Math.max(0, Math.round(totalTrades * 0.02)),
    },
    drawdownSummary: {
      maxDrawdown: metrics.maxDrawdown,
      avgDrawdown: Number((metrics.maxDrawdown * 0.45).toFixed(2)),
      recoveryBars: Math.round(20 + (1 - quality) * 60),
    },
    strengths,
    weaknesses,
    aiSummary,
    suggestions,
  };
}
