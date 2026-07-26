"use client";

import { cn } from "@/lib/utils";
import type { PaperStrategyComparisonRow } from "@/lib/paper-trading/analytics-types";
import type { PaperStrategy } from "@/lib/paper-trading/types";
import {
  formatHoldingDuration,
  formatPnl,
  formatPercent,
  PAPER_STRATEGY_LABELS,
} from "@/lib/paper-trading/format";
import { TABLE_CLASSES } from "@/src/design/layout/tableStyles";

interface PaperStrategyComparisonTableProps {
  rows: PaperStrategyComparisonRow[];
}

type MetricKey = Exclude<keyof PaperStrategyComparisonRow, "strategy">;

const METRICS: Array<{
  key: MetricKey;
  label: string;
  format: (row: PaperStrategyComparisonRow) => string;
  /** Higher is better unless inverted. */
  higherIsBetter: boolean;
}> = [
  { key: "totalTrades", label: "Total Trades", format: (r) => String(r.totalTrades), higherIsBetter: true },
  { key: "winRate", label: "Win Rate", format: (r) => `${r.winRate.toFixed(1)}%`, higherIsBetter: true },
  { key: "averageReturn", label: "Average Return", format: (r) => formatPercent(r.averageReturn), higherIsBetter: true },
  { key: "averageGain", label: "Average Gain", format: (r) => formatPnl(r.averageGain), higherIsBetter: true },
  { key: "averageLoss", label: "Average Loss", format: (r) => formatPnl(-Math.abs(r.averageLoss)), higherIsBetter: false },
  {
    key: "profitFactor",
    label: "Profit Factor",
    format: (r) => (r.profitFactor >= 99.99 ? "∞" : r.profitFactor.toFixed(2)),
    higherIsBetter: true,
  },
  {
    key: "maximumDrawdown",
    label: "Maximum Drawdown",
    format: (r) => formatPnl(-Math.abs(r.maximumDrawdown)),
    higherIsBetter: false,
  },
  {
    key: "averageHoldingMs",
    label: "Average Holding Time",
    format: (r) => formatHoldingDuration(r.averageHoldingMs),
    higherIsBetter: false,
  },
  { key: "target1HitPercent", label: "Target 1 Hit %", format: (r) => `${r.target1HitPercent.toFixed(1)}%`, higherIsBetter: true },
  { key: "target2HitPercent", label: "Target 2 Hit %", format: (r) => `${r.target2HitPercent.toFixed(1)}%`, higherIsBetter: true },
  { key: "target3HitPercent", label: "Target 3 Hit %", format: (r) => `${r.target3HitPercent.toFixed(1)}%`, higherIsBetter: true },
  { key: "stopLossPercent", label: "Stop Loss %", format: (r) => `${r.stopLossPercent.toFixed(1)}%`, higherIsBetter: false },
  { key: "openTrades", label: "Open Trades", format: (r) => String(r.openTrades), higherIsBetter: true },
  { key: "closedTrades", label: "Closed Trades", format: (r) => String(r.closedTrades), higherIsBetter: true },
];

function bestStrategyForMetric(
  rows: PaperStrategyComparisonRow[],
  key: MetricKey,
  higherIsBetter: boolean
): PaperStrategy | null {
  const active = rows.filter((r) => r.totalTrades > 0);
  if (active.length === 0) return null;
  const ranked = [...active].sort((a, b) => {
    const av = a[key] as number;
    const bv = b[key] as number;
    return higherIsBetter ? bv - av : av - bv;
  });
  return ranked[0].strategy;
}

export function PaperStrategyComparisonTable({
  rows,
}: PaperStrategyComparisonTableProps) {
  const byStrategy = Object.fromEntries(
    rows.map((r) => [r.strategy, r])
  ) as Record<PaperStrategy, PaperStrategyComparisonRow>;

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Section 2
        </p>
        <h2 className="mt-0.5 text-sm font-semibold text-text-primary">
          Strategy Comparison
        </h2>
      </div>

      <div className={cn(TABLE_CLASSES.container, "overflow-x-auto")}>
        <table className={TABLE_CLASSES.table}>
          <caption className="sr-only">
            Side-by-side strategy comparison
          </caption>
          <thead>
            <tr>
              <th>Metric</th>
              <th className="text-right">Intraday</th>
              <th className="text-right">Scalping</th>
              <th className="text-right">Swing</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((metric) => {
              const best = bestStrategyForMetric(
                rows,
                metric.key,
                metric.higherIsBetter
              );
              return (
                <tr key={metric.key}>
                  <td className="text-text-secondary">{metric.label}</td>
                  {(["intraday", "scalping", "swing"] as PaperStrategy[]).map(
                    (strategy) => {
                      const row = byStrategy[strategy];
                      const isBest = best === strategy && row.totalTrades > 0;
                      return (
                        <td
                          key={strategy}
                          className={cn(
                            TABLE_CLASSES.numericCell,
                            "text-right",
                            isBest &&
                              "bg-gain/10 font-semibold text-gain"
                          )}
                        >
                          {metric.format(row)}
                        </td>
                      );
                    }
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-text-faint">
        Best-performing value in each row is highlighted ·{" "}
        {PAPER_STRATEGY_LABELS.intraday} / {PAPER_STRATEGY_LABELS.scalping} /{" "}
        {PAPER_STRATEGY_LABELS.swing}
      </p>
    </section>
  );
}
