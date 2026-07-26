"use client";

import { MetricCard } from "@/components/ui/MetricCard";
import type { PaperTradingKpis } from "@/lib/paper-trading/types";
import { formatPnl, formatPercent } from "@/lib/paper-trading/format";
import { cn } from "@/lib/utils";

interface PaperKpiStripProps {
  kpis: PaperTradingKpis;
  sharesLabel: string;
}

export function PaperKpiStrip({ kpis, sharesLabel }: PaperKpiStripProps) {
  const cards: Array<{
    label: string;
    value: string;
    subValue?: string;
    tone?: "gain" | "loss";
  }> = [
    { label: "Today's Trades", value: String(kpis.todaysTrades) },
    { label: "Open Positions", value: String(kpis.openPositions) },
    { label: "Closed Positions", value: String(kpis.closedPositions) },
    { label: "Win Rate", value: `${kpis.winRate.toFixed(1)}%` },
    {
      label: "Virtual P&L",
      value: formatPnl(kpis.totalVirtualPnl),
      tone:
        kpis.totalVirtualPnl > 0
          ? "gain"
          : kpis.totalVirtualPnl < 0
            ? "loss"
            : undefined,
      subValue: sharesLabel,
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
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <MetricCard
          key={card.label}
          label={card.label}
          value={card.value}
          subValue={card.subValue}
          className={cn(
            card.tone === "gain" && "[&_.font-mono]:text-gain",
            card.tone === "loss" && "[&_.font-mono]:text-loss"
          )}
        />
      ))}
    </div>
  );
}
