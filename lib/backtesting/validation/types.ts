/**
 * Sprint 11B.3 — Strategy validation & institutional comparison types.
 */

import type { TradeStatistics } from "@/lib/analytics/types";
import type { AnalyticsInsight } from "@/lib/analytics/types";

export type MarketCapBucket = "large" | "mid" | "small" | "unknown";

export type FailureCategory =
  | "late_entry"
  | "false_breakout"
  | "weak_trend"
  | "earnings_impact"
  | "macro_event"
  | "low_liquidity"
  | "tight_stop"
  | "aggressive_target"
  | "high_volatility";

export const FAILURE_CATEGORY_LABELS: Record<FailureCategory, string> = {
  late_entry: "Late Entry",
  false_breakout: "False Breakout",
  weak_trend: "Weak Trend",
  earnings_impact: "Earnings Impact",
  macro_event: "Macro Event",
  low_liquidity: "Low Liquidity",
  tight_stop: "Tight Stop",
  aggressive_target: "Aggressive Target",
  high_volatility: "High Volatility",
};

export type BenchmarkId = "nifty_50" | "nifty_100" | "nifty_500";

export const BENCHMARK_LABELS: Record<BenchmarkId, string> = {
  nifty_50: "Nifty 50",
  nifty_100: "Nifty 100",
  nifty_500: "Nifty 500",
};

/** Enriched closed/open trade row for validation (does not alter BacktestTrade). */
export interface ValidationTradeRecord {
  id: string;
  sessionId: string;
  strategyId: string;
  strategyLabel: string;
  symbol: string;
  company?: string;
  sector: string;
  marketCap: MarketCapBucket;
  marketRegime: string;
  universeLabel: string;
  entryAt: string;
  exitAt: string | null;
  returnPercent: number;
  pnl: number;
  holdingMs: number;
  hitTarget: boolean;
  hitStopLoss: boolean;
  targetIndex: number | null;
  conviction: number | null;
  recommendationScore: number | null;
  riskLabel: string | null;
  /** Signed bps: positive = bought above intended entry (late/chase). */
  entryTimingBps: number | null;
  stopDistancePct: number | null;
  plannedRiskReward: number | null;
  realizedRiskReward: number | null;
  failureCategories: readonly FailureCategory[];
  status: "open" | "closed";
}

export interface ValidationFilterState {
  strategies: string[];
  sectors: string[];
  symbols: string[];
  marketRegimes: string[];
  universes: string[];
  marketCaps: MarketCapBucket[];
  dateStart?: string;
  dateEnd?: string;
}

export interface StrategyPerformanceRow {
  key: string;
  label: string;
  dimension: "strategy" | "sector" | "market_cap" | "market_regime" | "universe" | "symbol";
  tradeCount: number;
  statistics: TradeStatistics;
  totalReturn: number;
  cagr: number | null;
  averageHoldingMs: number | null;
  averageRiskReward: number | null;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
}

export interface RecommendationValidationMetrics {
  sampleSize: number;
  entryTimingAccuracy: number | null;
  stopLossAccuracy: number | null;
  targetAccuracy: number | null;
  convictionAccuracy: number | null;
  riskClassificationAccuracy: number | null;
  recommendationConsistency: number | null;
  notes: string[];
}

export interface ConvictionBucketRow {
  id: string;
  label: string;
  minInclusive: number;
  maxExclusive: number;
  tradeCount: number;
  winRate: number;
  averageReturn: number | null;
  profitFactor: number | null;
  calibrationGap: number | null;
  highlight: boolean;
}

export interface FailureDistributionRow {
  category: FailureCategory;
  label: string;
  count: number;
  sharePct: number;
}

export interface FailureAnalysisResult {
  losingTrades: number;
  rows: FailureDistributionRow[];
  summary: string;
}

export interface BenchmarkSeriesPoint {
  at: string;
  value: number;
}

export interface BenchmarkDefinition {
  id: BenchmarkId;
  label: string;
  /** Cumulative return % series over the comparison window. */
  series: readonly BenchmarkSeriesPoint[];
}

export interface BenchmarkComparisonRow {
  benchmarkId: BenchmarkId;
  benchmarkLabel: string;
  benchmarkReturn: number;
  strategyReturn: number;
  excessReturn: number;
  strategyWinRate: number;
  sampleSize: number;
}

export interface StrategyValidationReport {
  generatedAt: string;
  filters: ValidationFilterState;
  trades: readonly ValidationTradeRecord[];
  strategyComparison: readonly StrategyPerformanceRow[];
  sectorComparison: readonly StrategyPerformanceRow[];
  regimeComparison: readonly StrategyPerformanceRow[];
  marketCapComparison: readonly StrategyPerformanceRow[];
  universeComparison: readonly StrategyPerformanceRow[];
  symbolComparison: readonly StrategyPerformanceRow[];
  recommendationValidation: RecommendationValidationMetrics;
  convictionBuckets: readonly ConvictionBucketRow[];
  failureAnalysis: FailureAnalysisResult;
  benchmarkComparison: readonly BenchmarkComparisonRow[];
  insights: readonly AnalyticsInsight[];
}
