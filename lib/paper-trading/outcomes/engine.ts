/**
 * Trade Outcome Engine v1.
 * Builds complete lifecycle / excursion reports from paper trades.
 * Does not mutate Quality Gate, Published SSOT, or recommendation generation.
 */

import "server-only";

import { isTradeClosed } from "@/lib/paper-trading/kpis";
import { loadPaperTradingState } from "@/lib/paper-trading/persistence";
import type { PaperStrategy, PaperTrade } from "@/lib/paper-trading/types";
import {
  computeTradeExcursions,
  emptyExitReasonDistribution,
  holdingDaysFromMs,
  isStopLossExit,
  isTargetExit,
  mapPaperExitReason,
  resolveHorizon,
  resolveScanId,
  resolveSessionId,
  resolveTimeToFirstTargetMs,
  resolveTimeToStopLossMs,
  TRADE_OUTCOME_EXIT_REASONS,
} from "@/lib/paper-trading/outcomes/lifecycle";
import type {
  ExcursionStatistics,
  StrategyOutcomeSummary,
  TradeOutcomeExitReason,
  TradeOutcomeRecord,
  TradeOutcomeReport,
} from "@/lib/paper-trading/outcomes/types";

const STRATEGIES: PaperStrategy[] = ["intraday", "scalping", "swing"];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function toTradeOutcomeRecord(trade: PaperTrade): TradeOutcomeRecord {
  const excursions = computeTradeExcursions(trade);
  const exitReason = mapPaperExitReason(trade.exitReason);
  const holdingMs = trade.holdingMs;
  return {
    tradeId: trade.id,
    recommendationId: trade.recommendation.recommendationId,
    sessionId: resolveSessionId(trade),
    scanId: resolveScanId(trade),
    strategy: trade.strategy,
    horizon: resolveHorizon(trade),
    symbol: trade.symbol,
    company: trade.company,
    entryPrice: trade.entryPrice,
    entryTime: trade.entryAt,
    stopLoss: trade.stopLoss,
    targets: [...trade.targets],
    exitPrice: trade.exitPrice ?? null,
    exitTime: trade.exitAt ?? null,
    exitReason,
    holdingDays: holdingDaysFromMs(holdingMs),
    holdingMs,
    pnl: trade.pnl,
    returnPercent: trade.returnPercent,
    mfe: excursions.mfe,
    mae: excursions.mae,
    maxDrawdown: excursions.maxDrawdown,
    timeToFirstTargetMs: resolveTimeToFirstTargetMs(trade),
    timeToStopLossMs: resolveTimeToStopLossMs(trade),
    isWin: trade.pnl > 0,
    isClosed: isTradeClosed(trade),
  };
}

function summarizeStrategy(
  strategy: PaperStrategy,
  outcomes: TradeOutcomeRecord[]
): StrategyOutcomeSummary {
  const closed = outcomes.filter((o) => o.isClosed);
  const wins = closed.filter((o) => o.isWin);
  const losses = closed.filter((o) => !o.isWin);
  const distribution = emptyExitReasonDistribution();
  for (const outcome of closed) {
    if (outcome.exitReason) {
      distribution[outcome.exitReason] += 1;
    }
  }

  const targetHits = closed.filter((o) => isTargetExit(o.exitReason)).length;
  const stopHits = closed.filter((o) => isStopLossExit(o.exitReason)).length;
  const winRate = closed.length === 0 ? 0 : wins.length / closed.length;
  const avgWin = average(wins.map((o) => o.returnPercent));
  const avgLossAbs = Math.abs(average(losses.map((o) => o.returnPercent)));
  const expectancy = round2(
    winRate * avgWin - (1 - winRate) * avgLossAbs
  );
  const grossProfit = wins.reduce((s, o) => s + Math.max(0, o.pnl), 0);
  const grossLoss = Math.abs(
    losses.reduce((s, o) => s + Math.min(0, o.pnl), 0)
  );
  const holdingMs = average(closed.map((o) => o.holdingMs));

  return {
    strategy,
    trades: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: round2(winRate * 100),
    averageMfe: round2(average(closed.map((o) => o.mfe))),
    averageMae: round2(average(closed.map((o) => o.mae))),
    averageDrawdown: round2(average(closed.map((o) => o.maxDrawdown))),
    targetHitPercent: round2(
      closed.length === 0 ? 0 : (targetHits / closed.length) * 100
    ),
    stopLossHitPercent: round2(
      closed.length === 0 ? 0 : (stopHits / closed.length) * 100
    ),
    averageHoldingPeriodMs: Math.round(holdingMs),
    averageHoldingDays: holdingDaysFromMs(holdingMs),
    expectancy,
    profitFactor:
      grossLoss > 0
        ? round2(grossProfit / grossLoss)
        : grossProfit > 0
          ? 99
          : 0,
    averageReturn: round2(average(closed.map((o) => o.returnPercent))),
    exitReasonDistribution: distribution,
  };
}

