/**
 * Paper Trading Lab — Performance Analytics types (Sprint 11E.2 institutional).
 * Read-only views over trade history. Never mutates trades.
 */

import type { PaperStrategy, PaperTrade } from "@/lib/paper-trading/types";

export type PaperAnalyticsTab = "overview" | PaperStrategy;

export type EquityCurveRange = "daily" | "weekly" | "monthly" | "all";

export type PaperAnalyticsOutcome =
  | "all"
  | "winning"
  | "losing"
  | "target_hit"
  | "stop_loss";

export type PaperAnalyticsStatus = "all" | "open" | "closed";

export interface PaperAnalyticsFilters {
  strategy: PaperStrategy | "all";
  outcome: PaperAnalyticsOutcome;
  status: PaperAnalyticsStatus;
  dateFrom: string | null;
  dateTo: string | null;
  search: string;
  company: string;
}

export interface PaperExecutiveKpis {
  totalTrades: number;
  openPositions: number;
  closedPositions: number;
  winningTrades: number;
  losingTrades: number;
  overallWinRate: number;
  netVirtualPnl: number;
  averageReturn: number;
  averageHoldingMs: number;
  profitFactor: number;
  maximumDrawdown: number;
  bestStrategy: PaperStrategy | null;
  worstStrategy: PaperStrategy | null;
  lastUpdated: string | null;
}

export interface PaperStrategyComparisonRow {
  strategy: PaperStrategy;
  totalTrades: number;
  winRate: number;
  averageReturn: number;
  averageGain: number;
  averageLoss: number;
  profitFactor: number;
  maximumDrawdown: number;
  averageHoldingMs: number;
  target1HitPercent: number;
  target2HitPercent: number;
  target3HitPercent: number;
  stopLossPercent: number;
  openTrades: number;
  closedTrades: number;
}

export interface PaperTabPerformanceMetrics {
  strategy: PaperAnalyticsTab;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winPercent: number;
  averageGain: number;
  averageLoss: number;
  largestWinner: number;
  largestLoser: number;
  averageHoldingMs: number;
  averageRiskReward: number;
  averageConviction: number;
}

export interface EquityCurvePoint {
  timestamp: string;
  label: string;
  equity: number;
  periodPnl: number;
  tradeId?: string;
}

export interface MonthlyPerformanceRow {
  monthKey: string;
  monthLabel: string;
  trades: number;
  winRate: number;
  netReturn: number;
  averageReturn: number;
  bestTrade: number;
  worstTrade: number;
}

export type ConvictionBandId =
  | "70-80"
  | "80-85"
  | "85-90"
  | "90-95"
  | "95+";

export interface ConvictionBandStats {
  band: ConvictionBandId;
  label: string;
  trades: number;
  winRate: number;
  averageReturn: number;
}

export interface RecommendationValidationStats {
  recommendationsGenerated: number;
  recommendationsExecuted: number;
  recommendationsExpired: number;
  recommendationsCancelled: number;
  executionSuccessPercent: number;
  averageConviction: number;
  averageReturnByConviction: number;
  convictionBands: ConvictionBandStats[];
}

export interface PaperAnalyticsDashboardModel {
  executive: PaperExecutiveKpis;
  comparison: PaperStrategyComparisonRow[];
  tabMetrics: PaperTabPerformanceMetrics;
  equityCurve: EquityCurvePoint[];
  monthly: MonthlyPerformanceRow[];
  explorerTrades: PaperTrade[];
  validation: RecommendationValidationStats;
  bestTrades: PaperTrade[];
  worstTrades: PaperTrade[];
}
