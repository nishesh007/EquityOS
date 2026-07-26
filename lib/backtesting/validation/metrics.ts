/**
 * Shared metric helpers for validation — builds on lib/analytics (no forks).
 */

import {
  average,
  computeTradeStatistics,
  roundMetric,
  type TradeStatistics,
} from "@/lib/analytics";
import type { ValidationTradeRecord } from "@/lib/backtesting/validation/types";

export function closedTradesOnly(
  trades: readonly ValidationTradeRecord[]
): ValidationTradeRecord[] {
  return trades.filter((t) => t.status === "closed" && t.exitAt != null);
}

export function toStats(trades: readonly ValidationTradeRecord[]): TradeStatistics {
  return computeTradeStatistics(
    closedTradesOnly(trades).map((t) => ({
      returnPercent: t.returnPercent,
      pnl: t.pnl,
      holdingMs: t.holdingMs,
      hitTarget: t.hitTarget,
      hitStopLoss: t.hitStopLoss,
    }))
  );
}

export function totalReturnPercent(
  trades: readonly ValidationTradeRecord[]
): number {
  // Additive for institutional summary tables (deterministic, simple).
  return roundMetric(
    closedTradesOnly(trades).reduce((sum, t) => sum + t.returnPercent, 0),
    2
  );
}

export function estimateCagr(
  trades: readonly ValidationTradeRecord[]
): number | null {
  const closed = closedTradesOnly(trades);
  if (closed.length === 0) return null;
  const starts = closed.map((t) => new Date(t.entryAt).getTime());
  const ends = closed.map((t) => new Date(t.exitAt as string).getTime());
  const start = Math.min(...starts);
  const end = Math.max(...ends);
  const years = (end - start) / (365.25 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(years) || years <= 0) return null;

  // Compound from unit capital using per-trade returns.
  let equity = 1;
  for (const trade of [...closed].sort((a, b) =>
    a.entryAt.localeCompare(b.entryAt)
  )) {
    equity *= 1 + trade.returnPercent / 100;
  }
  if (equity <= 0) return null;
  return roundMetric((Math.pow(equity, 1 / years) - 1) * 100, 2);
}

export function averageRiskReward(
  trades: readonly ValidationTradeRecord[]
): number | null {
  const values = closedTradesOnly(trades)
    .map((t) => t.realizedRiskReward)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const avg = average(values);
  return avg == null ? null : roundMetric(avg, 2);
}

/** Annualized Sharpe from trade returns (rf ≈ 0). Needs ≥ 3 trades. */
export function sharpeRatio(
  trades: readonly ValidationTradeRecord[]
): number | null {
  const returns = closedTradesOnly(trades).map((t) => t.returnPercent);
  if (returns.length < 3) return null;
  const mean = average(returns);
  if (mean == null) return null;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return null;
  // Rough annualization assuming ~50 trades/year when holding ~1 week.
  const avgHolding =
    average(closedTradesOnly(trades).map((t) => t.holdingMs)) ?? 7 * 86_400_000;
  const tradesPerYear = (365.25 * 86_400_000) / Math.max(avgHolding, 86_400_000);
  return roundMetric((mean / std) * Math.sqrt(tradesPerYear), 2);
}

/** Sortino using downside deviation only. */
export function sortinoRatio(
  trades: readonly ValidationTradeRecord[]
): number | null {
  const returns = closedTradesOnly(trades).map((t) => t.returnPercent);
  if (returns.length < 3) return null;
  const mean = average(returns);
  if (mean == null) return null;
  const downside = returns.filter((r) => r < 0);
  if (downside.length === 0) return mean > 0 ? roundMetric(mean, 2) : null;
  const downVar =
    downside.reduce((sum, r) => sum + r ** 2, 0) / downside.length;
  const downDev = Math.sqrt(downVar);
  if (downDev === 0) return null;
  const avgHolding =
    average(closedTradesOnly(trades).map((t) => t.holdingMs)) ?? 7 * 86_400_000;
  const tradesPerYear = (365.25 * 86_400_000) / Math.max(avgHolding, 86_400_000);
  return roundMetric((mean / downDev) * Math.sqrt(tradesPerYear), 2);
}
