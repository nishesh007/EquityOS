export type {
  BenchmarkComparisonRow,
  BenchmarkDefinition,
  BenchmarkId,
  ConvictionBucketRow,
  FailureAnalysisResult,
  FailureCategory,
  FailureDistributionRow,
  MarketCapBucket,
  RecommendationValidationMetrics,
  StrategyPerformanceRow,
  StrategyValidationReport,
  ValidationFilterState,
  ValidationTradeRecord,
} from "@/lib/backtesting/validation/types";

export {
  BENCHMARK_LABELS,
  FAILURE_CATEGORY_LABELS,
} from "@/lib/backtesting/validation/types";

export {
  createEmptyValidationFilters,
  filterValidationTrades,
  uniqueOptions,
} from "@/lib/backtesting/validation/filters";

export { compareByDimension } from "@/lib/backtesting/validation/strategy-comparison";
export { evaluateRecommendationQuality } from "@/lib/backtesting/validation/recommendation-validation";
export {
  buildConvictionCalibration,
  calibrationSummary,
} from "@/lib/backtesting/validation/confidence-calibration";
export {
  buildFailureAnalysis,
  classifyTradeFailures,
} from "@/lib/backtesting/validation/failure-analysis";
export {
  DEMO_BENCHMARKS,
  compareAgainstBenchmarks,
  listBenchmarkIds,
} from "@/lib/backtesting/validation/benchmark-comparison";
export { generateValidationInsights } from "@/lib/backtesting/validation/insights";
export { buildValidationUniverse } from "@/lib/backtesting/validation/enrichment";
export { buildStrategyValidationReport } from "@/lib/backtesting/validation/build-report";
