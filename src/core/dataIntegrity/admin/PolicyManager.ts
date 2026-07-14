/**
 * Policy lifecycle manager — create/update/delete/enable/disable/version/clone/rollback.
 */

import type { AdministrationConfiguration } from "./AdministrationConfiguration";
import type { ApprovalStatus } from "./AdministrationConfiguration";
import {
  createPolicyId,
  getPolicy,
  getPolicyVersion,
  getPolicyVersions,
  listPolicies,
  removePolicy,
  upsertPolicy,
  type PolicyDefinition,
  type PolicyScope,
  type PolicyStatus,
  type PolicyVersionRecord,
} from "./PolicyRegistry";

export interface CreatePolicyInput {
  name: string;
  description?: string;
  scope?: PolicyScope;
  status?: PolicyStatus;
  moduleIds?: string[];
  ruleIds?: string[];
  profileIds?: string[];
  tags?: string[];
  rules?: PolicyDefinition["rules"];
  metadata?: Record<string, unknown>;
  createdBy?: string;
  reason?: string;
  approvalStatus?: ApprovalStatus;
}

export interface UpdatePolicyInput {
  policyId: string;
  name?: string;
  description?: string;
  scope?: PolicyScope;
  status?: PolicyStatus;
  moduleIds?: string[];
  ruleIds?: string[];
  profileIds?: string[];
  tags?: string[];
  rules?: PolicyDefinition["rules"];
  metadata?: Record<string, unknown>;
  updatedBy?: string;
  reason?: string;
  approvalStatus?: ApprovalStatus;
}

export interface PolicyOperationResult {
  ok: boolean;
  policy: PolicyDefinition | null;
  warnings: string[];
  errors: string[];
  approvalStatus: ApprovalStatus;
  previous?: PolicyDefinition | null;
}

export class PolicyManager {
  private readonly rollbackHistory: Array<{
    policyId: string;
    fromVersion: number;
    toVersion: number;
    at: string;
    by?: string;
    reason?: string;
  }> = [];

  constructor(private config: AdministrationConfiguration) {}

  setConfiguration(config: AdministrationConfiguration): void {
    this.config = config;
  }

  createPolicy(input: CreatePolicyInput): PolicyOperationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      if (listPolicies().length >= this.config.maxPolicies) {
        errors.push(
          `Policy limit reached (${this.config.maxPolicies}).`
        );
        return {
          ok: false,
          policy: null,
          warnings,
          errors,
          approvalStatus: "REJECTED",
        };
      }

      const approval = this.resolveApproval(input.approvalStatus);
      if (approval === "REJECTED" || approval === "PENDING") {
        if (this.config.approvalRequired && approval === "PENDING") {
          warnings.push("Policy created in DRAFT pending approval.");
        }
      }

      const now = new Date().toISOString();
      const policy: PolicyDefinition = {
        policyId: createPolicyId(),
        name: input.name,
        description: input.description ?? "",
        scope: input.scope ?? "GLOBAL",
        status:
          approval === "PENDING"
            ? "DRAFT"
            : (input.status ?? "ENABLED"),
        version: 1,
        moduleIds: input.moduleIds,
        ruleIds: input.ruleIds,
        profileIds: input.profileIds,
        tags: [...(input.tags ?? [])],
        rules: { ...(input.rules ?? {}) },
        metadata: { ...(input.metadata ?? {}), reason: input.reason },
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      };

