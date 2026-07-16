/**
 * Watchlist Analytics — presentation models (Sprint 10B.R5).
 * Performance, benchmarking, scorecard & AI review views.
 */

import { safeWatchlistNumber, safeWatchlistText } from "../WatchlistModels";
import { WATCHLIST_SURFACE_ROUTES } from "../WatchlistModels";

export const WATCHLIST_ANALYTICS_EMPTY = {
  noPerformanceData: "No Performance Data",
  noBenchmark: "No Benchmark",
  noReview: "No Review",
  awaitingHistory: "Awaiting History",
} as const;

export type WatchlistAnalyticsEmptyMessage =
  (typeof WATCHLIST_ANALYTICS_EMPTY)[keyof typeof WATCHLIST_ANALYTICS_EMPTY];

export const BENCHMARK_KINDS = [
  "nifty",
  "sensex",
  "sector_index",
  "custom",
] as const;

export type BenchmarkKind = (typeof BENCHMARK_KINDS)[number];

export const SCORECARD_GRADES = ["A", "B", "C", "D", "F"] as const;
export type ScorecardGrade = (typeof SCORECARD_GRADES)[number];

export interface WatchlistAnalyticsContext {
  watchlistId?: string | null;
  symbols?: string[] | null;
  snapshots?: Record<string, import("@/src/core/alerts/intelligence/AlertPresentationModels").WatchlistItemSnapshot> | null;
  priorSnapshots?: Record<string, import("@/src/core/alerts/intelligence/AlertPresentationModels").WatchlistItemSnapshot> | null;
  portfolioSymbols?: string[] | null;
  sectorBySymbol?: Record<string, string> | null;
  marketCapBySymbol?: Record<string, number> | null;
  metricsBySymbol?: Record<string, Record<string, number | string | null | undefined>> | null;
  alertHistory?: Array<{ ticker: string; title: string; at: string }> | null;
  addedAtBySymbol?: Record<string, string> | null;
  benchmarkReturns?: Partial<Record<BenchmarkKind, number>> | null;
  workspaceId?: string | null;
  now?: Date | null;
}

export interface PerformanceSymbolRow {
  ticker: string;
  returnSinceAdded: number;
  relativePerformance: number;
  changePercent: number;
}

export interface WatchlistPerformanceView {
  watchlistId: string;
  aggregateReturn: number;
  relativePerformance: number;
  winRate: number;
  lossRate: number;
  averageGain: number;
  averageLoss: number;
  hitRatio: number;
  symbols: PerformanceSymbolRow[];
  empty: boolean;
  emptyMessage: WatchlistAnalyticsEmptyMessage;
}

export interface AnalyticsHighlight {
  ticker: string;
  label: string;
  value: string;
}

export interface AllocationSlice {
  label: string;
  weight: number;
  count: number;
}

export interface WatchlistAnalyticsView {
  watchlistId: string;
  bestPerformer: AnalyticsHighlight | null;
  worstPerformer: AnalyticsHighlight | null;
  mostImproved: AnalyticsHighlight | null;
  mostDeteriorated: AnalyticsHighlight | null;
  averageConviction: number;
  averageTrust: number;
  averageValidation: number;
  riskDistribution: { low: number; medium: number; high: number };
  sectorAllocation: AllocationSlice[];
  marketCapAllocation: AllocationSlice[];
  empty: boolean;
  emptyMessage: WatchlistAnalyticsEmptyMessage;
}

export interface HistoryEntry {
  ticker: string;
  kind: string;
  summary: string;
  at: string;
}

export interface WatchlistHistoryView {
  watchlistId: string;
  addedTimeline: HistoryEntry[];
  removedTimeline: HistoryEntry[];
  performanceHistory: HistoryEntry[];
  aiRecommendationHistory: HistoryEntry[];
  alertHistory: HistoryEntry[];
  researchHistory: HistoryEntry[];
  empty: boolean;
  emptyMessage: WatchlistAnalyticsEmptyMessage;
}

export interface BenchmarkRow {
  kind: BenchmarkKind;
  label: string;
  returnPercent: number;
  relativeAlpha: number;
  relativeBeta: number;
}

export interface WatchlistBenchmarkView {
  watchlistId: string;
  watchlistReturn: number;
  benchmarks: BenchmarkRow[];
  empty: boolean;
  emptyMessage: WatchlistAnalyticsEmptyMessage;
}

export interface WatchlistAIReviewView {
  watchlistId: string;
  whyWinnersWorked: string[];
  whyLosersFailed: string[];
  commonSuccessFactors: string[];
  commonMistakes: string[];
  suggestedImprovements: string[];
  researchQualityReview: string;
  empty: boolean;
  emptyMessage: WatchlistAnalyticsEmptyMessage;
}

