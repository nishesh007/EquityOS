/**
 * Access validator — validates role permissions, inheritance, policies, visibility, context.
 */

import type { SecurityConfiguration, ApprovalPolicy } from "./SecurityConfiguration";
import type { SecurityContext } from "./SecurityContext";
import type { AccessEvaluationResult } from "./AccessEvaluator";

export interface AccessValidationIssue {
  code:
    | "ROLE_PERMISSION"
    | "INHERITED_PERMISSION"
    | "POLICY_CONSTRAINT"
    | "MODULE_RESTRICTION"
    | "APPROVAL_REQUIRED"
    | "RESOURCE_VISIBILITY"
    | "CONTEXT_RESTRICTION"
    | "ROLE_CONFLICT"
    | "CONFIGURATION";
  message: string;
  severity: "error" | "warning";
}

export interface AccessValidationResult {
  valid: boolean;
  authorized: boolean;
  issues: AccessValidationIssue[];
  evaluation: AccessEvaluationResult;
  warnings: string[];
  errors: string[];
}

const SENSITIVE_ACTIONS = new Set([
  "manage_security",
  "manage_policies",
  "configure",
  "write",
  "approve",
]);

export class AccessValidator {
  private config: SecurityConfiguration;

  constructor(config: SecurityConfiguration) {
    this.config = config;
  }

  setConfiguration(config: SecurityConfiguration): void {
    this.config = config;
  }

  validate(input: {
    context: SecurityContext;
    evaluation: AccessEvaluationResult;
  }): AccessValidationResult {
    const issues: AccessValidationIssue[] = [];
    const warnings: string[] = [...input.evaluation.warnings];
    const errors: string[] = [...input.evaluation.errors];

    try {
      if (input.evaluation.errors.length > 0) {
        issues.push({
          code: "ROLE_CONFLICT",
          message: input.evaluation.errors.join("; "),
          severity: "error",
        });
      }

      if (
        !input.evaluation.inheritedPermissions.includes(input.context.action) &&
        input.evaluation.decision === "deny" &&
        input.evaluation.reason.includes("role")
      ) {
        issues.push({
          code: "ROLE_PERMISSION",
          message: `Role set lacks permission: ${input.context.action}`,
          severity: "error",
        });
      }

      if (input.evaluation.moduleRestricted) {
        issues.push({
          code: "MODULE_RESTRICTION",
          message: `Module ${input.context.resource.module} is restricted for subject roles`,
          severity: "error",
        });
      }

      if (input.evaluation.policyResult.decision === "deny") {
        issues.push({
          code: "POLICY_CONSTRAINT",
          message: "Matched access policy denied the request",
          severity: "error",
        });
      }

      const approvalNeeded =
        input.evaluation.requiresApproval ||
        needsApproval(
          this.config.approvalPolicy,
          input.context,
          this.config.requireApprovalForSensitive
        );

      if (approvalNeeded && !input.context.approvalToken) {
        issues.push({
          code: "APPROVAL_REQUIRED",
          message: `Approval required under policy ${this.config.approvalPolicy}`,
          severity: this.config.mode === "strict" ? "error" : "warning",
        });
      }

      if (
        (input.context.resource.sensitive ||
          input.context.resource.type === "AUDIT_LOG") &&
        !input.evaluation.inheritedPermissions.includes("view_audit_logs") &&
        input.context.action === "view_audit_logs"
      ) {
        issues.push({
          code: "RESOURCE_VISIBILITY",
          message: "Audit log visibility requires view_audit_logs permission",
          severity: "error",
        });
      }

      if (
        this.config.institutionalMode &&
        input.context.environment?.networkZone === "public" &&
        SENSITIVE_ACTIONS.has(input.context.action)
      ) {
        issues.push({
          code: "CONTEXT_RESTRICTION",
          message: "Sensitive actions blocked from public network zone",
          severity: "error",
        });
      }

      if (this.config.mode === "strict" && !input.context.subject.roles.length) {
        issues.push({
          code: "CONFIGURATION",
          message: `No roles provided; defaulting to ${this.config.defaultRole}`,
          severity: "warning",
        });
      }

      const blocking = issues.filter((i) => i.severity === "error");
      const authorized =
        input.evaluation.allowed && blocking.length === 0;

      for (const issue of issues) {
        if (issue.severity === "error") errors.push(issue.message);
        else warnings.push(issue.message);
      }

      return {
        valid: blocking.length === 0,
        authorized,
        issues,
        evaluation: input.evaluation,
        warnings,
        errors,
      };
    } catch (err) {
      const message = `access validation failed: ${String(err)}`;
      return {
        valid: false,
        authorized: false,
        issues: [
          {
            code: "CONFIGURATION",
            message,
            severity: "error",
          },
        ],
        evaluation: input.evaluation,
        warnings,
        errors: [...errors, message],
      };
    }
  }
}

function needsApproval(
  policy: ApprovalPolicy,
  context: SecurityContext,
  requireForSensitive: boolean
): boolean {
  if (policy === "none") return false;
  if (context.resource.requiresApproval) return true;
  if (requireForSensitive && context.resource.sensitive) return true;
  if (policy === "dual_control" && SENSITIVE_ACTIONS.has(context.action)) {
    return true;
  }
  if (
    policy === "manager_only" &&
    (context.action === "approve" || context.action === "manage_policies")
  ) {
    return true;
  }
  if (
    policy === "compliance_required" &&
    (context.resource.module === "compliance" ||
      context.action === "manage_policies")
  ) {
    return true;
  }
  return false;
}
