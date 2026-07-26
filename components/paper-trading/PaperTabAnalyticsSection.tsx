"use client";

import { TabBar } from "@/components/ui/TabBar";
import type {
  PaperAnalyticsTab,
  PaperTabPerformanceMetrics,
} from "@/lib/paper-trading/analytics-types";
import {
  formatHoldingDuration,
  formatPnl,
  PAPER_STRATEGY_LABELS,
} from "@/lib/paper-trading/format";

const TABS: Array<{ id: PaperAnalyticsTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "intraday", label: "Intraday" },
  { id: "scalping", label: "Scalping" },
  { id: "swing", label: "Swing" },
];

interface PaperTabAnalyticsSectionProps {
  tab: PaperAnalyticsTab;
  onTabChange: (tab: PaperAnalyticsTab) => void;
  metrics: PaperTabPerformanceMetrics;
}

export function PaperTabAnalyticsSection({
  tab,
  onTabChange,
  metrics,
}: PaperTabAnalyticsSectionProps) {
  const title =
    metrics.strategy === "overview"
      ? "Overview"
      : PAPER_STRATEGY_LABELS[metrics.strategy];

  const rows = [
    { label: "Total Trades", value: String(metrics.totalTrades) },
    { label: "Winning Trades", value: String(metrics.winningTrades) },
    { label: "Losing Trades", value: String(metrics.losingTrades) },
    { label: "Win %", value: `${metrics.winPercent.toFixed(1)}%` },
    { label: "Average Gain", value: formatPnl(metrics.averageGain) },
    {
      label: "Average Loss",
      value: formatPnl(-Math.abs(metrics.averageLoss)),
    },
    { label: "Largest Winner", value: formatPnl(metrics.largestWinner) },
    { label: "Largest Loser", value: formatPnl(metrics.largestLoser) },
    {
      label: "Average Holding Time",
      value: formatHoldingDuration(metrics.averageHoldingMs),
    },
    {
      label: "Average Risk Reward",
      value: metrics.averageRiskReward.toFixed(2),
    },
    {
      label: "Average Conviction",
      value: metrics.averageConviction.toFixed(1),
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Section 3
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-text-primary">
            Performance Analytics · {title}
          </h2>
        </div>
        <TabBar tabs={TABS} activeTab={tab} onTabChange={onTabChange} />
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2"
          >
            <dt className="text-[10px] text-text-muted">{row.label}</dt>
            <dd className="mt-0.5 font-mono text-xs font-medium text-text-primary tabular-nums">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
