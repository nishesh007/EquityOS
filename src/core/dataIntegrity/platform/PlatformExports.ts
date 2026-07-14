/**
 * Platform exports barrel — re-exports for integration consumers.
 */

export {
  DEFAULT_PLATFORM_CONFIGURATION,
  resolvePlatformConfiguration,
} from "./PlatformConfiguration";

export type {
  PlatformMode,
  PlatformHealthWeights,
  PlatformConfiguration,
  PlatformConfigurationInput,
} from "./PlatformConfiguration";

export {
  REQUIRED_PLATFORM_ENGINES,
  createDefaultEngineRecord,
  upsertPlatformEngine,
  getPlatformEngine,
  listPlatformEngines,
  resetPlatformRegistry,
  markEngineRegistered,
} from "./PlatformRegistry";

export type {
  PlatformEngineId,
  PlatformEngineRecord,
} from "./PlatformRegistry";

export { PlatformBootstrap, resetPlatformBootstrapState } from "./PlatformBootstrap";
export type { PlatformBootstrapResult } from "./PlatformBootstrap";

export { PlatformHealth } from "./PlatformHealth";
export type { PlatformHealthReport } from "./PlatformHealth";

export { createUninitializedStatus } from "./PlatformStatus";
export type { PlatformStatus } from "./PlatformStatus";

export { PlatformMetricsTracker } from "./PlatformMetrics";
export type { PlatformOperationalMetrics } from "./PlatformMetrics";

export { PlatformAuditLogger } from "./PlatformAuditLogger";
export type {
  PlatformAuditEvent,
  PlatformAuditEntry,
} from "./PlatformAuditLogger";

export {
  createPlatformSnapshotId,
  comparePlatformSnapshots,
  buildPlatformSnapshotPayload,
  PlatformSnapshotStore,
} from "./PlatformSnapshot";

export type {
  PlatformSnapshotKind,
  PlatformSnapshotPayload,
  PlatformSnapshot,
  PlatformSnapshotComparison,
} from "./PlatformSnapshot";

export { PlatformCertification } from "./PlatformCertification";
export type {
  PlatformCertificationStatus,
  PlatformCertificationCheck,
  PlatformCertificationResult,
} from "./PlatformCertification";

export { PlatformSummaryBuilder } from "./PlatformSummary";
export type { PlatformSummary } from "./PlatformSummary";

export { PlatformEngine } from "./PlatformEngine";
export type { PlatformIntegrityResult } from "./PlatformEngine";

export {
  registerValidationPlatform,
  resetValidationPlatform,
  getValidationPlatform,
  initializePlatform,
  getPlatformStatus,
  getPlatformHealth,
  getPlatformMetrics,
  createPlatformSnapshot,
  runPlatformCertification,
  verifyPlatformIntegrity,
  getPlatformSummary,
} from "./PlatformFacade";

export type { PlatformRegistrationResult } from "./PlatformFacade";
