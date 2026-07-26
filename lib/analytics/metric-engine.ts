/**
 * Sprint 11F.1 — Generic analytics metric utilities.
 * Domain-agnostic; consumers map their entities into TradeStatisticsInput.
 */

import type { TradeStatistics, TradeStatisticsInput } from "@/lib/analytics/types";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function percentOf(part: number, total: number): number {
  if (!isFiniteNumber(part) || !isFiniteNumber(total) || total <= 0) return 0;
  return (part / total) * 100;
}

export function average(values: readonly number[]): number | null {
  const finite = values.filter(isFiniteNumber);
  if (finite.length === 0) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

/** Win rate as 0–100. */
export function winRate(wins: number, total: number): number {
  return percentOf(wins, total);
}

/** Loss rate as 0–100. */
export function lossRate(losses: number, total: number): number {
  return percentOf(losses, total);
}

/**
 * Profit factor = grossProfit / |grossLoss|.
 * Returns null when loss side is zero (undefined / infinite edge).
 */
export function profitFactor(
  grossProfit: number,
  grossLoss: number
): number | null {
  if (!isFiniteNumber(grossProfit) || !isFiniteNumber(grossLoss)) return null;
  const absLoss = Math.abs(grossLoss);
  if (absLoss === 0) return grossProfit > 0 ? null : 0;
  return grossProfit / absLoss;
}

export function averageReturn(returns: readonly number[]): number | null {
  return average(returns);
}

export function averageGain(returns: readonly number[]): number | null {
  return average(returns.filter((value) => value > 0));
}

export function averageLoss(returns: readonly number[]): number | null {
  return average(returns.filter((value) => value < 0));
}

/**
 * Maximum drawdown from an equity curve of cumulative values.
 * Returns a positive magnitude (e.g. 12.5 = 12.5% peak-to-trough)
 * when curve values are percentage-like, or absolute units when not.
 *
 * Uses peak-to-trough percent of peak when peak > 0; otherwise absolute drop.
 */
export function maximumDrawdown(equityCurve: readonly number[]): number | null {
  const curve = equityCurve.filter(isFiniteNumber);
  if (curve.length === 0) return null;

  let peak = curve[0];
  let maxDd = 0;

  for (const value of curve) {
    if (value > peak) peak = value;
    const drop =
      peak > 0 ? ((peak - value) / peak) * 100 : Math.max(0, peak - value);
    if (drop > maxDd) maxDd = drop;
  }

  return maxDd;
}

export function averageHoldingTime(
  durationsMs: readonly number[]
): number | null {
  return average(durationsMs.filter((value) => value >= 0));
}

export function targetHitRate(hits: number, total: number): number {
  return percentOf(hits, total);
}

export function stopLossRate(stops: number, total: number): number {
  return percentOf(stops, total);
}

export function roundMetric(value: number, decimals = 2): number {
  if (!isFiniteNumber(value)) return NaN;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Aggregate a list of trade-like rows into shared TradeStatistics.
 * Does not depend on Paper Trading or Recommendation domain types.
 */
export function computeTradeStatistics(
  trades: readonly TradeStatisticsInput[]
): TradeStatistics {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.returnPercent > 0);
  const losses = trades.filter((t) => t.returnPercent < 0);
  const breakeven = trades.filter((t) => t.returnPercent === 0);

  const returns = trades.map((t) => t.returnPercent);
  const holding = trades
    .map((t) => t.holdingMs)
    .filter((value): value is number => isFiniteNumber(value));

  const withTarget = trades.filter((t) => t.hitTarget != null);
  const withStop = trades.filter((t) => t.hitStopLoss != null);

  const grossProfit = trades.reduce((sum, t) => {
    const pnl = t.pnl ?? t.returnPercent;
    return sum + (pnl > 0 ? pnl : 0);
  }, 0);

  const grossLoss = trades.reduce((sum, t) => {
    const pnl = t.pnl ?? t.returnPercent;
    return sum + (pnl < 0 ? pnl : 0);
  }, 0);

  // Equity-style cumulative return curve for drawdown.
  let cumulative = 0;
  const equityCurve = returns.map((r) => {
    cumulative += r;
    return cumulative;
  });

  return {
    totalTrades,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    winRate: roundMetric(winRate(wins.length, totalTrades), 2),
    lossRate: roundMetric(lossRate(losses.length, totalTrades), 2),
    profitFactor: (() => {
      const pf = profitFactor(grossProfit, grossLoss);
      return pf == null ? null : roundMetric(pf, 2);
    })(),
    averageReturn: (() => {
      const avg = averageReturn(returns);
      return avg == null ? null : roundMetric(avg, 2);
    })(),
    averageGain: (() => {
      const avg = averageGain(returns);
      return avg == null ? null : roundMetric(avg, 2);
    })(),
    averageLoss: (() => {
      const avg = averageLoss(returns);
      return avg == null ? null : roundMetric(avg, 2);
    })(),
    maximumDrawdown: (() => {
      const dd = maximumDrawdown(equityCurve);
      return dd == null ? null : roundMetric(dd, 2);
    })(),
    averageHoldingMs: (() => {
      const avg = averageHoldingTime(holding);
      return avg == null ? null : roundMetric(avg, 0);
    })(),
    targetHitRate:
      withTarget.length === 0
        ? null
        : roundMetric(
            targetHitRate(
              withTarget.filter((t) => t.hitTarget).length,
              withTarget.length
            ),
            2
          ),
    stopLossRate:
      withStop.length === 0
        ? null
        : roundMetric(
            stopLossRate(
              withStop.filter((t) => t.hitStopLoss).length,
              withStop.length
            ),
            2
          ),
    grossProfit: roundMetric(grossProfit, 2),
    grossLoss: roundMetric(grossLoss, 2),
    netPnl: roundMetric(grossProfit + grossLoss, 2),
  };
}
