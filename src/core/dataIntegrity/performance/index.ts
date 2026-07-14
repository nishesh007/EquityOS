/**
 * Institutional Validation Performance Benchmark & Capacity Planning Engine — public exports (Prompt 9F.26).
 */

export {
  DEFAULT_PERFORMANCE_CONFIGURATION,
  resolvePerformanceConfiguration,
} from "./PerformanceConfiguration";

export type {
  BenchmarkMode,
  PerformanceStrictMode,
  PerformanceScoreWeights,
  PerformanceConfiguration,
  PerformanceConfigurationInput,
} from "./PerformanceConfiguration";

export {
  createPerformanceSourceId,
  registerPerformanceSource,
  getPerformanceSource,
  listPerformanceSources,
  resetPerformanceRegistry,
} from "./PerformanceRegistry";

export type {
  PerformanceSourceKind,
  PerformanceSourceDefinition,
} from "./PerformanceRegistry";

export { LatencyProfiler } from "./LatencyProfiler";
export type { LatencyProfile } from "./LatencyProfiler";

export { ThroughputAnalyzer } from "./ThroughputAnalyzer";
export type { ThroughputAnalysis } from "./ThroughputAnalyzer";

export { ResourceAnalyzer } from "./ResourceAnalyzer";
export type { ResourceAnalysis } from "./ResourceAnalyzer";

export { ScalabilityAnalyzer } from "./ScalabilityAnalyzer";
export type { ScalabilityAnalysis } from "./ScalabilityAnalyzer";

export { CapacityPlanner } from "./CapacityPlanner";
export type { CapacityPlan } from "./CapacityPlanner";

export { BenchmarkEngine } from "./BenchmarkEngine";
export type {
  BenchmarkRunOptions,
  BenchmarkRunResult,
} from "./BenchmarkEngine";

export { PerformanceMetricsTracker } from "./PerformanceMetrics";
export type {
  PerformanceHealthScore,
  PerformanceOperationalMetrics,
} from "./PerformanceMetrics";

export { PerformanceAuditLogger } from "./PerformanceAuditLogger";
export type {
  PerformanceAuditEvent,
  PerformanceAuditEntry,
} from "./PerformanceAuditLogger";

export {
  createPerformanceSnapshotId,
  comparePerformanceSnapshots,
  buildPerformanceSnapshotPayload,
  PerformanceSnapshotStore,
} from "./PerformanceSnapshot";

export type {
  PerformanceSnapshotKind,
  PerformanceSnapshotPayload,
  PerformanceSnapshot,
  PerformanceSnapshotComparison,
} from "./PerformanceSnapshot";

export {
  ValidationPerformanceEngine,
  registerPerformance,
  registerValidationPerformanceEngine,
  getValidationPerformanceEngine,
  resetValidationPerformanceEngine,
  registerBuiltinPerformanceSources,
  runBenchmark,
  analyzeLatency,
  analyzeCapacity,
  createPerformanceSnapshot,
  getPerformanceMetrics,
} from "./ValidationPerformanceEngine";

export type {
  AnalyzeLatencyOptions,
  AnalyzeCapacityOptions,
  PerformanceRegistrationResult,
} from "./ValidationPerformanceEngine";
