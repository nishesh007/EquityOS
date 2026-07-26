/**
 * Sprint 11C.2 — Strategy Optimization Engine types.
 * Offline research only — no live/paper trading.
 */

import type {
  ConstraintDefinition,
  ParameterState,
} from "@/lib/optimization/types";

export type RunnerControl = "running" | "paused" | "cancelled";

export type SearchMode =
  | "grid"
  | "smart"
  | "quick"
  | "deep";

export type SmartSearchIntensity = "fast" | "balanced" | "deep";

export type SessionStatus =
  | "Pending"
  | "Running"
  | "Paused"
  | "Completed"
  | "Cancelled"
  | "Failed";

export type RankingMode =
  | "single"
  | "weighted"
  | "balanced"
  | "risk_adjusted";

export type RankingMetric =
  | "profitFactor"
  | "winRate"
  | "riskReward"
  | "sharpe"
  | "sortino"
  | "maxDrawdown"
  | "expectancy"
  | "cagr"
  | "avgReturn"
  | "score";

export interface ParameterCombination {
  id: string;
  values: Record<string, number | boolean | string>;
  labels: Record<string, string>;
}

export interface OptimizationMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  avgReturn: number;
  cagr: number;
  expectancy: number;
  riskReward: number;
  totalReturn: number;
}

export interface OptimizationResult {
  id: string;
  rank: number;
  strategyId: string;
  strategyName: string;
  combination: ParameterCombination;
  metrics: OptimizationMetrics;
  score: number;
  monthlyReturns: number[];
  tradeDistribution: { wins: number; losses: number; breakeven: number };
  drawdownSummary: {
    maxDrawdown: number;
    avgDrawdown: number;
    recoveryBars: number;
  };
  strengths: string[];
  weaknesses: string[];
  aiSummary: string;
  suggestions: string[];
}

export interface OptimizationProgress {
  status: SessionStatus;
  currentIndex: number;
  totalCombinations: number;
  remaining: number;
  percent: number;
  evaluationsPerSecond: number;
  estimatedSecondsRemaining: number;
  currentCombinationLabel: string;
  memoryEstimateMb: number;
  cpuEstimate: string;
  message?: string;
}

export interface OptimizationSession {
  id: string;
  createdAt: string;
  completedAt: string | null;
  strategyId: string;
  strategyName: string;
  parameterCount: number;
  combinationCount: number;
  evaluatedCount: number;
  searchMode: SearchMode;
  smartIntensity: SmartSearchIntensity;
  rankingMode: RankingMode;
  primaryMetric: RankingMetric;
  status: SessionStatus;
  progress: OptimizationProgress;
  topScore: number | null;
  error?: string;
  /** Snapshot of config used for this run. */
  parameters: ParameterState[];
  constraints: ConstraintDefinition[];
  results: OptimizationResult[];
}

export interface OptimizationEngineSettings {
  searchMode: SearchMode;
  smartIntensity: SmartSearchIntensity;
  rankingMode: RankingMode;
  primaryMetric: RankingMetric;
  leaderboardLimit: 10 | 25 | 50 | 100;
  maxCombinations: number;
}

export interface ComparisonState {
  selectedIds: string[];
}

export interface ExportState {
  lastFormat: "csv" | "excel" | "json" | "pdf" | null;
  lastMessage: string | null;
  busy: boolean;
}

export const DEFAULT_ENGINE_SETTINGS: OptimizationEngineSettings = {
  searchMode: "smart",
  smartIntensity: "balanced",
  rankingMode: "balanced",
  primaryMetric: "profitFactor",
  leaderboardLimit: 25,
  maxCombinations: 2500,
};

export const MEMORY_SOFT_LIMIT_COMBINATIONS = 10_000;
