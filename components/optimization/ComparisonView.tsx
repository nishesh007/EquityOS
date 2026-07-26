"use client";

import { memo, useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { OptimizationResult } from "@/lib/optimization";

export interface ComparisonViewProps {
  results: OptimizationResult[];
  selectedIds: string[];
  onClear: () => void;
}

const METRIC_ROWS: {
  key: string;
  label: string;
  higherBetter: boolean;
  get: (r: OptimizationResult) => number;
  format: (n: number) => string;
}[] = [
  {
    key: "score",
    label: "Score",
    higherBetter: true,
    get: (r) => r.score,
    format: (n) => n.toFixed(1),
  },
  {
    key: "wr",
    label: "Win Rate",
    higherBetter: true,
    get: (r) => r.metrics.winRate,
    format: (n) => `${n}%`,
  },
  {
    key: "pf",
    label: "Profit Factor",
    higherBetter: true,
    get: (r) => r.metrics.profitFactor,
    format: (n) => n.toFixed(2),
  },
  {
    key: "sharpe",
    label: "Sharpe",
    higherBetter: true,
    get: (r) => r.metrics.sharpe,
    format: (n) => n.toFixed(2),
  },
  {
    key: "sortino",
    label: "Sortino",
    higherBetter: true,
    get: (r) => r.metrics.sortino,
    format: (n) => n.toFixed(2),
  },
  {
    key: "dd",
    label: "Max Drawdown",
    higherBetter: false,
    get: (r) => r.metrics.maxDrawdown,
    format: (n) => `${n}%`,
  },
  {
    key: "ret",
    label: "Total Return",
    higherBetter: true,
    get: (r) => r.metrics.totalReturn,
    format: (n) => `${n}%`,
  },
  {
    key: "rr",
    label: "Risk Reward",
    higherBetter: true,
    get: (r) => r.metrics.riskReward,
    format: (n) => n.toFixed(2),
  },
  {
    key: "cagr",
    label: "CAGR",
    higherBetter: true,
    get: (r) => r.metrics.cagr,
    format: (n) => `${n}%`,
  },
  {
    key: "exp",
    label: "Expectancy",
    higherBetter: true,
    get: (r) => r.metrics.expectancy,
    format: (n) => n.toFixed(2),
  },
];

export const ComparisonView = memo(function ComparisonView({
  results,
  selectedIds,
  onClear,
}: ComparisonViewProps) {
  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => results.find((r) => r.id === id))
        .filter((r): r is OptimizationResult => Boolean(r))
        .slice(0, 4),
    [results, selectedIds]
  );

  if (selected.length < 2) {
    return (
      <Card hover={false} padding="sm" data-testid="comparison-view">
        <CardHeader
          title="Comparison Mode"
          subtitle="Select 2–4 leaderboard rows to compare metrics and parameters"
        />
        <p className="mt-2 text-xs text-text-muted">
          {selected.length === 1
            ? "Select at least one more result to compare."
            : "No results selected for comparison."}
        </p>
      </Card>
    );
  }

  return (
    <Card hover={false} padding="sm" data-testid="comparison-view">
      <CardHeader
        title="Comparison Mode"
        subtitle={`Comparing ${selected.length} optimization results`}
        action={
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-surface-border-subtle px-2.5 py-1 text-[10px] font-semibold text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            Clear
          </button>
        }
      />

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-xs" aria-label="Result comparison">
          <thead>
            <tr className="border-b border-surface-border-subtle text-[10px] uppercase tracking-wider text-text-faint">
              <th className="px-2 py-2 font-semibold">Metric</th>
              {selected.map((r) => (
                <th key={r.id} className="px-2 py-2 font-semibold text-text-secondary">
                  #{r.rank}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRIC_ROWS.map((row) => {
              const values = selected.map((r) => row.get(r));
              const best = row.higherBetter
                ? Math.max(...values)
                : Math.min(...values);
              return (
                <tr
                  key={row.key}
                  className="border-b border-surface-border-subtle/60"
                >
                  <td className="px-2 py-2 text-text-muted">{row.label}</td>
                  {selected.map((r, i) => {
                    const v = values[i]!;
                    const isBest = v === best;
                    return (
                      <td
                        key={r.id}
                        className={cn(
                          "px-2 py-2 font-medium",
                          isBest ? "text-gain" : "text-text-primary"
                        )}
                      >
                        {row.format(v)}
                        {isBest ? (
                          <span className="sr-only"> (best)</span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {selected.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-3 py-2"
          >
            <p className="text-xs font-semibold text-text-primary">
              #{r.rank} {r.strategyName}
            </p>
            <p className="mt-1 text-[11px] text-text-muted">
              {Object.entries(r.combination.labels)
                .slice(0, 5)
                .map(([k, v]) => `${k}=${v}`)
                .join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
});
