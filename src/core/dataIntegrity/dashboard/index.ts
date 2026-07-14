/**
 * Institutional Validation Dashboard — public exports (Prompt 9F.11).
 */

export {
  DEFAULT_DASHBOARD_CONFIGURATION,
  resolveDashboardConfiguration,
} from "./DashboardConfiguration";

export type {
  DashboardMode,
  DashboardHealthThresholds,
  DashboardTrendWindows,
  DashboardConfiguration,
  DashboardConfigurationInput,
} from "./DashboardConfiguration";

export {
  registerDashboardModule,
  getRegisteredDashboardModules,
  getDashboardModule,
  collectAllModuleMetrics,
  resetDashboardModuleRegistrationState,
} from "./DashboardRegistry";

export type {
  DashboardModuleId,
  DashboardModuleHealthStatus,
  DashboardModuleStatus,
  DashboardModuleRawMetrics,
  DashboardModuleCollector,
  DashboardModuleDefinition,
} from "./DashboardRegistry";

export { DashboardEvents } from "./DashboardEvents";
export type {
  DashboardEventType,
  DashboardEvent,
  DashboardEventListener,
} from "./DashboardEvents";

export { DashboardCache } from "./DashboardCache";
export type { CacheEntry, DashboardCacheStats } from "./DashboardCache";

export { DashboardAuditLogger } from "./DashboardAuditLogger";
export type { DashboardAuditEntry } from "./DashboardAuditLogger";

export {
  normalizeFilters,
  filterMatchesModules,
  filterMatchesTrustClassification,
  filterMatchesRecommendation,
  isTimestampInRange,
  matchesMetaFilters,
} from "./DashboardFilters";

export type {
  DashboardFilters,
  DashboardSeverityFilter,
} from "./DashboardFilters";

export {
  classifyHealth,
  toModuleHealthStatus,
  clampScore,
} from "./DashboardSummary";

export type {
  DashboardHealthClassification,
  DashboardSummaryMetrics,
  DashboardSystemHealth,
  DashboardSummary,
} from "./DashboardSummary";

export { DashboardMetricsTracker } from "./DashboardMetrics";
export type { DashboardOperationalMetrics } from "./DashboardMetrics";

export { DashboardTrendAnalyzer } from "./DashboardTrendAnalyzer";
export type {
  DashboardTrendPoint,
  TrendDirection,
  DashboardTrendAnalysis,
} from "./DashboardTrendAnalyzer";

export {
  createDashboardSnapshotId,
  compareDashboardSnapshots,
  DashboardSnapshotStore,
} from "./DashboardSnapshot";

export type {
  DashboardSnapshot,
  DashboardSnapshotComparison,
} from "./DashboardSnapshot";

export {
  DashboardAggregator,
  safeNumber,
  safeCollect,
} from "./DashboardAggregator";

export type {
  ValidationDistribution,
  TopFailuresReport,
  AggregationExtras,
  AggregationInput,
  AggregationResult,
} from "./DashboardAggregator";

export {
  ValidationDashboardService,
  registerDashboardService,
  getValidationDashboardService,
  resetValidationDashboardService,
  registerBuiltinDashboardModules,
  buildBuiltinDashboardModules,
  getDashboardSummary,
  getDashboardMetrics,
  getDashboardHealth,
  getValidationDistribution,
  getTopFailures,
  createSnapshot,
  loadSnapshot,
} from "./ValidationDashboardService";

export type {
  DashboardQueryOptions,
  DashboardRegistrationResult,
} from "./ValidationDashboardService";
