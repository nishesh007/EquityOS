"use client";

import { MetricCard } from "@/components/ui/MetricCard";
import type { PaperExecutiveKpis } from "@/lib/paper-trading/analytics-types";
import {
  formatDateTime,
  formatHoldingDuration,
  formatPnl,
  formatPercent,
  PAPER_STRATEGY_LABELS,
} from "@/lib/paper-trading/format";
import { cn } from "@/lib/utils";

interface PaperExecutiveSummaryProps {
  kpis: PaperExecutiveKpis;
}

export function PaperExecutiveSummary({ kpis }: PaperExecutiveSummaryProps) {
  const cards: Array<{
    label: string;
    value: string;
    tone?: "gain" | "loss";
  }> = [
    { label: "Total Trades", value: String(kpis.totalTrades) },
    { label: "Open Positions", value: String(kpis.openPositions) },
    { label: "Closed Positions", value: String(kpis.closedPositions) },
    { label: "Winning Trades", value: String(kpis.winningTrades) },
    { label: "Losing Trades", value: String(kpis.losingTrades) },
    { label: "Overall Win Rate", value: `${kpis.overallWinRate.toFixed(1)}%` },
    {
      label: "Net Virtual P&L",
      value: formatPnl(kpis.netVirtualPnl),
      tone:
        kpis.netVirtualPnl > 0
          ? "gain"
          : kpis.netVirtualPnl < 0
            ? "loss"
            : undefined,
    },
    {
      label: "Average Return",
      value: formatPercent(kpis.averageReturn),
      tone:
        kpis.averageReturn > 0
          ? "gain"
          : kpis.averageReturn < 0
            ? "loss"
            : undefined,
    },
    {
      label: "Average Holding Time",
      value: formatHoldingDuration(kpis.averageHoldingMs),
    },
    {
      label: "Profit Factor",
      value: kpis.profitFactor >= 99.99 ? "∞" : kpis.profitFactor.toFixed(2),
    },
    {
      label: "Maximum Drawdown",
      value: formatPnl(-Math.abs(kpis.maximumDrawdown)),
      tone: kpis.maximumDrawdown > 0 ? "loss" : undefined,
    },
    {
      label: "Best Strategy",
      value: kpis.bestStrategy
        ? PAPER_STRATEGY_LABELS[kpis.bestStrategy]
        : "—",
    },
    {
      label: "Worst Strategy",
      value: kpis.worstStrategy
        ? PAPER_STRATEGY_LABELS[kpis.worstStrategy]
        : "—",
    },
    {
      label: "Last Updated",
      value: kpis.lastUpdated ? formatDateTime(kpis.lastUpdated) : "—",
    },
  ];

  return (
    <section className="space-y-3">
      <SectionHeader
        eyebrow="Section 1"
        title="Executive Performance Summary"
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            className={cn(
              "p-3",
              card.tone === "gain" && "[&_.font-mono]:text-gain",
              card.tone === "loss" && "[&_.font-mono]:text-loss"
            )}
          />
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-0.5 text-sm font-semibold text-text-primary">{title}</h2>
    </div>
  );
}