export interface WatchlistScorecardView {
  watchlistId: string;
  overallGrade: ScorecardGrade;
  researchQuality: ScorecardGrade;
  selectionQuality: ScorecardGrade;
  riskQuality: ScorecardGrade;
  diversification: ScorecardGrade;
  consistency: ScorecardGrade;
  scores: Record<string, number>;
  empty: boolean;
  emptyMessage: WatchlistAnalyticsEmptyMessage;
}

export interface WatchlistAnalyticsBundle {
  performance: WatchlistPerformanceView;
  analytics: WatchlistAnalyticsView;
  history: WatchlistHistoryView;
  benchmark: WatchlistBenchmarkView;
  aiReview: WatchlistAIReviewView;
  scorecard: WatchlistScorecardView;
  empty: boolean;
  emptyMessage: WatchlistAnalyticsEmptyMessage;
  surfaceHints: typeof WATCHLIST_SURFACE_ROUTES;
}

export function safeAnalyticsText(
  value: string | null | undefined,
  fallback: string
): string {
  return safeWatchlistText(value, fallback);
}

export function safeAnalyticsNumber(
  value: number | null | undefined,
  fallback = 0
): number {
  return safeWatchlistNumber(value, fallback);
}

function gradeFromScore(score: number): ScorecardGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function scoreToGrade(score: number): ScorecardGrade {
  return gradeFromScore(safeAnalyticsNumber(score, 0));
}

export function emptyPerformanceView(
  message: WatchlistAnalyticsEmptyMessage = WATCHLIST_ANALYTICS_EMPTY.noPerformanceData
): WatchlistPerformanceView {
  return {
    watchlistId: "",
    aggregateReturn: 0,
    relativePerformance: 0,
    winRate: 0,
    lossRate: 0,
    averageGain: 0,
    averageLoss: 0,
    hitRatio: 0,
    symbols: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyAnalyticsView(
  message: WatchlistAnalyticsEmptyMessage = WATCHLIST_ANALYTICS_EMPTY.noPerformanceData
): WatchlistAnalyticsView {
  return {
    watchlistId: "",
    bestPerformer: null,
    worstPerformer: null,
    mostImproved: null,
    mostDeteriorated: null,
    averageConviction: 0,
    averageTrust: 0,
    averageValidation: 0,
    riskDistribution: { low: 0, medium: 0, high: 0 },
    sectorAllocation: [],
    marketCapAllocation: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyHistoryView(
  message: WatchlistAnalyticsEmptyMessage = WATCHLIST_ANALYTICS_EMPTY.awaitingHistory
): WatchlistHistoryView {
  return {
    watchlistId: "",
    addedTimeline: [],
    removedTimeline: [],
    performanceHistory: [],
    aiRecommendationHistory: [],
    alertHistory: [],
    researchHistory: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyBenchmarkView(
  message: WatchlistAnalyticsEmptyMessage = WATCHLIST_ANALYTICS_EMPTY.noBenchmark
): WatchlistBenchmarkView {
  return {
    watchlistId: "",
    watchlistReturn: 0,
    benchmarks: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyAIReviewView(
  message: WatchlistAnalyticsEmptyMessage = WATCHLIST_ANALYTICS_EMPTY.noReview
): WatchlistAIReviewView {
  return {
    watchlistId: "",
    whyWinnersWorked: [],
    whyLosersFailed: [],
    commonSuccessFactors: [],
    commonMistakes: [],
    suggestedImprovements: [],
    researchQualityReview: message,
    empty: true,
    emptyMessage: message,
  };
}

export function emptyScorecardView(
  message: WatchlistAnalyticsEmptyMessage = WATCHLIST_ANALYTICS_EMPTY.noPerformanceData
): WatchlistScorecardView {
  return {
    watchlistId: "",
    overallGrade: "F",
    researchQuality: "F",
    selectionQuality: "F",
    riskQuality: "F",
    diversification: "F",
    consistency: "F",
    scores: {},
    empty: true,
    emptyMessage: message,
  };
}

export function emptyAnalyticsBundle(
  message: WatchlistAnalyticsEmptyMessage = WATCHLIST_ANALYTICS_EMPTY.noPerformanceData
): WatchlistAnalyticsBundle {
  return {
    performance: emptyPerformanceView(message),
    analytics: emptyAnalyticsView(message),
    history: emptyHistoryView(),
    benchmark: emptyBenchmarkView(),
    aiReview: emptyAIReviewView(),
    scorecard: emptyScorecardView(message),
    empty: true,
    emptyMessage: message,
    surfaceHints: { ...WATCHLIST_SURFACE_ROUTES },
  };
}
