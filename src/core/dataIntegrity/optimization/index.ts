/**
 * Institutional Validation Automation & Optimization Engine — public exports (Prompt 9F.18).
 */

export {
  DEFAULT_OPTIMIZATION_CONFIGURATION,
  resolveOptimizationConfiguration,
} from "./OptimizationConfiguration";

export type {
  OptimizationStrictMode,
  OptimizationMode,
  RecommendationMode,
  OptimizationScoreWeights,
  OptimizationConfiguration,
  OptimizationConfigurationInput,
} from "./OptimizationConfiguration";

export {
  registerOptimizationSource,
  getRegisteredOptimizationSources,
  collectAllOptimizationProbes,
  resetOptimizationSourceRegistrationState,
} from "./OptimizationRegistry";

export type {
  OptimizationSourceId,
  OptimizationProbe,
  OptimizationCollector,
  OptimizationSourceDefinition,
} from "./OptimizationRegistry";

export {
  OptimizationStrategies,
  createRecommendation,
} from "./OptimizationStrategies";

export type {
  OptimizationStrategyId,
  RecommendationPriority,
  OptimizationRecommendation,
} from "./OptimizationStrategies";

export { OptimizationPlanner } from "./OptimizationPlanner";
export type {
  OptimizationScoreBreakdown,
  OptimizationPlan,
} from "./OptimizationPlanner";

export { PipelineOptimizer } from "./PipelineOptimizer";
export type { PipelineOptimizationResult } from "./PipelineOptimizer";

export { ExecutionOptimizer } from "./ExecutionOptimizer";
export type { ExecutionOptimizationResult } from "./ExecutionOptimizer";

export { CacheOptimizer } from "./CacheOptimizer";
export type { CacheOptimizationResult } from "./CacheOptimizer";

export { DependencyOptimizer } from "./DependencyOptimizer";
export type { DependencyOptimizationResult } from "./DependencyOptimizer";

export { PerformanceOptimizer } from "./PerformanceOptimizer";
export type { PerformanceAnalysisResult } from "./PerformanceOptimizer";

export { OptimizationMetricsTracker } from "./OptimizationMetrics";
export type { OptimizationOperationalMetrics } from "./OptimizationMetrics";

export { OptimizationAuditLogger } from "./OptimizationAuditLogger";
export type { OptimizationAuditEntry } from "./OptimizationAuditLogger";

export {
  createOptimizationSnapshotId,
  compareOptimizationSnapshots,
  OptimizationSnapshotStore,
} from "./OptimizationSnapshot";

export type {
  OptimizationSnapshotPayload,
  OptimizationSnapshot,
  OptimizationSnapshotComparison,
} from "./OptimizationSnapshot";

export {
  ValidationOptimizationEngine,
  registerValidationOptimizationEngine,
  getValidationOptimizationEngine,
  resetValidationOptimizationEngine,
  registerBuiltinOptimizationSources,
  buildBuiltinOptimizationSources,
  runOptimization,
  analyzePerformance,
  optimizePipeline,
  optimizeCache,
  analyzeDependencies,
  getOptimizationMetrics,
  createOptimizationSnapshot,
} from "./ValidationOptimizationEngine";

export type {
  RunOptimizationOptions,
  OptimizationRunResult,
  OptimizationRegistrationResult,
} from "./ValidationOptimizationEngine";
