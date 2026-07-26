"use client";

import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { cn } from "@/lib/utils";
import type { PaperTrade } from "@/lib/paper-trading/types";
import {
  formatHoldingDuration,
  formatPercent,
  PAPER_EXIT_REASON_LABELS,
  PAPER_STRATEGY_LABELS,
} from "@/lib/paper-trading/format";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { memo } from "react";
import { TABLE_CLASSES } from "@/src/design/layout/tableStyles";

interface PaperBestWorstTablesProps {
  bestTrades: PaperTrade[];
  worstTrades: PaperTrade[];
  onSelect: (trade: PaperTrade) => void;
}

export function PaperBestWorstTables({
  bestTrades,
  worstTrades,
  onSelect,
}: PaperBestWorstTablesProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <CompactTradeTable
        title="Top Winners"
        tone="gain"
        icon={ArrowUpRight}
        trades={bestTrades}
        emptyMessage="No winning closed trades yet."
        onSelect={onSelect}
      />
      <CompactTradeTable
        title="Top Losers"
        tone="loss"
        icon={ArrowDownRight}
        trades={worstTrades}
        emptyMessage="No losing closed trades yet."
        onSelect={onSelect}
      />
    </div>
  );
}

function CompactTradeTable({
  title,
  tone,
  icon: Icon,
  trades,
  emptyMessage,
  onSelect,
}: {
  title: string;
  tone: "gain" | "loss";
  icon: typeof ArrowUpRight;
  trades: PaperTrade[];
  emptyMessage: string;
  onSelect: (trade: PaperTrade) => void;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-4">
      <div className="flex items-center gap-2">
        <Icon
          className={cn("h-4 w-4", tone === "gain" ? "text-gain" : "text-loss")}
        />
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>

      {trades.length === 0 ? (
        <EmptyStatePanel
          message={emptyMessage}
          source="Performance Analytics"
          className="py-5"
        />
      ) : (
        <div className={cn(TABLE_CLASSES.container, "overflow-x-auto")}>
          <table className={TABLE_CLASSES.table}>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th>Company</th>
                <th>Strategy</th>
                <th className="text-right">Return</th>
                <th>Holding Time</th>
                <th className="text-right">Confidence</th>
                <th>Exit Reason</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <CompactTradeRow
                  key={trade.id}
                  trade={trade}
                  onSelect={onSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const CompactTradeRow = memo(function CompactTradeRow({
  trade,
  onSelect,
}: {
  trade: PaperTrade;
  onSelect: (trade: PaperTrade) => void;
}) {
  return (
    <tr onClick={() => onSelect(trade)} className="cursor-pointer">
      <td>
        <div className="flex flex-col">
          <span className="font-medium text-text-primary">{trade.symbol}</span>
          <span className="line-clamp-1 text-[10px] text-text-faint">
            {trade.company}
          </span>
        </div>
      </td>
      <td className="text-text-secondary">
        {PAPER_STRATEGY_LABELS[trade.strategy]}
      </td>
      <td
        className={cn(
          TABLE_CLASSES.numericCell,
          "text-right font-medium",
          trade.returnPercent >= 0 ? "text-gain" : "text-loss"
        )}
      >
        {formatPercent(trade.returnPercent)}
      </td>
      <td className="text-text-secondary">
        {formatHoldingDuration(trade.holdingMs)}
      </td>
      <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
        {trade.confidence.toFixed(0)}%
      </td>
      <td className="text-text-secondary">
        {trade.exitReason ? PAPER_EXIT_REASON_LABELS[trade.exitReason] : "—"}
      </td>
    </tr>
  );
});
