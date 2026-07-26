"use client";

import { memo } from "react";
import { Card } from "@/components/ui/Card";
import { AnalyticsKpi } from "@/components/analytics/kpis/AnalyticsKpi";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import type { BuiltStrategy } from "@/lib/strategy-builder";
import {
  Activity,
  BarChart3,
  Percent,
  Shield,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";

export const PerformanceDashboard = memo(function PerformanceDashboard({
  strategy,
}: {
  strategy: BuiltStrategy | null;
}) {
  if (!strategy) {
    return (
      <Card padding="lg" data-testid="performance-dashboard">
        <h2 className="text-base font-semibold text-text-primary">
          Performance Dashboard
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Select a generated or library strategy to view institutional metrics.
        </p>
      </Card>
    );
  }

  const p = strategy.performance;
  const s = strategy.scores;

  return (
    <Card padding="lg" data-testid="performance-dashboard" accent="emerald">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Performance Dashboard
          </h2>
          <p className="mt-1 text-sm text-text-secondary">{strategy.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <ScoreGauge score={s.overall} label="Overall" size={120} />
          <div className="text-center">
            <div className="text-xs text-text-faint">Grade</div>
            <div className="text-2xl font-semibold text-accent">{s.grade}</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <AnalyticsKpi
          label="Historical Return"
          value={`${p.historicalReturn}%`}
          icon={TrendingUp}
          tone={p.historicalReturn >= 0 ? "positive" : "negative"}
        />
        <AnalyticsKpi label="Win Rate" value={`${p.winRate}%`} icon={Percent} />
        <AnalyticsKpi
          label="Profit Factor"
          value={String(p.profitFactor)}
          icon={BarChart3}
        />
        <AnalyticsKpi label="Sharpe" value={String(p.sharpe)} icon={Activity} />
        <AnalyticsKpi
          label="Sortino"
          value={String(p.sortino)}
          icon={Activity}
        />
        <AnalyticsKpi
          label="Max Drawdown"
          value={`${p.maxDrawdown}%`}
          icon={Shield}
          tone="negative"
        />
        <AnalyticsKpi
          label="Expectancy"
          value={String(p.expectancy)}
          icon={Target}
        />
        <AnalyticsKpi
          label="Avg Holding"
          value={`${p.averageHoldingDays}d`}
          icon={Timer}
        />
        <AnalyticsKpi
          label="Risk / Reward"
          value={String(p.riskReward)}
          icon={Target}
        />
        <AnalyticsKpi label="CAGR" value={`${p.cagr}%`} icon={TrendingUp} />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Technical", s.technical],
            ["Fundamental", s.fundamental],
            ["Risk", s.risk],
            ["Consistency", s.consistency],
            ["Robustness", s.robustness],
            ["Optimization", s.optimization],
            ["Walk-Forward", s.walkForward],
            ["Monte Carlo", s.monteCarlo],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-3 py-2"
          >
            <div className="text-xs text-text-faint">{label}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">
                {value}
              </span>
              <div
                className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-raised"
                role="meter"
                aria-label={`${label} score`}
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});
