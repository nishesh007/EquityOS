"use client";

import { memo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { ScenarioComparisonRow } from "@/lib/optimization";

export interface ScenarioComparisonProps {
  rows: ScenarioComparisonRow[];
}

export const ScenarioComparison = memo(function ScenarioComparison({
  rows,
}: ScenarioComparisonProps) {
  if (rows.length === 0) {
    return (
      <Card hover={false} padding="sm" data-testid="scenario-comparison">
        <CardHeader title="Scenario Comparison" subtitle="Best / worst stress overlays" />
        <p className="mt-2 text-xs text-text-muted">Run simulations to compare scenarios.</p>
      </Card>
    );
  }

  return (
    <Card hover={false} padding="sm" data-testid="scenario-comparison">
      <CardHeader
        title="Scenario Comparison"
        subtitle="Expected return, risk, drawdown, recovery, volatility, Sharpe, ruin"
      />
      <div className="mt-3 overflow-x-auto">
        <table
          className="w-full min-w-[720px] text-left text-xs"
          aria-label="Scenario comparison"
        >
          <thead>
            <tr className="border-b border-surface-border-subtle text-[10px] uppercase tracking-wider text-text-faint">
              <th className="px-2 py-2">Scenario</th>
              <th className="px-2 py-2">Expected Return</th>
              <th className="px-2 py-2">Risk</th>
              <th className="px-2 py-2">Drawdown</th>
              <th className="px-2 py-2">Recovery</th>
              <th className="px-2 py-2">Volatility</th>
              <th className="px-2 py-2">Sharpe</th>
              <th className="px-2 py-2">P(Ruin)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.scenarioId}
                className={cn(
                  "border-b border-surface-border-subtle/60",
                  row.isBest && "bg-gain/5",
                  row.isWorst && "bg-loss/5"
                )}
              >
                <td className="px-2 py-2 font-semibold text-text-primary">
                  {row.label}
                  {row.isBest ? (
                    <span className="ml-1 text-[10px] text-gain">Best</span>
                  ) : null}
                  {row.isWorst ? (
                    <span className="ml-1 text-[10px] text-loss">Worst</span>
                  ) : null}
                </td>
                <td className="px-2 py-2">{row.expectedReturn}%</td>
                <td className="px-2 py-2">{row.risk}</td>
                <td className="px-2 py-2 text-loss">{row.drawdown}%</td>
                <td className="px-2 py-2">{row.recovery}</td>
                <td className="px-2 py-2">{row.volatility}</td>
                <td className="px-2 py-2">{row.sharpe}</td>
                <td className="px-2 py-2">{row.probabilityOfRuin}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});
