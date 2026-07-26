/**
 * Sprint 11B.1 — Historical Backtesting Framework
 * Framework / sessions / replay contracts / rules / storage / metrics / providers.
 */

export type {
  BacktestConfiguration,
  BacktestExitReason,
  BacktestRecommendationSnapshot,
  BacktestRule,
  BacktestRuleKind,
  BacktestSession,
  BacktestSessionStatus,
  BacktestSessionSummary,
  BacktestTrade,
  BacktestTradeEvent,
  BacktestTradeStatus,
  BacktestUniverse,
  DatasetQuality,
  DatasetSlice,
  ExecutionResult,
  ReplayConfiguration,
  ReplayFrame,
  SessionComparison,
} from "@/lib/backtesting/types";

export * from "@/lib/backtesting/dataset";
export * from "@/lib/backtesting/rules";
export * from "@/lib/backtesting/session";
export * from "@/lib/backtesting/execution";
export * from "@/lib/backtesting/storage";
export * from "@/lib/backtesting/metrics";
export * from "@/lib/backtesting/replay";
export * from "@/lib/backtesting/validation";
export * from "@/lib/backtesting/reports";
export * from "@/lib/backtesting/tasks";
export {
  BacktestingFramework,
} from "@/lib/backtesting/framework";
export type { BacktestingFrameworkOptions } from "@/lib/backtesting/framework";
