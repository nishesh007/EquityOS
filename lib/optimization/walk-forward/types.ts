/**
 * Sprint 11C.3 — Walk-Forward Validation types.
 * No Monte Carlo / stress testing (11C.4).
 */

export type WalkForwardMethod = "rolling" | "anchored" | "expanding";

export type WalkForwardGrade =
  | "Excellent"
  | "Strong"
  | "Moderate"
  | "Weak"
  | "Poor";

export type CycleStatus = "Passed" | "Failed" | "Insufficient Data";

export type WalkForwardSessionStatus =
  | "Idle"
  | "Running"
  | "Completed"
  | "Failed"
  | "Cancelled";

export interface WalkForwardConfig {
  trainingBars: number;
  testingBars: number;
  rollingWindowSize: number;
  stepSize: number;
  validationCycles: number;
  minTrades: number;
  minWinRate: number;
  minProfitFactor: number;
  minSharpe: number;
  maxDrawdown: number;
  method: WalkForwardMethod;
  /** ISO start of historical series (inclusive). */
  historyStart: string;
  /** ISO end of historical series (inclusive). */
  historyEnd: string;
}

export interface DateWindow {
  start: string;
  end: string;
  barCount: number;
}

export interface WalkForwardSplit {
  cycle: number;
  training: DateWindow;
  testing: DateWindow;
}

export interface WalkForwardMetrics {
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
  recoveryFactor: number;
  calmarRatio: number;
  totalReturn: number;
}

export interface PassFailRuleResult {
  id: string;
  label: string;
  passed: boolean;
  actual: number;
  threshold: number;
  comparator: string;
}

export interface WalkForwardCycleResult {
  id: string;
  cycle: number;
  training: DateWindow;
  testing: DateWindow;
  /** Frozen parameters selected on training window only. */
  parameters: Record<string, number | boolean | string>;
  parameterLabels: Record<string, string>;
  metrics: WalkForwardMetrics;
  monthlyReturns: number[];
  equityCurve: number[];
  drawdownCurve: number[];
  status: CycleStatus;
  failedRules: PassFailRuleResult[];
  strengths: string[];
  weaknesses: string[];
  aiCommentary: string;
  suggestions: string[];
}

export interface StabilityAnalysis {
  metricVariance: {
    winRate: number;
    profitFactor: number;
    sharpe: number;
    maxDrawdown: number;
    totalReturn: number;
  };
  parameterStability: number;
  rollingPerformance: number[];
  equityCurveStability: number;
  drawdownStability: number;
  returnConsistency: number;
}

export interface RobustnessScore {
  score: number;
  grade: WalkForwardGrade;
  factors: {
    performanceConsistency: number;
    drawdownStability: number;
    profitStability: number;
    winRateStability: number;
    parameterStability: number;
    outOfSamplePerformance: number;
    riskConsistency: number;
  };
}

export interface WalkForwardDashboard {
  validationCycles: number;
  passedCycles: number;
  failedCycles: number;
  successRate: number;
  averageReturn: number;
  averageDrawdown: number;
  averageSharpe: number;
  averageProfitFactor: number;
  robustness: RobustnessScore;
  overallGrade: WalkForwardGrade;
  insights: string[];
}

export interface WalkForwardSession {
  id: string;
  createdAt: string;
  completedAt: string | null;
  status: WalkForwardSessionStatus;
  strategyId: string;
  strategyName: string;
  optimizationSessionId: string | null;
  config: WalkForwardConfig;
  splits: WalkForwardSplit[];
  cycles: WalkForwardCycleResult[];
  dashboard: WalkForwardDashboard | null;
  stability: StabilityAnalysis | null;
  progressPercent: number;
  message: string | null;
  error: string | null;
}

export interface WalkForwardExportState {
  busy: boolean;
  lastFormat: "csv" | "excel" | "json" | "pdf" | null;
  lastMessage: string | null;
}

export interface WalkForwardFilterState {
  status: "all" | CycleStatus;
  query: string;
}

export const DEFAULT_WALK_FORWARD_CONFIG: WalkForwardConfig = {
  trainingBars: 120,
  testingBars: 40,
  rollingWindowSize: 160,
  stepSize: 40,
  validationCycles: 6,
  minTrades: 30,
  minWinRate: 48,
  minProfitFactor: 1.2,
  minSharpe: 0.6,
  maxDrawdown: 20,
  method: "rolling",
  historyStart: "2023-01-03",
  historyEnd: "2025-12-31",
};

export const DEFAULT_WALK_FORWARD_FILTERS: WalkForwardFilterState = {
  status: "all",
  query: "",
};
