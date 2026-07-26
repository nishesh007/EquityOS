/**
 * Paper Trading Lab — KPI helpers (Sprint 11E.1 — no analytics suite).
 */

import type { PaperTrade, PaperTradingKpis } from "@/lib/paper-trading/types";

function isSameTradingDay(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function computeTradePnl(
  entryPrice: number,
  markPrice: number,
  shares: number
): { pnl: number; returnPercent: number } {
  const pnl = (markPrice - entryPrice) * shares;
  const returnPercent =
    entryPrice > 0 ? ((markPrice - entryPrice) / entryPrice) * 100 : 0;
  return {
    pnl: Math.round(pnl * 100) / 100,
    returnPercent: Math.round(returnPercent * 100) / 100,
  };
}

export function computeKpis(
  trades: readonly PaperTrade[],
  now = new Date()
): PaperTradingKpis {
  const open = trades.filter((t) => t.status === "open");
  const closed = trades.filter((t) => t.status !== "open");
  const todaysTrades = trades.filter((t) => isSameTradingDay(t.entryAt, now));
  const wins = closed.filter((t) => t.pnl > 0);
  const allReturns = closed.map((t) => t.returnPercent);
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  return {
    todaysTrades: todaysTrades.length,
    openPositions: open.length,
    closedPositions: closed.length,
    winRate:
      closed.length === 0
        ? 0
        : Math.round((wins.length / closed.length) * 1000) / 10,
    totalVirtualPnl: Math.round(totalPnl * 100) / 100,
    averageReturn:
      allReturns.length === 0
        ? 0
        : Math.round(average(allReturns) * 100) / 100,
  };
}

export function isTradeOpen(trade: PaperTrade): boolean {
  return trade.status === "open";
}

export function isTradeClosed(trade: PaperTrade): boolean {
  return trade.status !== "open";
}
