/**
 * Paper Trading Lab — analytics filters & search (Sprint 11E.2).
 * Pure functions over trade history — never mutates trades.
 */

import type { PaperTrade } from "@/lib/paper-trading/types";
import type { PaperAnalyticsFilters } from "@/lib/paper-trading/analytics-types";
import { isTradeClosed, isTradeOpen } from "@/lib/paper-trading/kpis";

export const DEFAULT_PAPER_ANALYTICS_FILTERS: PaperAnalyticsFilters = {
  strategy: "all",
  outcome: "all",
  status: "all",
  dateFrom: null,
  dateTo: null,
  search: "",
  company: "",
};

function tradeAnchorIso(trade: PaperTrade): string {
  return trade.exitAt ?? trade.entryAt;
}

function isTargetHit(trade: PaperTrade): boolean {
  return (
    trade.exitReason === "target_1" ||
    trade.exitReason === "target_2" ||
    trade.exitReason === "target_3" ||
    trade.status === "target_1_hit" ||
    trade.status === "target_2_hit" ||
    trade.status === "target_3_hit"
  );
}

function isStopLoss(trade: PaperTrade): boolean {
  return (
    trade.exitReason === "stop_loss" || trade.status === "stop_loss_hit"
  );
}

function matchesSearch(trade: PaperTrade, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    trade.symbol.toLowerCase().includes(q) ||
    trade.company.toLowerCase().includes(q) ||
    trade.id.toLowerCase().includes(q) ||
    trade.recommendation.recommendationId.toLowerCase().includes(q) ||
    trade.strategy.toLowerCase().includes(q)
  );
}

function matchesCompany(trade: PaperTrade, company: string): boolean {
  const q = company.trim().toLowerCase();
  if (!q) return true;
  return (
    trade.symbol.toLowerCase().includes(q) ||
    trade.company.toLowerCase().includes(q)
  );
}

function matchesDateRange(
  trade: PaperTrade,
  filters: PaperAnalyticsFilters
): boolean {
  const ts = Date.parse(tradeAnchorIso(trade));
  if (filters.dateFrom) {
    const from = Date.parse(filters.dateFrom);
    if (!Number.isNaN(from) && ts < from) return false;
  }
  if (filters.dateTo) {
    const to = Date.parse(filters.dateTo);
    const end = filters.dateTo.length <= 10 ? to + 86_400_000 - 1 : to;
    if (!Number.isNaN(end) && ts > end) return false;
  }
  return true;
}

/** Filter trade history for analytics / trade explorer (read-only). */
export function filterTradesForAnalytics(
  trades: readonly PaperTrade[],
  filters: PaperAnalyticsFilters
): PaperTrade[] {
  return trades.filter((trade) => {
    if (filters.strategy !== "all" && trade.strategy !== filters.strategy) {
      return false;
    }
    if (filters.status === "open" && !isTradeOpen(trade)) return false;
    if (filters.status === "closed" && !isTradeClosed(trade)) return false;
    if (filters.outcome === "winning" && !(trade.pnl > 0)) return false;
    if (filters.outcome === "losing" && !(trade.pnl < 0)) return false;
    if (filters.outcome === "target_hit" && !isTargetHit(trade)) return false;
    if (filters.outcome === "stop_loss" && !isStopLoss(trade)) return false;
    if (!matchesSearch(trade, filters.search)) return false;
    if (!matchesCompany(trade, filters.company)) return false;
    if (!matchesDateRange(trade, filters)) return false;
    return true;
  });
}
