"use client";

import { memo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { RankingMetric, RankingMode } from "@/lib/optimization";

const MODES: { id: RankingMode; label: string; description: string }[] = [
  {
    id: "single",
    label: "Single Metric",
    description: "Rank solely by the selected primary metric.",
  },
  {
    id: "weighted",
    label: "Weighted",
    description: "Composite weights across core KPIs.",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Balanced return, hit-rate, and drawdown.",
  },
  {
    id: "risk_adjusted",
    label: "Risk Adjusted",
    description: "Prioritize Sharpe, Sortino, and drawdown.",
  },
];

const METRICS: { id: RankingMetric; label: string }[] = [
  { id: "profitFactor", label: "Profit Factor" },
  { id: "winRate", label: "Win Rate" },
  { id: "riskReward", label: "Risk Reward" },
  { id: "sharpe", label: "Sharpe" },
  { id: "sortino", label: "Sortino" },
  { id: "maxDrawdown", label: "Max Drawdown" },
  { id: "expectancy", label: "Expectancy" },
  { id: "cagr", label: "CAGR" },
];

export interface RankingSelectorProps {
  rankingMode: RankingMode;
  primaryMetric: RankingMetric;
  onRankingModeChange: (mode: RankingMode) => void;
  onPrimaryMetricChange: (metric: RankingMetric) => void;
}

export const RankingSelector = memo(function RankingSelector({
  rankingMode,
  primaryMetric,
  onRankingModeChange,
  onPrimaryMetricChange,
}: RankingSelectorProps) {
  return (
    <Card hover={false} padding="sm" data-testid="ranking-selector">
      <CardHeader
        title="Ranking Engine"
        subtitle="Choose how optimization results are scored"
      />
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MODES.map((mode) => {
          const selected = rankingMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onRankingModeChange(mode.id)}
              aria-pressed={selected}
              className={cn(
                "rounded-lg border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                selected
                  ? "border-accent/40 bg-accent/10"
                  : "border-surface-border-subtle bg-surface-overlay/40 hover:bg-surface-hover"
              )}
            >
              <p className="text-xs font-semibold text-text-primary">
                {mode.label}
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {mode.description}
              </p>
            </button>
          );
        })}
      </div>

      {rankingMode === "single" ? (
        <label className="mt-3 block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            Primary Metric
          </span>
          <select
            value={primaryMetric}
            onChange={(e) =>
              onPrimaryMetricChange(e.target.value as RankingMetric)
            }
            aria-label="Primary ranking metric"
            className="w-full rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2.5 py-1.5 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            {METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </Card>
  );
});
