"use client";

import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { TabBar } from "@/components/ui/TabBar";
import { cn } from "@/lib/utils";
import type {
  EquityCurvePoint,
  EquityCurveRange,
  MonthlyPerformanceRow,
} from "@/lib/paper-trading/analytics-types";
import { formatPnl, formatPercent } from "@/lib/paper-trading/format";
import { CalendarDays, TrendingUp } from "lucide-react";
import { TABLE_CLASSES } from "@/src/design/layout/tableStyles";

interface PaperHistoricalPerformanceProps {
  points: EquityCurvePoint[];
  range: EquityCurveRange;
  onRangeChange: (range: EquityCurveRange) => void;
  monthly: MonthlyPerformanceRow[];
}

const RANGE_TABS: Array<{ id: EquityCurveRange; label: string }> = [
  { id: "daily", label: "Daily P&L" },
  { id: "weekly", label: "Weekly P&L" },
  { id: "monthly", label: "Monthly P&L" },
  { id: "all", label: "All-Time P&L" },
];

export function PaperHistoricalPerformance({
  points,
  range,
  onRangeChange,
  monthly,
}: PaperHistoricalPerformanceProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Section 4
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-text-primary">
            Historical Performance
          </h2>
        </div>
        <TabBar
          tabs={RANGE_TABS}
          activeTab={range}
          onTabChange={onRangeChange}
          size="sm"
        />
      </div>

      <div className="rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          Equity Curve · {RANGE_TABS.find((t) => t.id === range)?.label}
        </p>
        {points.length === 0 ? (
          <EmptyStatePanel
            icon={TrendingUp}
            title="No closed trades yet."
            message="Equity and period P&L charts appear after completed paper trades exist."
            source="Historical Performance"
            className="py-6"
          />
        ) : (
          <EquitySvg points={points} showPeriod={range !== "all"} />
        )}
      </div>

      <div className="rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          Monthly Summary
        </p>
        {monthly.length === 0 ? (
          <EmptyStatePanel
            icon={CalendarDays}
            title="No monthly history yet."
            message="Monthly aggregates appear after closed paper trades exist."
            source="Historical Performance"
            className="py-6"
          />
        ) : (
          <div className={cn(TABLE_CLASSES.container, "overflow-x-auto")}>
            <table className={TABLE_CLASSES.table}>
              <caption className="sr-only">Monthly performance summary</caption>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="text-right">Trades</th>
                  <th className="text-right">Win Rate</th>
                  <th className="text-right">Net Return</th>
                  <th className="text-right">Average Return</th>
                  <th className="text-right">Best Trade</th>
                  <th className="text-right">Worst Trade</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((row) => (
                  <tr key={row.monthKey}>
                    <td className="font-medium text-text-primary">
                      {row.monthLabel}
                    </td>
                    <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                      {row.trades}
                    </td>
                    <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                      {row.winRate.toFixed(1)}%
                    </td>
                    <td
                      className={cn(
                        TABLE_CLASSES.numericCell,
                        "text-right font-medium",
                        row.netReturn >= 0 ? "text-gain" : "text-loss"
                      )}
                    >
                      {formatPnl(row.netReturn)}
                    </td>
                    <td
                      className={cn(
                        TABLE_CLASSES.numericCell,
                        "text-right",
                        row.averageReturn >= 0 ? "text-gain" : "text-loss"
                      )}
                    >
                      {formatPercent(row.averageReturn)}
                    </td>
                    <td
                      className={cn(
                        TABLE_CLASSES.numericCell,
                        "text-right text-gain"
                      )}
                    >
                      {formatPnl(row.bestTrade)}
                    </td>
                    <td
                      className={cn(
                        TABLE_CLASSES.numericCell,
                        "text-right text-loss"
                      )}
                    >
                      {formatPnl(row.worstTrade)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function EquitySvg({
  points,
  showPeriod,
}: {
  points: EquityCurvePoint[];
  showPeriod: boolean;
}) {
  const width = 720;
  const height = 180;
  const padX = 16;
  const padY = 18;
  const values = points.map((p) => (showPeriod ? p.periodPnl : p.equity));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;

  const coords = points.map((point, index) => {
    const value = showPeriod ? point.periodPnl : point.equity;
    const x =
      padX +
      (points.length === 1
        ? (width - padX * 2) / 2
        : (index / (points.length - 1)) * (width - padX * 2));
    const y = padY + (1 - (value - min) / span) * (height - padY * 2);
    return { x, y, value };
  });

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const zeroY = padY + (1 - (0 - min) / span) * (height - padY * 2);
  const last = coords[coords.length - 1];
  const positive = last.value >= 0;

  return (
    <div className="overflow-hidden rounded-lg border border-surface-border-subtle bg-surface/40 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full sm:h-44"
        role="img"
        aria-label={showPeriod ? "Period P&L chart" : "Equity curve"}
      >
        <line
          x1={padX}
          x2={width - padX}
          y1={zeroY}
          y2={zeroY}
          stroke="currentColor"
          className="text-surface-border-subtle"
          strokeDasharray="4 4"
        />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={positive ? "text-gain" : "text-loss"}
        />
        {coords.map((c, i) => (
          <circle
            key={`${points[i].timestamp}-${i}`}
            cx={c.x}
            cy={c.y}
            r={2.5}
            className={c.value >= 0 ? "fill-gain" : "fill-loss"}
          >
            <title>
              {points[i].label}: {c.value.toFixed(2)}
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-text-faint">
        <span>
          {points[0]?.label} → {points[points.length - 1]?.label}
        </span>
        <span
          className={cn(
            "font-mono tabular-nums",
            positive ? "text-gain" : "text-loss"
          )}
        >
          {last.value >= 0 ? "+" : ""}
          {last.value.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
