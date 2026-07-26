"use client";

import { memo, useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { AnalyticsTable, type AnalyticsTableColumn } from "@/components/analytics/tables/AnalyticsTable";
import { cn } from "@/lib/utils";
import type { OptimizationResult } from "@/lib/optimization";

export interface LeaderboardTableProps {
  results: OptimizationResult[];
  limit: 10 | 25 | 50 | 100;
  selectedIds: string[];
  onLimitChange: (limit: 10 | 25 | 50 | 100) => void;
  onRowOpen: (result: OptimizationResult) => void;
  onToggleCompare: (id: string) => void;
}

export const LeaderboardTable = memo(function LeaderboardTable({
  results,
  limit,
  selectedIds,
  onLimitChange,
  onRowOpen,
  onToggleCompare,
}: LeaderboardTableProps) {
  const rows = useMemo(() => results.slice(0, limit), [results, limit]);

  const columns = useMemo<AnalyticsTableColumn<OptimizationResult>[]>(
    () => [
      {
        key: "compare",
        header: "Cmp",
        sortable: false,
        render: (row) => (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.id)}
            onChange={(e) => {
              e.stopPropagation();
              onToggleCompare(row.id);
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Compare result rank ${row.rank}`}
            className="h-3.5 w-3.5 accent-[var(--eos-accent,#38bdf8)]"
          />
        ),
      },
      {
        key: "rank",
        header: "Rank",
        sortable: true,
        numeric: true,
        accessor: (r) => r.rank,
        render: (r) => (
          <span className="font-semibold text-text-primary">#{r.rank}</span>
        ),
      },
      {
        key: "strategy",
        header: "Strategy",
        sortable: true,
        accessor: (r) => r.strategyName,
        render: (r) => r.strategyName,
      },
      {
        key: "params",
        header: "Parameter Set",
        sortable: false,
        render: (r) => (
          <span className="line-clamp-2 text-[11px] text-text-muted">
            {Object.entries(r.combination.labels)
              .slice(0, 4)
              .map(([k, v]) => `${k} ${v}`)
              .join(" · ")}
          </span>
        ),
      },
      {
        key: "winRate",
        header: "Win Rate",
        sortable: true,
        numeric: true,
        accessor: (r) => r.metrics.winRate,
        render: (r) => `${r.metrics.winRate}%`,
      },
      {
        key: "pf",
        header: "Profit Factor",
        sortable: true,
        numeric: true,
        accessor: (r) => r.metrics.profitFactor,
        render: (r) => r.metrics.profitFactor.toFixed(2),
      },
      {
        key: "sharpe",
        header: "Sharpe",
        sortable: true,
        numeric: true,
        accessor: (r) => r.metrics.sharpe,
        render: (r) => r.metrics.sharpe.toFixed(2),
      },
      {
        key: "dd",
        header: "Drawdown",
        sortable: true,
        numeric: true,
        accessor: (r) => r.metrics.maxDrawdown,
        render: (r) => (
          <span className="text-loss">{r.metrics.maxDrawdown.toFixed(1)}%</span>
        ),
      },
      {
        key: "ret",
        header: "Return",
        sortable: true,
        numeric: true,
        accessor: (r) => r.metrics.totalReturn,
        render: (r) => (
          <span
            className={cn(
              r.metrics.totalReturn >= 0 ? "text-gain" : "text-loss"
            )}
          >
            {r.metrics.totalReturn.toFixed(1)}%
          </span>
        ),
      },
      {
        key: "rr",
        header: "Risk Reward",
        sortable: true,
        numeric: true,
        accessor: (r) => r.metrics.riskReward,
        render: (r) => r.metrics.riskReward.toFixed(2),
      },
      {
        key: "score",
        header: "Score",
        sortable: true,
        numeric: true,
        accessor: (r) => r.score,
        render: (r) => (
          <span className="font-semibold text-accent">{r.score.toFixed(1)}</span>
        ),
      },
    ],
    [onToggleCompare, selectedIds]
  );

  return (
    <Card hover={false} padding="sm" data-testid="leaderboard-table">
      <CardHeader
        title="Optimization Leaderboard"
        subtitle="Institutional ranking of evaluated parameter sets"
        action={
          <div className="flex flex-wrap gap-1" role="group" aria-label="Leaderboard size">
            {([10, 25, 50, 100] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onLimitChange(n)}
                aria-pressed={limit === n}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                  limit === n
                    ? "border-accent/40 bg-accent/15 text-accent"
                    : "border-surface-border-subtle text-text-secondary"
                )}
              >
                Top {n}
              </button>
            ))}
          </div>
        }
      />
      <div className="mt-3">
        <AnalyticsTable
          columns={columns}
          data={rows}
          keyExtractor={(r) => r.id}
          searchable
          searchPlaceholder="Filter leaderboard…"
          pageSize={Math.min(limit, 25)}
          initialSortKey="rank"
          initialSortDir="asc"
          onRowClick={onRowOpen}
          emptyTitle="No optimization results"
          emptyMessage="Run Grid or Smart Search to populate the leaderboard."
          caption="Optimization result leaderboard"
        />
      </div>
    </Card>
  );
});
