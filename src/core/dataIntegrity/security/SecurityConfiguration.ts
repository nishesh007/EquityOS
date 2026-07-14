/**
 * Institutional Validation Security — configuration.
 * Strict mode, roles, approval, retention, and score weights live here; no magic numbers elsewhere.
 */

export type SecurityStrictMode = "strict" | "relaxed";

export type ApprovalPolicy =
  | "none"
  | "dual_control"
  | "manager_only"
  | "compliance_required";

export type SecurityProfileId =
  | "institutional"
  | "standard"
  | "developer"
  | "read_only"
  | "custom";

export interface SecurityScoreWeights {
  policyCoverage: number;
  permissionIntegrity: number;
  roleConsistency: number;
  auditCompleteness: number;
  configurationSecurity: number;
  accessValidation: number;
}

export interface SecurityConfiguration {
  mode: SecurityStrictMode;
  engineVersion: string;
  defaultRole: string;
  approvalPolicy: ApprovalPolicy;
  securityProfile: SecurityProfileId;
  snapshotRetention: number;
  auditRetention: number;
  maxAuditEntries: number;
  maxRoles: number;
  maxPermissions: number;
  maxPolicies: number;
  institutionalMode: boolean;
  requireApprovalForSensitive: boolean;
  denyByDefault: boolean;
  scoreWeights: SecurityScoreWeights;
}

export const DEFAULT_SECURITY_CONFIGURATION: SecurityConfiguration = {
  mode: "strict",
  engineVersion: "9F.25.0",
  defaultRole: "read_only",
  approvalPolicy: "dual_control",
  securityProfile: "institutional",
  snapshotRetention: 100,
  auditRetention: 1_000,
  maxAuditEntries: 500,
  maxRoles: 200,
  maxPermissions: 500,
  maxPolicies: 200,
  institutionalMode: true,
  requireApprovalForSensitive: true,
  denyByDefault: true,
  scoreWeights: {
    policyCoverage: 0.25,
    permissionIntegrity: 0.2,
    roleConsistency: 0.2,
    auditCompleteness: 0.15,
    configurationSecurity: 0.1,
    accessValidation: 0.1,
  },
};

export type SecurityConfigurationInput = Partial<
  Omit<SecurityConfiguration, "scoreWeights">
> & {
  scoreWeights?: Partial<SecurityScoreWeights>;
};

export function resolveSecurityConfiguration(
  input?: SecurityConfigurationInput
): SecurityConfiguration {
  const base = DEFAULT_SECURITY_CONFIGURATION;
  return {
    ...base,
    ...input,
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    auditRetention: Math.max(1, input?.auditRetention ?? base.auditRetention),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
    maxRoles: Math.max(1, input?.maxRoles ?? base.maxRoles),
    maxPermissions: Math.max(
      1,
      input?.maxPermissions ?? base.maxPermissions
    ),
    maxPolicies: Math.max(1, input?.maxPolicies ?? base.maxPolicies),
  };
}
