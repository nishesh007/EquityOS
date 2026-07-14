/**
 * Institutional Validation Analytics Engine — public exports (Prompt 9F.14).
 */

export {
  DEFAULT_ANALYTICS_CONFIGURATION,
  resolveAnalyticsConfiguration,
} from "./AnalyticsConfiguration";

export type {
  AnalyticsMode,
  AnalyticsTrendWindows,
  AnalyticsHealthWeights,
  AnalyticsConfiguration,
  AnalyticsConfigurationInput,
} from "./AnalyticsConfiguration";

export {
  registerAnalyticsSource,
  getRegisteredAnalyticsSources,
  collectAllObservations,
  resetAnalyticsSourceRegistrationState,
} from "./AnalyticsRegistry";

export type {
  AnalyticsSourceId,
  AnalyticsObservation,
  AnalyticsCollector,
  AnalyticsSourceDefinition,
} from "./AnalyticsRegistry";

export { AnalyticsAggregator } from "./AnalyticsAggregator";
export type { AnalyticsSummary } from "./AnalyticsAggregator";

export {
  clampScore,
  average,
  stdDev,
  zScore,
  rate,
  linearSlope,
  classifyDirection,
} from "./AnalyticsCalculator";

export type { TrendDirection } from "./AnalyticsCalculator";

export { AnalyticsMetricsTracker } from "./AnalyticsMetrics";
export type { AnalyticsOperationalMetrics } from "./AnalyticsMetrics";

export { AnalyticsAuditLogger } from "./AnalyticsAuditLogger";
export type { AnalyticsAuditEntry } from "./AnalyticsAuditLogger";

export { AnalyticsTrendAnalyzer } from "./AnalyticsTrendAnalyzer";
export type {
  TrendWindowResult,
  TrendAnalyticsReport,
} from "./AnalyticsTrendAnalyzer";

export { AnalyticsDistribution } from "./AnalyticsDistribution";
export type {
  ScoreBucket,
  DistributionAnalyticsReport,
} from "./AnalyticsDistribution";

export { AnalyticsRuleEffectiveness } from "./AnalyticsRuleEffectiveness";
export type {
  RuleEffectivenessRow,
  RuleEffectivenessReport,
} from "./AnalyticsRuleEffectiveness";

export { AnalyticsFailurePatterns } from "./AnalyticsFailurePatterns";
export type {
  FailureCluster,
  FailureAnalyticsReport,
} from "./AnalyticsFailurePatterns";

export { AnalyticsPredictionEngine } from "./AnalyticsPredictionEngine";
export type {
  AnalyticsPrediction,
  AnomalyDetectionReport,
  PredictionAnalyticsReport,
} from "./AnalyticsPredictionEngine";

export {
  createAnalyticsSnapshotId,
  compareAnalyticsSnapshots,
  AnalyticsSnapshotStore,
} from "./AnalyticsSnapshot";

export type {
  AnalyticsSnapshot,
  AnalyticsSnapshotComparison,
} from "./AnalyticsSnapshot";

export {
  ValidationAnalyticsEngine,
  registerValidationAnalyticsEngine,
  getValidationAnalyticsEngine,
  resetValidationAnalyticsEngine,
  registerBuiltinAnalyticsSources,
  buildBuiltinAnalyticsSources,
  getAnalyticsSummary,
  getRuleEffectiveness,
  getFailureAnalytics,
  getTrendAnalytics,
  getDistributionAnalytics,
  getPredictionAnalytics,
  createAnalyticsSnapshot,
} from "./ValidationAnalyticsEngine";

export type {
  AnalyticsRunResult,
  AnalyticsHealthBreakdown,
  AnalyticsRegistrationResult,
} from "./ValidationAnalyticsEngine";
