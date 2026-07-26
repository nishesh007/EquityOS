"use client";

import { memo, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import {
  buildComparisonHighlight,
  type BuiltStrategy,
} from "@/lib/strategy-builder";
import { cn } from "@/lib/utils";

function highlightClass(
  id: string,
  winnerId: string | null,
  active: boolean
): string {
  if (!active || !winnerId || winnerId !== id) return "";
  return "bg-accent/15 text-accent font-semibold";
}

export const StrategyComparison = memo(function StrategyComparison({
  strategies,
}: {
  strategies: readonly BuiltStrategy[];
}) {
  const highlight = useMemo(
    () => buildComparisonHighlight(strategies),
    [strategies]
  );

  if (strategies.length < 2) {
    return (
      <Card padding="lg" data-testid="strategy-comparison">
        <h2 className="text-base font-semibold text-text-primary">
          Comparison Workspace
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Add at least two strategies to comparison (max 5) from the library or generated list.
        </p>
      </Card>
    );
  }

  const rows: {
    label: string;
    key: keyof typeof highlight;
    render: (s: BuiltStrategy) => string;
  }[] = [
    {
      label: "Historical Return",
      key: "bestReturnId",
      render: (s) => `${s.performance.historicalReturn}%`,
    },
    {
      label: "Max Drawdown",
      key: "lowestDrawdownId",
      render: (s) => `${s.performance.maxDrawdown}%`,
    },
    {
      label: "Sharpe",
      key: "highestSharpeId",
      render: (s) => String(s.performance.sharpe),
    },
    {
      label: "Win Rate",
      key: "highestWinRateId",
      render: (s) => `${s.performance.winRate}%`,
    },
    {
      label: "Risk / Reward",
      key: "bestRiskRewardId",
      render: (s) => String(s.performance.riskReward),
    },
    {
      label: "Consistency",
      key: "bestConsistencyId",
      render: (s) => String(s.scores.consistency),
    },
  ];

  return (
    <Card padding="lg" data-testid="strategy-comparison">
      <h2 className="text-base font-semibold text-text-primary">
        Comparison Workspace
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Leaders highlighted for return, drawdown, Sharpe, win rate, RR, and consistency.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table
          className="min-w-full border-collapse text-left text-sm"
          aria-label="Strategy comparison table"
        >
          <thead>
            <tr className="border-b border-surface-border-subtle text-xs text-text-faint">
              <th scope="col" className="px-3 py-2 font-medium">
                Metric
              </th>
              {strategies.map((s) => (
                <th
                  key={s.id}
                  scope="col"
                  className="px-3 py-2 font-medium text-text-secondary"
                >
                  {s.name}
                  <div className="text-[10px] text-accent">{s.scores.grade}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-surface-border-subtle/60"
              >
                <th
                  scope="row"
                  className="px-3 py-2 text-xs font-medium text-text-faint"
                >
                  {row.label}
                </th>
                {strategies.map((s) => (
                  <td
                    key={s.id}
                    className={cn(
                      "px-3 py-2 tabular-nums text-text-primary",
                      highlightClass(s.id, highlight[row.key], true)
                    )}
                  >
                    {row.render(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});
