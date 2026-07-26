/**
 * Visual series builders for institutional reports.
 * Uses analytics ChartSeries contracts — no new chart primitives.
 */

import { roundMetric } from "@/lib/analytics";
import type { ChartSeries } from "@/lib/analytics/types";
import type { ValidationTradeRecord } from "@/lib/backtesting/validation/types";
import { closedTradesOnly } from "@/lib/backtesting/validation/metrics";
import type { ConvictionBucketRow } from "@/lib/backtesting/validation/types";

function sortedClosed(trades: readonly ValidationTradeRecord[]): ValidationTradeRecord[] {
  return [...closedTradesOnly(trades)].sort((a, b) =>
    a.exitAt!.localeCompare(b.exitAt!)
  );
}

export function buildEquityCurveSeries(
  trades: readonly ValidationTradeRecord[]
): ChartSeries[] {
  const closed = sortedClosed(trades);
  let equity = 100;
  const points = closed.map((trade, index) => {
    equity *= 1 + trade.returnPercent / 100;
    return {
      x: trade.exitAt as string,
      y: roundMetric(equity, 2),
      label: trade.symbol,
      meta: { index },
    };
  });
  if (points.length === 0) {
    return [{ id: "equity", label: "Equity Curve", points: [] }];
  }
  return [
    {
      id: "equity",
      label: "Equity Curve",
      points: [{ x: closed[0].entryAt, y: 100 }, ...points],
    },
  ];
}

export function buildDrawdownCurveSeries(
  trades: readonly ValidationTradeRecord[]
): ChartSeries[] {
  const equity = buildEquityCurveSeries(trades)[0]?.points ?? [];
  let peak = -Infinity;
  const points = equity.map((point) => {
    peak = Math.max(peak, point.y);
    const dd = peak > 0 ? ((peak - point.y) / peak) * 100 : 0;
    return { x: point.x, y: roundMetric(-dd, 2) };
  });
  return [{ id: "drawdown", label: "Drawdown %", points }];
}

export function buildMonthlyReturnsSeries(
  trades: readonly ValidationTradeRecord[]
): ChartSeries[] {
  const closed = sortedClosed(trades);
  const buckets = new Map<string, number>();
  for (const trade of closed) {
    const d = new Date(trade.exitAt as string);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + trade.returnPercent);
  }
  const keys = [...buckets.keys()].sort();
  return [
    {
      id: "monthly",
      label: "Monthly Returns",
      points: keys.map((key) => ({
        x: key,
        y: roundMetric(buckets.get(key) ?? 0, 2),
        label: key,
      })),
    },
  ];
}

export function buildWinLossDistributionSeries(
  trades: readonly ValidationTradeRecord[]
): ChartSeries[] {
  const closed = closedTradesOnly(trades);
  const wins = closed.filter((t) => t.returnPercent > 0).length;
  const losses = closed.filter((t) => t.returnPercent < 0).length;
  const flat = closed.filter((t) => t.returnPercent === 0).length;
  return [
    {
      id: "winloss",
      label: "Win / Loss",
      points: [
        { x: "Wins", y: wins },
        { x: "Losses", y: losses },
        { x: "Flat", y: flat },
      ],
    },
  ];
}

export function buildConvictionDistributionSeries(
  buckets: readonly ConvictionBucketRow[]
): ChartSeries[] {
  return [
    {
      id: "conviction",
      label: "Conviction Trades",
      points: buckets.map((bucket) => ({
        x: bucket.label,
        y: bucket.tradeCount,
        label: bucket.label,
      })),
    },
  ];
}
