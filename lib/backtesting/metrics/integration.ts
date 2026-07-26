/**
 * Sprint 11B.1 — Metrics integration with Sprint 11F.1 analytics.
 * No duplicate metric formulas — delegates to lib/analytics.
 */

import {
  computeTradeStatistics,
  type TradeStatistics,
  type TradeStatisticsInput,
} from "@/lib/analytics";
import type { BacktestTrade } from "@/lib/backtesting/types";

export function toTradeStatisticsInput(
  trade: BacktestTrade
): TradeStatisticsInput | null {
  if (trade.status !== "closed") return null;
  if (trade.returnPercent == null || !Number.isFinite(trade.returnPercent)) {
    return null;
  }
  return {
    returnPercent: trade.returnPercent,
    pnl: trade.pnl,
    holdingMs: trade.holdingMs,
    hitTarget: trade.hitTarget,
    hitStopLoss: trade.hitStopLoss,
  };
}

export function computeBacktestStatistics(
  trades: readonly BacktestTrade[]
): TradeStatistics {
  const inputs = trades
    .map(toTradeStatisticsInput)
    .filter((row): row is TradeStatisticsInput => row != null);
  return computeTradeStatistics(inputs);
}

export function emptyTradeStatistics(): TradeStatistics {
  return computeTradeStatistics([]);
}
