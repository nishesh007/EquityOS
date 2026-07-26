/**
 * Paper Trading Lab — formatting helpers for UI (Sprint 11E.1).
 */

import type {
  PaperExitReason,
  PaperStrategy,
  PaperTradeStatus,
} from "@/lib/paper-trading/types";

export const PAPER_STRATEGY_LABELS: Record<PaperStrategy, string> = {
  intraday: "Intraday",
  scalping: "Scalping",
  swing: "Swing",
};

export const PAPER_STATUS_LABELS: Record<PaperTradeStatus, string> = {
  open: "Open",
  target_1_hit: "Target 1 Hit",
  target_2_hit: "Target 2 Hit",
  target_3_hit: "Target 3 Hit",
  stop_loss_hit: "Stop Loss Hit",
  expired: "Expired",
  closed: "Closed",
};

export const PAPER_EXIT_REASON_LABELS: Record<PaperExitReason, string> = {
  stop_loss: "Stop Loss",
  target_1: "Target 1",
  target_2: "Target 2",
  target_3: "Target 3",
  recommendation_expired: "Recommendation Expired",
  market_close: "Market Close",
  session_end: "Session End",
};

export function formatPnl(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}₹${Math.abs(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatHoldingDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 48) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

export function formatClock(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatPrice(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