      upsertPolicy(policy);
      return {
        ok: true,
        policy,
        warnings,
        errors,
        approvalStatus: approval,
        previous: null,
      };
    } catch (err) {
      errors.push(`Create policy failed: ${String(err)}`);
      return {
        ok: false,
        policy: null,
        warnings,
        errors,
        approvalStatus: "REJECTED",
      };
    }
  }

  updatePolicy(input: UpdatePolicyInput): PolicyOperationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const existing = getPolicy(input.policyId);
      if (!existing) {
        errors.push(`Policy not found: ${input.policyId}`);
        return {
          ok: false,
          policy: null,
          warnings,
          errors,
          approvalStatus: "REJECTED",
        };
      }

      const approval = this.resolveApproval(input.approvalStatus);
      if (approval === "REJECTED") {
        errors.push("Policy update rejected by approval gate.");
        return {
          ok: false,
          policy: existing,
          warnings,
          errors,
          approvalStatus: approval,
          previous: existing,
        };
      }

      const updated: PolicyDefinition = {
        ...existing,
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        scope: input.scope ?? existing.scope,
        status: input.status ?? existing.status,
        moduleIds: input.moduleIds ?? existing.moduleIds,
        ruleIds: input.ruleIds ?? existing.ruleIds,
        profileIds: input.profileIds ?? existing.profileIds,
        tags: input.tags ?? existing.tags,
        rules: input.rules ?? existing.rules,
        metadata: {
          ...existing.metadata,
          ...(input.metadata ?? {}),
          reason: input.reason ?? existing.metadata.reason,
        },
        version: this.config.policyVersioningEnabled
          ? existing.version + 1
          : existing.version,
        updatedAt: new Date().toISOString(),
        updatedBy: input.updatedBy ?? existing.updatedBy,
      };

      if (approval === "PENDING") {
        updated.status = "DRAFT";
        warnings.push("Update pending approval; status set to DRAFT.");
      }

      upsertPolicy(updated);
      return {
        ok: true,
        policy: updated,
        warnings,
        errors,
        approvalStatus: approval,
        previous: existing,
      };
    } catch (err) {
      errors.push(`Update policy failed: ${String(err)}`);
      return {
        ok: false,
        policy: null,
        warnings,
        errors,
        approvalStatus: "REJECTED",
      };
    }
  }

  deletePolicy(
    policyId: string,
    options?: { deletedBy?: string; reason?: string; approvalStatus?: ApprovalStatus }
  ): PolicyOperationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const existing = getPolicy(policyId);
      if (!existing) {
        errors.push(`Policy not found: ${policyId}`);
        return {
          ok: false,
          policy: null,
          warnings,
          errors,
          approvalStatus: "REJECTED",
        };
      }

      if (
        this.config.approvalRequired &&
        !this.config.allowDeleteWithoutApproval &&
        options?.approvalStatus !== "APPROVED" &&
        options?.approvalStatus !== "AUTO_APPROVED"
      ) {
        errors.push("Delete requires approval.");
        return {
          ok: false,
          policy: existing,
          warnings,
          errors,
          approvalStatus: "PENDING",
          previous: existing,
        };
      }

      removePolicy(policyId);
      return {
        ok: true,
        policy: null,
        warnings,
        errors,
        approvalStatus:
          options?.approvalStatus ??
          (this.config.approvalRequired ? "APPROVED" : "NOT_REQUIRED"),
        previous: existing,
      };
    } catch (err) {
      errors.push(`Delete policy failed: ${String(err)}`);
      return {
        ok: false,
        policy: null,
        warnings,
        errors,
        approvalStatus: "REJECTED",
      };
    }
  }

  enablePolicy(policyId: string, updatedBy?: string): PolicyOperationResult {
    return this.updatePolicy({
      policyId,
      status: "ENABLED",
      updatedBy,
      reason: "enable",
    });
  }

  disablePolicy(policyId: string, updatedBy?: string): PolicyOperationResult {
    return this.updatePolicy({
      policyId,
      status: "DISABLED",
      updatedBy,
      reason: "disable",
    });
  }

  versionPolicy(policyId: string, reason?: string, updatedBy?: string): PolicyOperationResult {
    const existing = getPolicy(policyId);
    if (!existing) {
      return {
        ok: false,
        policy: null,
        warnings: [],
        errors: [`Policy not found: ${policyId}`],
        approvalStatus: "REJECTED",
      };
    }
    return this.updatePolicy({
      policyId,
      updatedBy,
      reason: reason ?? "explicit version bump",
      metadata: { ...existing.metadata, versionBump: true },
    });
  }

  clonePolicy(
    policyId: string,
    options?: { name?: string; createdBy?: string }
  ): PolicyOperationResult {
    const existing = getPolicy(policyId);
    if (!existing) {
      return {
        ok: false,
        policy: null,
        warnings: [],
        errors: [`Policy not found: ${policyId}`],
        approvalStatus: "REJECTED",
      };
    }
    return this.createPolicy({
      name: options?.name ?? `${existing.name} (clone)`,
      description: existing.description,
      scope: existing.scope,
      status: "DRAFT",
      moduleIds: existing.moduleIds,
      ruleIds: existing.ruleIds,
      profileIds: existing.profileIds,
      tags: [...existing.tags, "cloned"],
      rules: existing.rules,
      metadata: {
        ...existing.metadata,
        clonedFrom: existing.policyId,
        clonedFromVersion: existing.version,
      },
      createdBy: options?.createdBy,
      reason: `cloned from ${existing.policyId}`,
    });
  }

  rollbackPolicy(
    policyId: string,
    toVersion: number,
    options?: { rolledBackBy?: string; reason?: string }
  ): PolicyOperationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const current = getPolicy(policyId);
      const target = getPolicyVersion(policyId, toVersion);
      if (!current) {
        errors.push(`Policy not found: ${policyId}`);
        return {
          ok: false,
          policy: null,
          warnings,
          errors,
          approvalStatus: "REJECTED",
        };
      }
      if (!target) {
        errors.push(
          `Version ${toVersion} not found for policy ${policyId}.`
        );
        return {
          ok: false,
          policy: current,
          warnings,
          errors,
          approvalStatus: "REJECTED",
          previous: current,
        };
      }

      const restored: PolicyDefinition = {
        ...target.snapshot,
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: options?.rolledBackBy ?? current.updatedBy,
        metadata: {
          ...target.snapshot.metadata,
          rolledBackFrom: current.version,
          rolledBackTo: toVersion,
          reason: options?.reason ?? `rollback to v${toVersion}`,
        },
      };
      upsertPolicy(restored);
      this.rollbackHistory.push({
        policyId,
        fromVersion: current.version,
        toVersion,
        at: new Date().toISOString(),
        by: options?.rolledBackBy,
        reason: options?.reason,
      });
      if (this.rollbackHistory.length > this.config.maxRollbackHistory) {
        this.rollbackHistory.splice(
          0,
          this.rollbackHistory.length - this.config.maxRollbackHistory
        );
      }
      return {
        ok: true,
        policy: restored,
        warnings,
        errors,
        approvalStatus: "AUTO_APPROVED",
        previous: current,
      };
    } catch (err) {
      errors.push(`Rollback failed: ${String(err)}`);
      return {
        ok: false,
        policy: null,
        warnings,
        errors,
        approvalStatus: "REJECTED",
      };
    }
  }

  listPolicies(filter?: {
    status?: PolicyStatus;
    scope?: PolicyScope;
    tag?: string;
  }): PolicyDefinition[] {
    return listPolicies(filter);
  }

  getPolicy(policyId: string): PolicyDefinition | null {
    return getPolicy(policyId);
  }

  getVersions(policyId: string): PolicyVersionRecord[] {
    return getPolicyVersions(policyId);
  }

  getRollbackHistory() {
    return [...this.rollbackHistory];
  }

  private resolveApproval(status?: ApprovalStatus): ApprovalStatus {
    if (!this.config.approvalRequired) {
      return status === "REJECTED" ? "REJECTED" : "NOT_REQUIRED";
    }
    if (status === "APPROVED" || status === "AUTO_APPROVED") return status;
    if (status === "REJECTED") return "REJECTED";
    return "PENDING";
  }
}
