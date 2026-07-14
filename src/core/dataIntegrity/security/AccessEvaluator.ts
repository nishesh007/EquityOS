/**
 * Access evaluator — combines roles, permissions, and policies into a decision.
 */

import type { SecurityConfiguration } from "./SecurityConfiguration";
import type { SecurityContext } from "./SecurityContext";
import type { RoleManager } from "./RoleManager";
import type { PermissionManager } from "./PermissionManager";
import type {
  AccessPolicyEngine,
  PolicyEvaluationResult,
} from "./AccessPolicyEngine";

export interface AccessEvaluationResult {
  allowed: boolean;
  decision: "allow" | "deny";
  reason: string;
  requiresApproval: boolean;
  inheritedPermissions: string[];
  moduleRestricted: boolean;
  policyResult: PolicyEvaluationResult;
  warnings: string[];
  errors: string[];
  executionTimeMs: number;
}

export class AccessEvaluator {
  private config: SecurityConfiguration;

  constructor(config: SecurityConfiguration) {
    this.config = config;
  }

  setConfiguration(config: SecurityConfiguration): void {
    this.config = config;
  }

  evaluate(input: {
    context: SecurityContext;
    roles: RoleManager;
    permissions: PermissionManager;
    policies: AccessPolicyEngine;
  }): AccessEvaluationResult {
    const started = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const roleIds =
        input.context.subject.roles.length > 0
          ? input.context.subject.roles
          : [this.config.defaultRole];

      const resolved = input.roles.resolvePermissions(roleIds);
      warnings.push(...resolved.warnings);
      errors.push(...resolved.errors);

      const explicit = input.permissions.evaluateExplicit({
        subjectId: input.context.subject.subjectId,
        roleIds,
        action: input.context.action,
        module: input.context.resource.module,
        resourceType: input.context.resource.type,
      });
      warnings.push(...explicit.warnings);

      const policyResult = input.policies.evaluate(input.context);
      warnings.push(...policyResult.warnings);
      errors.push(...policyResult.errors);

      let moduleRestricted = false;
      if (
        resolved.modules &&
        !resolved.modules.has(input.context.resource.module)
      ) {
        moduleRestricted = true;
      }

      // Decision precedence: explicit deny > policy deny > explicit allow >
      // role permission (+ module) > policy allow > deny-by-default.
      if (explicit.allowed === false) {
        return finish({
          allowed: false,
          decision: "deny",
          reason: "explicit permission deny",
          requiresApproval: false,
          inheritedPermissions: [...resolved.permissions],
          moduleRestricted,
          policyResult,
          warnings,
          errors,
          started,
        });
      }

      if (policyResult.decision === "deny") {
        return finish({
          allowed: false,
          decision: "deny",
          reason: "access policy deny",
          requiresApproval: policyResult.requiresApproval,
          inheritedPermissions: [...resolved.permissions],
          moduleRestricted,
          policyResult,
          warnings,
          errors,
          started,
        });
      }

      if (moduleRestricted) {
        return finish({
          allowed: false,
          decision: "deny",
          reason: "module restriction",
          requiresApproval: false,
          inheritedPermissions: [...resolved.permissions],
          moduleRestricted,
          policyResult,
          warnings,
          errors,
          started,
        });
      }

      if (explicit.allowed === true) {
        return finish({
          allowed: true,
          decision: "allow",
          reason: "explicit permission allow",
          requiresApproval: policyResult.requiresApproval,
          inheritedPermissions: [...resolved.permissions],
          moduleRestricted,
          policyResult,
          warnings,
          errors,
          started,
        });
      }

      const hasRolePermission = resolved.permissions.has(
        input.context.action
      );
      if (hasRolePermission) {
        return finish({
          allowed: true,
          decision: "allow",
          reason: "role permission",
          requiresApproval: policyResult.requiresApproval,
          inheritedPermissions: [...resolved.permissions],
          moduleRestricted,
          policyResult,
          warnings,
          errors,
          started,
        });
      }

      if (policyResult.decision === "allow") {
        return finish({
          allowed: true,
          decision: "allow",
          reason: "access policy allow",
          requiresApproval: policyResult.requiresApproval,
          inheritedPermissions: [...resolved.permissions],
          moduleRestricted,
          policyResult,
          warnings,
          errors,
          started,
        });
      }

      const deny = this.config.denyByDefault || this.config.mode === "strict";
      return finish({
        allowed: !deny ? true : false,
        decision: deny ? "deny" : "allow",
        reason: deny
          ? "deny by default / strict mode"
          : "relaxed mode default allow",
        requiresApproval: policyResult.requiresApproval,
        inheritedPermissions: [...resolved.permissions],
        moduleRestricted,
        policyResult,
        warnings,
        errors,
        started,
      });
    } catch (err) {
      errors.push(`access evaluation failed: ${String(err)}`);
      return finish({
        allowed: false,
        decision: "deny",
        reason: "evaluation error",
        requiresApproval: false,
        inheritedPermissions: [],
        moduleRestricted: false,
        policyResult: {
          decision: "not_applicable",
          matchedPolicies: [],
          requiresApproval: false,
          warnings: [],
          errors: [...errors],
        },
        warnings,
        errors,
        started,
      });
    }
  }
}

function finish(input: {
  allowed: boolean;
  decision: "allow" | "deny";
  reason: string;
  requiresApproval: boolean;
  inheritedPermissions: string[];
  moduleRestricted: boolean;
  policyResult: PolicyEvaluationResult;
  warnings: string[];
  errors: string[];
  started: number;
}): AccessEvaluationResult {
  return {
    allowed: input.allowed,
    decision: input.decision,
    reason: input.reason,
    requiresApproval: input.requiresApproval,
    inheritedPermissions: input.inheritedPermissions,
    moduleRestricted: input.moduleRestricted,
    policyResult: input.policyResult,
    warnings: input.warnings,
    errors: input.errors,
    executionTimeMs: Date.now() - input.started,
  };
}
