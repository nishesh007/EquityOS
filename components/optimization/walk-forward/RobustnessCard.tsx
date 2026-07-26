"use client";

import { memo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { RobustnessScore } from "@/lib/optimization";

export interface RobustnessCardProps {
  robustness: RobustnessScore | null;
}

export const RobustnessCard = memo(function RobustnessCard({
  robustness,
}: RobustnessCardProps) {
  if (!robustness) {
    return (
      <Card hover={false} padding="sm" data-testid="robustness-card">
        <CardHeader title="Robustness Score" subtitle="0–100 institutional score" />
        <p className="mt-2 text-xs text-text-muted">Run validation to score robustness.</p>
      </Card>
    );
  }

  const factors = [
    ["Performance Consistency", robustness.factors.performanceConsistency],
    ["Drawdown Stability", robustness.factors.drawdownStability],
    ["Profit Stability", robustness.factors.profitStability],
    ["Win Rate Stability", robustness.factors.winRateStability],
    ["Parameter Stability", robustness.factors.parameterStability],
    ["Out-of-Sample Performance", robustness.factors.outOfSamplePerformance],
    ["Risk Consistency", robustness.factors.riskConsistency],
  ] as const;

  return (
    <Card hover={false} padding="sm" accent="violet" data-testid="robustness-card">
      <CardHeader
        title="Robustness Score"
        subtitle={`${robustness.grade} · composite of consistency and OOS quality`}
        badge={
          <span className="rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">
            {robustness.score}
          </span>
        }
      />
      <ul className="mt-3 space-y-2">
        {factors.map(([label, value]) => (
          <li key={label}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted">{label}</span>
              <span className="font-semibold text-text-primary">{value}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-overlay">
              <div
                className={cn(
                  "h-full rounded-full",
                  value >= 70 ? "bg-gain" : value >= 50 ? "bg-accent" : "bg-loss/70"
                )}
                style={{ width: `${Math.min(100, value)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
});
