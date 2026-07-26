/**
 * Sprint 11B.1 — Trade simulation helpers for the execution pipeline.
 */

import type {
  BacktestExitReason,
  BacktestRecommendationSnapshot,
  BacktestTrade,
  BacktestTradeEvent,
} from "@/lib/backtesting/types";
import type { OhlcvBar } from "@/lib/backtesting/dataset/types";
import type { RuleEvaluationResult } from "@/lib/backtesting/rules";

function eventId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createTradeEvent(
  type: string,
  label: string,
  at: string,
  price?: number
): BacktestTradeEvent {
  return {
    id: eventId("bte"),
    type,
    label,
    at,
    price,
  };
}

export function openTrade(input: {
  sessionId: string;
  recommendation: BacktestRecommendationSnapshot;
  bar: OhlcvBar;
  shares: number;
  rulesApplied: readonly string[];
}): BacktestTrade {
  const entryPrice = input.recommendation.entry ?? input.bar.close;
  return {
    id: eventId("btt"),
    sessionId: input.sessionId,
    symbol: input.recommendation.symbol,
    company: input.recommendation.company,
    status: "open",
    recommendationId: input.recommendation.recommendationId,
    entryAt: input.bar.timestamp,
    entryPrice,
    shares: input.shares,
    rulesApplied: input.rulesApplied,
    timeline: [
      createTradeEvent(
        "entry",
        "Position opened",
        input.bar.timestamp,
        entryPrice
      ),
    ],
  };
}

export function closeTrade(
  trade: BacktestTrade,
  input: {
    bar: OhlcvBar;
    exitPrice: number;
    exitReason: BacktestExitReason;
    hitTarget?: boolean;
    hitStopLoss?: boolean;
    targetIndex?: number;
    ruleId?: string;
  }
): BacktestTrade {
  const entryPrice = trade.entryPrice ?? input.exitPrice;
  const returnPercent =
    entryPrice > 0 ? ((input.exitPrice - entryPrice) / entryPrice) * 100 : 0;
  const pnl = (input.exitPrice - entryPrice) * trade.shares;
  const holdingMs =
    trade.entryAt != null
      ? new Date(input.bar.timestamp).getTime() -
        new Date(trade.entryAt).getTime()
      : 0;

  const rulesApplied = input.ruleId
    ? [...trade.rulesApplied, input.ruleId]
    : trade.rulesApplied;

  return {
    ...trade,
    status: "closed",
    exitAt: input.bar.timestamp,
    exitPrice: input.exitPrice,
    returnPercent,
    pnl,
    holdingMs,
    exitReason: input.exitReason,
    hitTarget: input.hitTarget,
    hitStopLoss: input.hitStopLoss,
    targetIndex: input.targetIndex,
    rulesApplied,
    timeline: [
      ...trade.timeline,
      createTradeEvent(
        input.exitReason,
        `Position closed (${input.exitReason})`,
        input.bar.timestamp,
        input.exitPrice
      ),
    ],
  };
}

export function mapExitReason(
  result: RuleEvaluationResult
): BacktestExitReason {
  switch (result.kind) {
    case "target":
      return "target";
    case "stop_loss":
      return "stop_loss";
    case "time_exit":
      return "time_exit";
    case "expiry":
      return "expiry";
    case "exit":
      return "rule_exit";
    default:
      return "unknown";
  }
}

export function barsBySymbol(
  bars: readonly OhlcvBar[]
): Map<string, OhlcvBar[]> {
  const map = new Map<string, OhlcvBar[]>();
  for (const bar of bars) {
    const list = map.get(bar.symbol) ?? [];
    list.push(bar);
    map.set(bar.symbol, list);
  }
  for (const [symbol, list] of map) {
    map.set(
      symbol,
      [...list].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    );
  }
  return map;
}
