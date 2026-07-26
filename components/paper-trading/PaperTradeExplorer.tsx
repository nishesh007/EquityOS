"use client";

import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaperAnalyticsFilters } from "@/lib/paper-trading/analytics-types";
import type { PaperTrade } from "@/lib/paper-trading/types";
import {
  formatHoldingDuration,
  formatPercent,
  formatPnl,
  formatPrice,
  PAPER_EXIT_REASON_LABELS,
  PAPER_STRATEGY_LABELS,
} from "@/lib/paper-trading/format";
import { TABLE_CLASSES } from "@/src/design/layout/tableStyles";

interface PaperTradeExplorerProps {
  filters: PaperAnalyticsFilters;
  onChange: (next: PaperAnalyticsFilters) => void;
  trades: PaperTrade[];
  onSelect: (trade: PaperTrade) => void;
}

const selectClass = cn(
  "rounded-lg border border-surface-border-subtle bg-surface/60 px-2.5 py-1.5 text-xs text-text-secondary outline-none focus:border-accent/40"
);

export function PaperTradeExplorer({
  filters,
  onChange,
  trades,
  onSelect,
}: PaperTradeExplorerProps) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Section 5
        </p>
        <h2 className="mt-0.5 text-sm font-semibold text-text-primary">
          Trade Explorer
        </h2>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-3">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search company, trade ID, or recommendation ID"
            className="w-full rounded-lg border border-surface-border-subtle bg-surface/60 py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-faint outline-none focus:border-accent/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.strategy}
            onChange={(e) =>
              onChange({
                ...filters,
                strategy: e.target.value as PaperAnalyticsFilters["strategy"],
              })
            }
            className={selectClass}
            aria-label="Strategy"
          >
            <option value="all">All Strategies</option>
            <option value="intraday">Intraday</option>
            <option value="scalping">Scalping</option>
            <option value="swing">Swing</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) =>
              onChange({
                ...filters,
                status: e.target.value as PaperAnalyticsFilters["status"],
              })
            }
            className={selectClass}
            aria-label="Status"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={filters.outcome}
            onChange={(e) =>
              onChange({
                ...filters,
                outcome: e.target.value as PaperAnalyticsFilters["outcome"],
              })
            }
            className={selectClass}
            aria-label="Outcome"
          >
            <option value="all">All Outcomes</option>
            <option value="winning">Winning</option>
            <option value="losing">Losing</option>
            <option value="target_hit">Target Hit</option>
            <option value="stop_loss">Stop Loss</option>
          </select>

          <input
            type="text"
            value={filters.company}
            onChange={(e) => onChange({ ...filters, company: e.target.value })}
            placeholder="Company"
            className={selectClass}
            aria-label="Company filter"
          />

          <label className="flex items-center gap-1.5 text-[10px] text-text-muted">
            From
            <input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) =>
                onChange({ ...filters, dateFrom: e.target.value || null })
              }
              className={selectClass}
            />
          </label>

          <label className="flex items-center gap-1.5 text-[10px] text-text-muted">
            To
            <input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) =>
                onChange({ ...filters, dateTo: e.target.value || null })
              }
              className={selectClass}
            />
          </label>

          <span className="text-[10px] text-text-faint">
            {trades.length} results
          </span>
        </div>
      </div>

      {trades.length === 0 ? (
        <EmptyStatePanel
          title="No trades match filters."
          message="Adjust strategy, status, outcome, or date range to explore paper-trade history."
          source="Trade Explorer"
        />
      ) : (
        <div className={cn(TABLE_CLASSES.container, "overflow-x-auto")}>
          <table className={TABLE_CLASSES.table}>
            <caption className="sr-only">Trade explorer results</caption>
            <thead>
              <tr>
                <th>Company</th>
                <th>Strategy</th>
                <th className="text-right">Entry</th>
                <th className="text-right">Exit</th>
                <th>Holding Time</th>
                <th className="text-right">Return</th>
                <th className="text-right">Profit</th>
                <th>Exit Reason</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr
                  key={trade.id}
                  onClick={() => onSelect(trade)}
                  className="cursor-pointer"
                >
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium text-text-primary">
                        {trade.symbol}
                      </span>
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
                    {trade.exitPrice != null
                      ? formatPrice(trade.exitPrice)
                      : "—"}
                  </td>
                  <td className="text-text-secondary">
                    {formatHoldingDuration(trade.holdingMs)}
                  </td>
                  <td
                    className={cn(
                      TABLE_CLASSES.numericCell,
                      "text-right",
                      trade.returnPercent >= 0 ? "text-gain" : "text-loss"
                    )}
                  >
                    {formatPercent(trade.returnPercent)}
                  </td>
                  <td
                    className={cn(
                      TABLE_CLASSES.numericCell,
                      "text-right font-medium",
                      trade.pnl >= 0 ? "text-gain" : "text-loss"
                    )}
                  >
                    {formatPnl(trade.pnl)}
                  </td>
                  <td className="text-text-secondary">
                    {trade.exitReason
                      ? PAPER_EXIT_REASON_LABELS[trade.exitReason]
                      : trade.status === "open"
                        ? "Open"
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