function scoreStrategy(summary: StrategyOutcomeSummary): number {
  return summary.expectancy * 2 + summary.winRate * 0.1 + summary.profitFactor;
}

function buildExcursionStatistics(
  closed: TradeOutcomeRecord[]
): ExcursionStatistics {
  const mfes = closed.map((o) => o.mfe);
  const maes = closed.map((o) => o.mae);
  const dds = closed.map((o) => o.maxDrawdown);
  return {
    averageMfe: round2(average(mfes)),
    averageMae: round2(average(maes)),
    averageDrawdown: round2(average(dds)),
    medianMfe: round2(median(mfes)),
    medianMae: round2(median(maes)),
    maxMfe: round2(mfes.length ? Math.max(...mfes) : 0),
    minMae: round2(maes.length ? Math.min(...maes) : 0),
  };
}

export function buildTradeOutcomeReport(
  trades: readonly PaperTrade[] = loadPaperTradingState().trades
): TradeOutcomeReport {
  const outcomes = trades.map(toTradeOutcomeRecord);
  const closed = outcomes.filter((o) => o.isClosed);
  const open = outcomes.filter((o) => !o.isClosed);

  const strategySummaries = STRATEGIES.map((strategy) =>
    summarizeStrategy(
      strategy,
      outcomes.filter((o) => o.strategy === strategy)
    )
  );

  const ranked = strategySummaries
    .filter((s) => s.trades > 0)
    .sort((a, b) => scoreStrategy(b) - scoreStrategy(a));

  const exitReasonDistribution = emptyExitReasonDistribution();
  for (const outcome of closed) {
    if (outcome.exitReason) {
      exitReasonDistribution[outcome.exitReason] += 1;
    }
  }

  let mostCommonExitReason: TradeOutcomeExitReason | null = null;
  let mostCommonCount = 0;
  for (const reason of TRADE_OUTCOME_EXIT_REASONS) {
    const count = exitReasonDistribution[reason];
    if (count > mostCommonCount) {
      mostCommonCount = count;
      mostCommonExitReason = reason;
    }
  }

  const topWinners = [...closed]
    .sort((a, b) => b.returnPercent - a.returnPercent)
    .slice(0, 5);
  const worstPerformers = [...closed]
    .sort((a, b) => a.returnPercent - b.returnPercent)
    .slice(0, 5);

  const notes: string[] = [
    "Outcome taxonomy maps paper exits: targets→TARGET_*, stop→STOP_LOSS, session/market close→TIME_EXIT, expired→INVALIDATED.",
    "MFE/MAE/drawdown prefer persisted trade fields; otherwise reconstructed from timeline prices.",
  ];
  if (closed.some((o) => !o.sessionId || !o.scanId)) {
    notes.push(
      "Some trades lack sessionId/scanId — newer entries stamp provenance from published recommendations."
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    tradesAnalyzed: outcomes.length,
    closedTrades: closed.length,
    openTrades: open.length,
    outcomes,
    strategySummaries,
    topWinners,
    worstPerformers,
    exitReasonDistribution,
    mfeMaeStatistics: buildExcursionStatistics(closed),
    bestStrategy: ranked[0] ?? null,
    worstStrategy: ranked.length > 0 ? ranked[ranked.length - 1] : null,
    mostCommonExitReason,
    notes,
  };
}

export function runTradeOutcomeEngine(): TradeOutcomeReport {
  return buildTradeOutcomeReport(loadPaperTradingState().trades);
}
