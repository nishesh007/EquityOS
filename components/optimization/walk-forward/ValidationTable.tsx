"use client";

import { memo, useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  AnalyticsTable,
  type AnalyticsTableColumn,
} from "@/components/analytics/tables/AnalyticsTable";
import { cn } from "@/lib/utils";
import type { WalkForwardCycleResult } from "@/lib/optimization";

export interface ValidationTableProps {
  cycles: WalkForwardCycleResult[];
  onRowOpen: (cycle: WalkForwardCycleResult) => void;
}

export const ValidationTable = memo(function ValidationTable({
  cycles,
  onRowOpen,
}: ValidationTableProps) {
  const columns = useMemo<AnalyticsTableColumn<WalkForwardCycleResult>[]>(
    () => [
      {
        key: "cycle",
        header: "Cycle",
        sortable: true,
        numeric: true,
        accessor: (r) => r.cycle,
        render: (r) => (
          <span className="font-semibold text-text-primary">#{r.cycle}</span>
        ),
      },
      {
        key: "train",
        header: "Training Period",
        sortable: true,
        accessor: (r) => r.training.start,
        render: (r) => (
          <span className="text-[11px] text-text-muted">
            {r.training.start} → {r.training.end}
          </span>
        ),
      },
      {
        key: "test",
        header: "Testing Period",
        sortable: true,
        accessor: (r) => r.testing.start,
        render: (r) => (
          <span className="text-[11px] text-text-muted">
            {r.testing.start} → {r.testing.end}
          </span>
        ),
      },
      {
        key: "trades",
        header: "Trades",
        sortable: true,
        numeric: true,
        accessor: (r) => r.metrics.totalTrades,
        render: (r) => r.metrics.totalTrades,
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
        key: "wr",
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
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (r) => r.status,
        render: (r) => (
          <span
            className={cn(
              "font-semibold",
              r.status === "Passed"
                ? "text-gain"
                : r.status === "Failed"
                  ? "text-loss"
                  : "text-amber-400"
            )}
          >
            {r.status}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <Card hover={false} padding="sm" data-testid="validation-table">
      <CardHeader
        title="Validation Cycles"
        subtitle="Out-of-sample results for each walk-forward fold"
      />
      <div className="mt-3">
        <AnalyticsTable
          columns={columns}
          data={cycles}
          keyExtractor={(r) => r.id}
          searchable
          searchPlaceholder="Filter cycles…"
          pageSize={10}
          initialSortKey="cycle"
          initialSortDir="asc"
          onRowClick={onRowOpen}
          emptyTitle="No validation cycles"
          emptyMessage="Run walk-forward validation to populate results."
          caption="Walk-forward validation cycle table"
        />
      </div>
    </Card>
  );
});
