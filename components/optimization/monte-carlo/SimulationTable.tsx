"use client";

import { memo, useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  AnalyticsTable,
  type AnalyticsTableColumn,
} from "@/components/analytics/tables/AnalyticsTable";
import { cn } from "@/lib/utils";
import type { SimulationResult } from "@/lib/optimization";

export interface SimulationTableProps {
  results: SimulationResult[];
  onRowOpen: (row: SimulationResult) => void;
}

export const SimulationTable = memo(function SimulationTable({
  results,
  onRowOpen,
}: SimulationTableProps) {
  const columns = useMemo<AnalyticsTableColumn<SimulationResult>[]>(
    () => [
      {
        key: "sim",
        header: "Simulation",
        sortable: true,
        numeric: true,
        accessor: (r) => r.simulationIndex,
        render: (r) => (
          <span className="font-semibold text-text-primary">#{r.simulationIndex}</span>
        ),
      },
      {
        key: "scenario",
        header: "Scenario",
        sortable: true,
        accessor: (r) => r.scenarioLabel,
        render: (r) => r.scenarioLabel,
      },
      {
        key: "ret",
        header: "Return",
        sortable: true,
        numeric: true,
        accessor: (r) => r.metrics.expectedReturn,
        render: (r) => (
          <span
            className={cn(
              r.metrics.expectedReturn >= 0 ? "text-gain" : "text-loss"
            )}
          >
            {r.metrics.expectedReturn.toFixed(1)}%
          </span>
        ),
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
        key: "sharpe",
        header: "Sharpe",
        sortable: true,
        numeric: true,
        accessor: (r) => r.metrics.sharpe,
        render: (r) => r.metrics.sharpe.toFixed(2),
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
        key: "prob",
        header: "Probability",
        sortable: true,
        numeric: true,
        accessor: (r) => r.probability,
        render: (r) => r.probability.toFixed(4),
      },
      {
        key: "grade",
        header: "Risk Grade",
        sortable: true,
        accessor: (r) => r.riskGrade,
        render: (r) => (
          <span className="font-semibold text-accent">{r.riskGrade}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (r) => r.status,
        render: (r) => r.status,
      },
    ],
    []
  );

  return (
    <Card hover={false} padding="sm" data-testid="simulation-table">
      <CardHeader
        title="Simulation Results"
        subtitle="Institutional Monte Carlo paths with risk grades"
      />
      <div className="mt-3">
        <AnalyticsTable
          columns={columns}
          data={results}
          keyExtractor={(r) => r.id}
          searchable
          searchPlaceholder="Filter simulations…"
          pageSize={25}
          initialSortKey="sim"
          initialSortDir="asc"
          onRowClick={onRowOpen}
          emptyTitle="No simulations"
          emptyMessage="Run Monte Carlo to populate results."
          caption="Monte Carlo simulation results"
        />
      </div>
    </Card>
  );
});
