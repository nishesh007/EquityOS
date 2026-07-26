"use client";

import { memo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { WalkForwardDashboard } from "@/lib/optimization";

export interface ValidationDashboardProps {
  dashboard: WalkForwardDashboard | null;
}

export const ValidationDashboard = memo(function ValidationDashboard({
  dashboard,
}: ValidationDashboardProps) {
  if (!dashboard) {
    return (
      <Card hover={false} padding="sm" data-testid="validation-dashboard">
        <CardHeader
          title="Validation Dashboard"
          subtitle="KPIs appear after a walk-forward run completes"
        />
        <p className="mt-2 text-xs text-text-muted">No validation metrics yet.</p>
      </Card>
    );
  }

  const items = [
    { label: "Validation Cycles", value: String(dashboard.validationCycles) },
    { label: "Passed Cycles", value: String(dashboard.passedCycles) },
    { label: "Failed Cycles", value: String(dashboard.failedCycles) },
    { label: "Success Rate", value: `${dashboard.successRate}%` },
    { label: "Average Return", value: `${dashboard.averageReturn}%` },
    { label: "Average Drawdown", value: `${dashboard.averageDrawdown}%` },
    { label: "Average Sharpe", value: String(dashboard.averageSharpe) },
    {
      label: "Average Profit Factor",
      value: String(dashboard.averageProfitFactor),
    },
    {
      label: "Robustness Score",
      value: String(dashboard.robustness.score),
      accent: true,
    },
    { label: "Overall Grade", value: dashboard.overallGrade, accent: true },
  ] as const;

  return (
    <Card hover={false} padding="sm" data-testid="validation-dashboard">
      <CardHeader
        title="Validation Dashboard"
        subtitle="Institutional walk-forward KPIs and grade"
      />
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-3 py-2.5"
          >
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              {item.label}
            </dt>
            <dd
              className={cn(
                "mt-1 text-sm font-semibold",
                "accent" in item && item.accent
                  ? "text-accent"
                  : "text-text-primary"
              )}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      {dashboard.insights.length > 0 ? (
        <ul className="mt-3 space-y-1" aria-label="AI research insights">
          {dashboard.insights.map((insight) => (
            <li key={insight} className="text-[11px] text-text-secondary">
              • {insight}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
});
