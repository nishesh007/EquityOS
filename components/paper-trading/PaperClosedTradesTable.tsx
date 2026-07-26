"use client";

import { memo, useMemo } from "react";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { cn } from "@/lib/utils";
import type { PaperTrade } from "@/lib/paper-trading/types";
import {
  formatHoldingDuration,
  formatPercent,
  formatPnl,
  formatPrice,
  PAPER_EXIT_REASON_LABELS,
  PAPER_STRATEGY_LABELS,
} from "@/lib/paper-trading/format";
import { History } from "lucide-react";
import { TABLE_CLASSES } from "@/src/design/layout/tableStyles";
import { usePaperTableWindow } from "@/components/paper-trading/usePaperTableWindow";

interface PaperClosedTradesTableProps {
  trades: readonly PaperTrade[];
  onSelect: (trade: PaperTrade) => void;
}

export function PaperClosedTradesTable({
  trades,
  onSelect,
}: PaperClosedTradesTableProps) {
  const virt = usePaperTableWindow(trades.length);
  const visible = useMemo(
    () => trades.slice(virt.start, virt.end),
    [trades, virt.start, virt.end]
  );

  if (trades.length === 0) {
    return (
      <EmptyStatePanel
        icon={History}
        title="No completed trades"
        message="Closed positions appear after stop-loss, target, expiry, or session-close exits."
        source="Paper Trading Lab · History"
      />
    );
  }

  return (
    <div
      ref={virt.scrollerRef}
      onScroll={virt.onScroll}
      style={virt.style}
      className={cn(
        TABLE_CLASSES.container,
        "overflow-x-auto transition-opacity duration-200"
      )}
    >
      <table className={TABLE_CLASSES.table}>
        <caption className="sr-only">Closed paper trades</caption>
        <thead>
          <tr>
            <th>Company</th>
            <th className="text-right">Entry</th>
            <th className="text-right">Exit</th>
            <th>Exit Reason</th>
            <th>Holding Time</th>
            <th className="text-right">Return %</th>
            <th className="text-right">Profit Loss</th>
            <th>Strategy</th>
          </tr>
        </thead>
        <tbody>
          {virt.enabled && virt.padTop > 0 ? (
            <tr aria-hidden>
              <td colSpan={8} style={{ height: virt.padTop, padding: 0 }} />
            </tr>
          ) : null}
          {visible.map((trade) => (
            <ClosedTradeRow key={trade.id} trade={trade} onSelect={onSelect} />
          ))}
          {virt.enabled && virt.padBottom > 0 ? (
            <tr aria-hidden>
              <td colSpan={8} style={{ height: virt.padBottom, padding: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

const ClosedTradeRow = memo(function ClosedTradeRow({
  trade,
  onSelect,
}: {
  trade: PaperTrade;
  onSelect: (trade: PaperTrade) => void;
}) {
  const profitable = trade.pnl >= 0;
  return (
    <tr
      onClick={() => onSelect(trade)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(trade);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open details for closed trade ${trade.symbol}`}
      className="cursor-pointer transition-colors duration-150 hover:bg-surface-hover/50"
    >
      <td>
        <div className="flex flex-col">
          <span className="font-medium text-text-primary">{trade.symbol}</span>
          <span className="line-clamp-1 text-[10px] text-text-faint">
            {trade.company}
          </span>
        </div>
      </td>
      <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
        {formatPrice(trade.entryPrice)}
      </td>
      <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
        {trade.exitPrice != null ? formatPrice(trade.exitPrice) : "—"}
      </td>
      <td className="text-text-secondary">
        {trade.exitReason ? PAPER_EXIT_REASON_LABELS[trade.exitReason] : "—"}
      </td>
      <td className="text-text-secondary">
        {formatHoldingDuration(trade.holdingMs)}
      </td>
      <td
        className={cn(
          TABLE_CLASSES.numericCell,
          "text-right",
          profitable ? "text-gain" : "text-loss"
        )}
      >
        {formatPercent(trade.returnPercent)}
      </td>
      <td
        className={cn(
          TABLE_CLASSES.numericCell,
          "text-right font-medium",
          profitable ? "text-gain" : "text-loss"
        )}
      >
        {formatPnl(trade.pnl)}
      </td>
      <td className="text-text-secondary">
        {PAPER_STRATEGY_LABELS[trade.strategy]}
      </td>
    </tr>
  );
});
