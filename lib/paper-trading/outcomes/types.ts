/**
 * Trade Outcome Engine v1 — types.
 * Complete lifecycle + excursion analytics for paper trades.
 */

import type { PaperStrategy } from "@/lib/paper-trading/types";

/** Canonical exit reason taxonomy for outcome reporting. */
export type TradeOutcomeExitReason =
  | "TARGET_1"
  | "TARGET_2"
  | "TARGET_3"
  | "STOP_LOSS"
  | "MANUAL_EXIT"
  | "TIME_EXIT"
  | "INVALIDATED";

export interface TradeOutcomeRecord {
  tradeId: string;
  recommendationId: string;
  sessionId: string | null;
  scanId: string | null;
  strategy: PaperStrategy;
  horizon: string;
  symbol: string;
  company: string;
  entryPrice: number;
  entryTime: string;
  stopLoss: number;
  targets: number[];
  exitPrice: number | null;
  exitTime: string | null;
  exitReason: TradeOutcomeExitReason | null;
  holdingDays: number;
  holdingMs: number;
  pnl: number;
  returnPercent: number;
  mfe: number;
  mae: number;
  maxDrawdown: number;
  timeToFirstTargetMs: number | null;
  timeToStopLossMs: number | null;
  isWin: boolean;
  isClosed: boolean;
}

export interface StrategyOutcomeSummary {
  strategy: PaperStrategy;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  averageMfe: number;
  averageMae: number;
  averageDrawdown: number;
  targetHitPercent: number;
  stopLossHitPercent: number;
  averageHoldingPeriodMs: number;
  averageHoldingDays: number;
  expectancy: number;
  profitFactor: number;
  averageReturn: number;
  exitReasonDistribution: Record<TradeOutcomeExitReason, number>;
}

export interface ExcursionStatistics {
  averageMfe: number;
  averageMae: number;
  averageDrawdown: number;
  medianMfe: number;
  medianMae: number;
  maxMfe: number;
  minMae: number;
}

export interface TradeOutcomeReport {
  generatedAt: string;
  tradesAnalyzed: number;
  closedTrades: number;
  openTrades: number;
  outcomes: TradeOutcomeRecord[];
  strategySummaries: StrategyOutcomeSummary[];
  topWinners: TradeOutcomeRecord[];
  worstPerformers: TradeOutcomeRecord[];
  exitReasonDistribution: Record<TradeOutcomeExitReason, number>;
  mfeMaeStatistics: ExcursionStatistics;
  bestStrategy: StrategyOutcomeSummary | null;
  worstStrategy: StrategyOutcomeSummary | null;
  mostCommonExitReason: TradeOutcomeExitReason | null;
  notes: string[];
}
