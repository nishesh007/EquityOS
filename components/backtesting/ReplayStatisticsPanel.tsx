"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { cn, formatCurrency } from "@/lib/utils";
import type { ReplayStatistics } from "@/lib/backtesting/replay";

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ReplayStatisticsPanel({
  stats,
}: {
  stats: ReplayStatistics | null;
}) {
  if (!stats) {
    return (
      <EmptyStatePanel
        title="Replay Statistics"
        message="Select a session to begin replay."
        source="Historical Replay"
      />
    );
  }

  const items = [
    { label: "Elapsed Replay Time", value: formatElapsed(stats.elapsedReplayTimeMs) },
    { label: "Trades Executed", value: String(stats.tradesExecuted) },
    { label: "Open Trades", value: String(stats.openTrades) },
    { label: "Closed Trades", value: String(stats.closedTrades) },
    {
      label: "Current P&L",
      value: formatCurrency(stats.currentPnl),
      tone:
        stats.currentPnl > 0
          ? "text-gain"
          : stats.currentPnl < 0
            ? "text-loss"
            : "text-text-primary",
    },
    {
      label: "Replay Progress",
      value: `${stats.replayProgress.toFixed(0)}%`,
    },
  ];

  return (
    <Card hover={false} padding="sm" data-testid="replay-statistics">
      <CardHeader title="Replay Statistics" subtitle="As-of visible history only" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-2.5 py-2"
          >
            <p className="data-label">{item.label}</p>
            <p
              className={cn(
                "mt-1 font-mono text-sm font-semibold tabular-nums",
                item.tone ?? "text-text-primary"
              )}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-overlay">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200"
          style={{ width: `${Math.min(100, Math.max(0, stats.replayProgress))}%` }}
        />
      </div>
    </Card>
  );
}
