/**
 * Institutional Earnings Quality Engine — public exports (Sprint 9B.3).
 * Advisory-only accounting / earnings quality evaluation.
 */

export {
  DEFAULT_QUALITY_CONFIGURATION,
  DEFAULT_QUALITY_WEIGHTS,
  DEFAULT_QUALITY_THRESHOLDS,
  resolveQualityConfiguration,
} from "./QualityConfiguration";

export type {
  QualityStrictMode,
  QualityDimension,
  QualityWeightMap,
  QualityThresholds,
  QualityConfiguration,
  QualityConfigurationInput,
} from "./QualityConfiguration";

export {
  registerQualityCheck,
  registerBuiltinQualityChecks,
  getQualityCheck,
  listQualityChecks,
  resetQualityRegistry,
} from "./QualityRegistry";

export type {
  QualitySignalSeverity,
  QualityCheckDefinition,
} from "./QualityRegistry";

export { QualityMetricsTracker } from "./QualityMetrics";
export type { QualityOperationalMetrics } from "./QualityMetrics";

export { QualityAuditLogger } from "./QualityAuditLogger";
export type {
  QualityAuditEvent,
  QualityAuditEntry,
} from "./QualityAuditLogger";

export type {
  QualityPeriodMetrics,
  EarningsQualityInput,
  QualitySignal,
  DimensionAnalysisResult,
} from "./qualityTypes";

export { AccrualAnalyzer } from "./AccrualAnalyzer";
export { CashFlowQualityAnalyzer } from "./CashFlowQualityAnalyzer";
export { WorkingCapitalAnalyzer } from "./WorkingCapitalAnalyzer";
export { MarginQualityAnalyzer } from "./MarginQualityAnalyzer";
export { CapitalAllocationAnalyzer } from "./CapitalAllocationAnalyzer";
export { AccountingRedFlagDetector } from "./AccountingRedFlagDetector";

export { QualityScoreEngine } from "./QualityScoreEngine";
export type {
  QualityScoreBreakdown,
  QualityScoreResult,
} from "./QualityScoreEngine";

export {
  createQualitySnapshotId,
  compareQualitySnapshots,
  QualitySnapshotStore,
} from "./QualitySnapshot";

export type {
  QualitySnapshotKind,
  QualitySnapshotPayload,
  QualitySnapshot,
  QualitySnapshotComparison,
} from "./QualitySnapshot";

export {
  EarningsQualityEngine,
} from "./EarningsQualityEngine";

export type { EarningsQualityAnalysis } from "./EarningsQualityEngine";

export {
  registerQualityEngine,
  getEarningsQualityEngine,
  resetQualityEngine,
  analyzeEarningsQuality,
  detectAccountingIssues,
  evaluateCashFlowQuality,
  evaluateWorkingCapital,
  evaluateCapitalAllocation,
  createQualitySnapshot,
  getQualityMetrics,
} from "./QualityFacade";

export type { QualityRegistrationResult } from "./QualityFacade";
