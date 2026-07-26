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
  PAPER_STATUS_LABELS,
  PAPER_STRATEGY_LABELS,
} from "@/lib/paper-trading/format";
import { FlaskConical } from "lucide-react";
import { TABLE_CLASSES } from "@/src/design/layout/tableStyles";
import { usePaperTableWindow } from "@/components/paper-trading/usePaperTableWindow";

interface PaperActiveTradesTableProps {
  trades: readonly PaperTrade[];
  onSelect: (trade: PaperTrade) => void;
}

export function PaperActiveTradesTable({
  trades,
  onSelect,
}: PaperActiveTradesTableProps) {
  const virt = usePaperTableWindow(trades.length);
  const visible = useMemo(
    () => trades.slice(virt.start, virt.end),
    [trades, virt.start, virt.end]
  );

  if (trades.length === 0) {
    return (
      <EmptyStatePanel
        icon={FlaskConical}
        title="No active trades"
        message="The engine will open virtual BUY positions from the highest-conviction recommendations on the next sync cycle."
        source="Paper Trading Lab · Active book"
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
        <caption className="sr-only">Active paper trades</caption>
        <thead>
          <tr>
            <th>Company</th>
            <th>Strategy</th>
            <th className="text-right">Entry</th>
            <th className="text-right">Current</th>
            <th className="text-right">P&L</th>
            <th className="text-right">Return %</th>
            <th className="text-right">Confidence</th>
            <th>Holding Time</th>
            <th>Status</th>
            <th>Exit Progress</th>
          </tr>
        </thead>
        <tbody>
          {virt.enabled && virt.padTop > 0 ? (
            <tr aria-hidden>
              <td colSpan={10} style={{ height: virt.padTop, padding: 0 }} />
            </tr>
          ) : null}
          {visible.map((trade) => (
            <ActiveTradeRow key={trade.id} trade={trade} onSelect={onSelect} />
          ))}
          {virt.enabled && virt.padBottom > 0 ? (
            <tr aria-hidden>
              <td colSpan={10} style={{ height: virt.padBottom, padding: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

const ActiveTradeRow = memo(function ActiveTradeRow({
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
      aria-label={`Open details for ${trade.symbol}`}
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
      <td className="text-text-secondary">
        {PAPER_STRATEGY_LABELS[trade.strategy]}
      </td>
      <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
        {formatPrice(trade.entryPrice)}
      </td>
      <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
        {formatPrice(trade.currentPrice)}
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
      <td
        className={cn(
          TABLE_CLASSES.numericCell,
          "text-right",
          profitable ? "text-gain" : "text-loss"
        )}
      >
        {formatPercent(trade.returnPercent)}
      </td>
      <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
        {trade.confidence.toFixed(0)}%
      </td>
      <td className="text-text-secondary">
        {formatHoldingDuration(trade.holdingMs)}
      </td>
      <td>
        <span className="inline-flex rounded-md border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
          {PAPER_STATUS_LABELS[trade.status]}
        </span>
      </td>
      <td>
        <ExitProgress trade={trade} />
      </td>
    </tr>
  );
});

function ExitProgress({ trade }: { trade: PaperTrade }) {
  const levels = [
    {
      key: "SL",
      price: trade.stopLoss,
      hit: trade.currentPrice <= trade.stopLoss,
    },
    ...trade.targets.map((price, i) => ({
      key: `T${i + 1}`,
      price,
      hit: trade.targetsHit >= i + 1 || trade.currentPrice >= price,
    })),
  ];

  return (
    <div className="flex items-center gap-1" aria-label="Exit progress">
      {levels.map((level) => (
        <span
          key={level.key}
          title={`${level.key} ${formatPrice(level.price)}`}
          className={cn(
            "inline-flex h-5 min-w-[1.75rem] items-center justify-center rounded border px-1 text-[9px] font-semibold",
            level.hit
              ? level.key === "SL"
                ? "border-loss/40 bg-loss/15 text-loss"
                : "border-gain/40 bg-gain/15 text-gain"
              : "border-surface-border-subtle bg-surface/40 text-text-faint"
          )}
        >
          {level.key}
        </span>
      ))}
    </div>
  );
}
