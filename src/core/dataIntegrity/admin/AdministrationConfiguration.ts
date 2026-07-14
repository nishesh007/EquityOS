/**
 * Institutional Validation Administration — configuration.
 * Approval, versioning, retention, and governance flags live here; no magic numbers elsewhere.
 */

export type AdministrationStrictMode = "strict" | "relaxed";

export type GovernanceProfileId =
  | "development"
  | "testing"
  | "staging"
  | "production"
  | "institutional"
  | "research"
  | "custom"
  | (string & {});

export type ApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "AUTO_APPROVED"
  | "NOT_REQUIRED";

export interface AdministrationConfiguration {
  mode: AdministrationStrictMode;
  engineVersion: string;
  approvalRequired: boolean;
  defaultProfileId: GovernanceProfileId;
  policyVersioningEnabled: boolean;
  snapshotRetention: number;
  auditRetention: number;
  maxPolicies: number;
  maxOverrides: number;
  maxRollbackHistory: number;
  overrideDefaultTtlMs: number;
  strictGovernance: boolean;
  allowDeleteWithoutApproval: boolean;
  conflictBlocksApply: boolean;
}

export const DEFAULT_ADMINISTRATION_CONFIGURATION: AdministrationConfiguration =
  {
    mode: "strict",
    engineVersion: "9F.17.0",
    approvalRequired: false,
    defaultProfileId: "development",
    policyVersioningEnabled: true,
    snapshotRetention: 100,
    auditRetention: 1_000,
    maxPolicies: 500,
    maxOverrides: 200,
    maxRollbackHistory: 100,
    overrideDefaultTtlMs: 3_600_000,
    strictGovernance: true,
    allowDeleteWithoutApproval: false,
    conflictBlocksApply: true,
  };

export type AdministrationConfigurationInput =
  Partial<AdministrationConfiguration>;

export function resolveAdministrationConfiguration(
  input?: AdministrationConfigurationInput
): AdministrationConfiguration {
  const base = DEFAULT_ADMINISTRATION_CONFIGURATION;
  return {
    ...base,
    ...input,
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    auditRetention: Math.max(1, input?.auditRetention ?? base.auditRetention),
    maxPolicies: Math.max(1, input?.maxPolicies ?? base.maxPolicies),
    maxOverrides: Math.max(1, input?.maxOverrides ?? base.maxOverrides),
    maxRollbackHistory: Math.max(
      1,
      input?.maxRollbackHistory ?? base.maxRollbackHistory
    ),
    overrideDefaultTtlMs: Math.max(
      0,
      input?.overrideDefaultTtlMs ?? base.overrideDefaultTtlMs
    ),
  };
}
