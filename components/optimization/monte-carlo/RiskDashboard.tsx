"use client";

import { memo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { MonteCarloDashboard } from "@/lib/optimization";

export interface RiskDashboardProps {
  dashboard: MonteCarloDashboard | null;
}

export const RiskDashboard = memo(function RiskDashboard({
  dashboard,
}: RiskDashboardProps) {
  if (!dashboard) {
    return (
      <Card hover={false} padding="sm" data-testid="risk-dashboard">
        <CardHeader title="Risk Dashboard" subtitle="KPIs after simulation completes" />
        <p className="mt-2 text-xs text-text-muted">No Monte Carlo results yet.</p>
      </Card>
    );
  }

  const items = [
    { label: "Total Simulations", value: String(dashboard.totalSimulations) },
    { label: "Simulation Status", value: dashboard.status },
    { label: "Average Return", value: `${dashboard.averageReturn}%` },
    { label: "Median Return", value: `${dashboard.medianReturn}%` },
    { label: "Worst Drawdown", value: `${dashboard.worstDrawdown}%` },
    { label: "Probability of Ruin", value: `${dashboard.probabilityOfRuin}%` },
    { label: "95% Conf. Return", value: `${dashboard.confidence95Return}%` },
    { label: "95% Conf. Drawdown", value: `${dashboard.confidence95Drawdown}%` },
    { label: "Risk Grade", value: dashboard.riskGrade, accent: true },
    {
      label: "Overall Stability Score",
      value: String(dashboard.overallStabilityScore),
      accent: true,
    },
  ] as const;

  return (
    <Card hover={false} padding="sm" data-testid="risk-dashboard">
      <CardHeader
        title="Risk Dashboard"
        subtitle="Institutional Monte Carlo KPIs and stability"
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
        <ul className="mt-3 space-y-1" aria-label="AI risk insights">
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
