/**
 * Institutional Validation Versioning Engine — public exports (Prompt 9F.24).
 */

export {
  DEFAULT_VERSION_CONFIGURATION,
  resolveVersionConfiguration,
} from "./VersionConfiguration";

export type {
  VersionStrictMode,
  MigrationMode,
  CompatibilityStrictness,
  VersionScoreWeights,
  VersionConfiguration,
  VersionConfigurationInput,
} from "./VersionConfiguration";

export {
  parseSemanticVersion,
  formatSemanticVersion,
  createVersionId,
  registerVersionRecord,
  getVersionRecord,
  listVersionRecords,
  resetVersionRegistry,
} from "./VersionRegistry";

export type {
  VersionKind,
  SemanticVersion,
  VersionRecord,
} from "./VersionRegistry";

export { VersionManager, compareSemver } from "./VersionManager";
export type { RegisterVersionInput } from "./VersionManager";

export { VersionComparator } from "./VersionComparator";
export type {
  VersionComparisonKind,
  VersionComparisonResult,
} from "./VersionComparator";

export { CompatibilityChecker } from "./CompatibilityChecker";
export type {
  CompatibilityIssueCode,
  CompatibilityIssue,
  CompatibilityCheckResult,
} from "./CompatibilityChecker";

export { MigrationPlanner } from "./MigrationPlanner";
export type {
  MigrationStepKind,
  MigrationStep,
  RollbackPlan,
  MigrationPlan,
} from "./MigrationPlanner";

export { MigrationValidator } from "./MigrationValidator";
export type { MigrationValidationResult } from "./MigrationValidator";

export { MigrationExecutor } from "./MigrationExecutor";
export type { MigrationExecutionResult } from "./MigrationExecutor";

export { MigrationEngine } from "./MigrationEngine";
export type {
  VersionHealthScore,
  MigrationEngineResult,
} from "./MigrationEngine";

export { VersionMetricsTracker } from "./VersionMetrics";
export type { VersionOperationalMetrics } from "./VersionMetrics";

export { VersionAuditLogger } from "./VersionAuditLogger";
export type {
  VersionAuditEvent,
  VersionAuditEntry,
} from "./VersionAuditLogger";

export {
  createVersionSnapshotId,
  compareVersionSnapshots,
  buildVersionSnapshotPayload,
  VersionSnapshotStore,
} from "./VersionSnapshot";

export type {
  VersionSnapshotPayload,
  VersionSnapshot,
  VersionSnapshotComparison,
} from "./VersionSnapshot";

export {
  ValidationVersioningEngine,
  registerValidationVersioningEngine,
  getValidationVersioningEngine,
  resetValidationVersioningEngine,
  registerBuiltinVersions,
  buildBuiltinVersions,
  registerVersion,
  planMigration,
  validateMigration,
  checkCompatibility,
  compareVersions,
  createVersionSnapshot,
  getVersionMetrics,
} from "./ValidationVersioningEngine";

export type {
  PlanMigrationOptions,
  VersioningRegistrationResult,
} from "./ValidationVersioningEngine";
