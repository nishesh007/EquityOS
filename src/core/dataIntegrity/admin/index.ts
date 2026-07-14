/**
 * Institutional Validation Administration & Policy Engine — public exports (Prompt 9F.17).
 */

export {
  DEFAULT_ADMINISTRATION_CONFIGURATION,
  resolveAdministrationConfiguration,
} from "./AdministrationConfiguration";

export type {
  AdministrationStrictMode,
  GovernanceProfileId,
  ApprovalStatus,
  AdministrationConfiguration,
  AdministrationConfigurationInput,
} from "./AdministrationConfiguration";

export {
  createPolicyId,
  registerPolicy,
  getPolicy,
  listPolicies,
  resetPolicyRegistry,
} from "./PolicyRegistry";

export type {
  PolicyStatus,
  PolicyScope,
  PolicyDefinition,
  PolicyVersionRecord,
} from "./PolicyRegistry";

export { PolicyManager } from "./PolicyManager";
export type {
  CreatePolicyInput,
  UpdatePolicyInput,
  PolicyOperationResult,
} from "./PolicyManager";

export { PolicyEvaluator } from "./PolicyEvaluator";
export type {
  PolicyEvaluationContext,
  PolicyConflict,
  PolicyEvaluationResult,
} from "./PolicyEvaluator";

export { PolicyProfiles, BUILTIN_PROFILES } from "./PolicyProfiles";
export type {
  ProfileEnvironment,
  GovernanceProfile,
} from "./PolicyProfiles";

export { PolicyOverrides } from "./PolicyOverrides";
export type {
  OverrideTargetType,
  OverrideExecutionMode,
  ActiveOverride,
  ApplyOverrideInput,
} from "./PolicyOverrides";

export { RuleGovernance } from "./RuleGovernance";
export type {
  RuleRegistrationStatus,
  RuleGovernanceState,
} from "./RuleGovernance";

export { ModuleGovernance } from "./ModuleGovernance";
export type {
  ModuleOperationalMode,
  ModuleGovernanceState,
} from "./ModuleGovernance";

export { ConfigurationProfiles } from "./ConfigurationProfiles";
export type { ConfigurationProfile } from "./ConfigurationProfiles";

export { AdministrationMetricsTracker } from "./AdministrationMetrics";
export type { AdministrationOperationalMetrics } from "./AdministrationMetrics";

export { AdministrationAuditLogger } from "./AdministrationAuditLogger";
export type {
  AdministrationAuditEvent,
  AdministrationAuditEntry,
} from "./AdministrationAuditLogger";

export {
  createGovernanceSnapshotId,
  compareGovernanceSnapshots,
  AdministrationSnapshotStore,
  hashPolicyVersions,
} from "./AdministrationSnapshot";

export type {
  GovernanceSnapshotPayload,
  GovernanceSnapshot,
  GovernanceSnapshotComparison,
} from "./AdministrationSnapshot";

export {
  ValidationAdministrationEngine,
  registerValidationAdministrationEngine,
  getValidationAdministrationEngine,
  resetValidationAdministrationEngine,
  registerBuiltinPolicies,
  buildBuiltinPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  evaluatePolicy,
  applyOverride,
  rollbackPolicy,
  createGovernanceSnapshot,
  getAdministrationMetrics,
} from "./ValidationAdministrationEngine";

export type {
  EvaluatePolicyOptions,
  AdministrationRegistrationResult,
} from "./ValidationAdministrationEngine";
