/**
 * Institutional Validation Security & Access Control Engine — public exports (Prompt 9F.25).
 */

export {
  DEFAULT_SECURITY_CONFIGURATION,
  resolveSecurityConfiguration,
} from "./SecurityConfiguration";

export type {
  SecurityStrictMode,
  ApprovalPolicy,
  SecurityProfileId,
  SecurityScoreWeights,
  SecurityConfiguration,
  SecurityConfigurationInput,
} from "./SecurityConfiguration";

export {
  createResourceId,
  registerSecurityResource,
  getSecurityResource,
  listSecurityResources,
  resetSecurityRegistry,
} from "./SecurityRegistry";

export type {
  SecurityResourceType,
  SecurityModuleId,
  SecurityResourceDefinition,
} from "./SecurityRegistry";

export {
  createSecurityContext,
} from "./SecurityContext";

export type {
  SecurityPermissionAction,
  SecuritySubject,
  SecurityResourceRef,
  SecurityContext,
} from "./SecurityContext";

export {
  RoleManager,
  buildBuiltinRoles,
} from "./RoleManager";

export type {
  BuiltinRoleId,
  RoleDefinition,
  CreateRoleInput,
} from "./RoleManager";

export { PermissionManager } from "./PermissionManager";
export type {
  PermissionGrant,
  CreatePermissionInput,
} from "./PermissionManager";

export { AccessPolicyEngine } from "./AccessPolicyEngine";
export type {
  AccessPolicyEffect,
  AccessPolicyConstraint,
  AccessPolicyDefinition,
  CreateAccessPolicyInput,
  PolicyEvaluationResult,
} from "./AccessPolicyEngine";

export { AccessEvaluator } from "./AccessEvaluator";
export type { AccessEvaluationResult } from "./AccessEvaluator";

export { AccessValidator } from "./AccessValidator";
export type {
  AccessValidationIssue,
  AccessValidationResult,
} from "./AccessValidator";

export { SecurityMetricsTracker } from "./SecurityMetrics";
export type {
  SecurityHealthScore,
  SecurityOperationalMetrics,
} from "./SecurityMetrics";

export { SecurityAuditLogger } from "./SecurityAuditLogger";
export type {
  SecurityAuditEvent,
  SecurityAuditEntry,
} from "./SecurityAuditLogger";

export {
  createSecuritySnapshotId,
  compareSecuritySnapshots,
  buildSecuritySnapshotPayload,
  SecuritySnapshotStore,
} from "./SecuritySnapshot";

export type {
  SecuritySnapshotKind,
  SecuritySnapshotPayload,
  SecuritySnapshot,
  SecuritySnapshotComparison,
} from "./SecuritySnapshot";

export {
  ValidationSecurityEngine,
  registerSecurity,
  registerValidationSecurityEngine,
  getValidationSecurityEngine,
  resetValidationSecurityEngine,
  registerBuiltinSecurityResources,
  seedBuiltinSecurityModel,
  authorize,
  validateAccess,
  evaluatePolicy,
  createSecuritySnapshot,
  getSecurityMetrics,
} from "./ValidationSecurityEngine";

export type {
  AuthorizeOptions,
  AuthorizeResult,
  SecurityRegistrationResult,
} from "./ValidationSecurityEngine";
