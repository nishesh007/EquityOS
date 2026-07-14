/**
 * Institutional Validation Reliability & Resilience Engine — public exports (Prompt 9F.19).
 */

export {
  DEFAULT_RELIABILITY_CONFIGURATION,
  resolveReliabilityConfiguration,
} from "./ReliabilityConfiguration";

export type {
  ReliabilityStrictMode,
  RetryPolicyKind,
  RecoveryPolicyKind,
  ResilienceScoreWeights,
  ReliabilityConfiguration,
  ReliabilityConfigurationInput,
} from "./ReliabilityConfiguration";

export {
  registerReliabilitySource,
  getRegisteredReliabilitySources,
  collectAllReliabilityProbes,
  resetReliabilitySourceRegistrationState,
} from "./ReliabilityRegistry";

export type {
  ReliabilitySourceId,
  ProbeHealthStatus,
  FailureKind,
  ReliabilityProbe,
  ReliabilityCollector,
  ReliabilitySourceDefinition,
} from "./ReliabilityRegistry";

export { CircuitBreaker } from "./CircuitBreaker";
export type { CircuitState, CircuitBreakerStatus } from "./CircuitBreaker";

export { RetryManager } from "./RetryManager";
export type { RetryAttempt, RetryExecutionResult } from "./RetryManager";

export { TimeoutManager } from "./TimeoutManager";
export type { TimeoutScope, TimeoutCheckResult } from "./TimeoutManager";

export { FailureRecovery } from "./FailureRecovery";
export type {
  RecoveryTargetType,
  FailureRecord,
  RecoveryResult,
} from "./FailureRecovery";

export { GracefulDegradation } from "./GracefulDegradation";
export type {
  DegradationDecision,
  GracefulDegradationResult,
} from "./GracefulDegradation";

export { HealthSupervisor } from "./HealthSupervisor";
export type {
  ModuleHealthRow,
  PlatformHealthReport,
} from "./HealthSupervisor";

export { ReliabilityMonitor } from "./ReliabilityMonitor";
export type {
  ResilienceScoreBreakdown,
  ReliabilityMonitorReport,
} from "./ReliabilityMonitor";

export { ReliabilityMetricsTracker } from "./ReliabilityMetrics";
export type { ReliabilityOperationalMetrics } from "./ReliabilityMetrics";

export { ReliabilityAuditLogger } from "./ReliabilityAuditLogger";
export type {
  ReliabilityAuditEvent,
  ReliabilityAuditEntry,
} from "./ReliabilityAuditLogger";

export {
  createReliabilitySnapshotId,
  compareReliabilitySnapshots,
  ReliabilitySnapshotStore,
} from "./ReliabilitySnapshot";

export type {
  ReliabilitySnapshotPayload,
  ReliabilitySnapshot,
  ReliabilitySnapshotComparison,
} from "./ReliabilitySnapshot";

export {
  ValidationReliabilityEngine,
  registerValidationReliabilityEngine,
  getValidationReliabilityEngine,
  resetValidationReliabilityEngine,
  registerBuiltinReliabilitySources,
  buildBuiltinReliabilitySources,
  checkHealth,
  runRecovery,
  tripCircuit,
  resetCircuit,
  retryExecution,
  getReliabilityMetrics,
  createReliabilitySnapshot,
} from "./ValidationReliabilityEngine";

export type {
  CheckHealthOptions,
  ReliabilityRegistrationResult,
} from "./ValidationReliabilityEngine";
