/**
 * Access policy engine — policy-based authorization (RBAC + ABAC-ready).
 */

import type { SecurityConfiguration } from "./SecurityConfiguration";
import type { SecurityContext } from "./SecurityContext";
import type { SecurityModuleId, SecurityResourceType } from "./SecurityRegistry";
import type { SecurityPermissionAction } from "./SecurityContext";

export type AccessPolicyEffect = "allow" | "deny";

export interface AccessPolicyConstraint {
  attribute: string;
  operator: "eq" | "neq" | "in" | "exists";
  value?: string | number | boolean | Array<string | number | boolean>;
}

export interface AccessPolicyDefinition {
  policyId: string;
  label: string;
  effect: AccessPolicyEffect;
  actions: SecurityPermissionAction[];
  modules?: SecurityModuleId[];
  resourceTypes?: SecurityResourceType[];
  roles?: string[];
  constraints?: AccessPolicyConstraint[];
  priority: number;
  enabled: boolean;
  requiresApproval?: boolean;
  createdAt: string;
}

export interface CreateAccessPolicyInput {
  policyId: string;
  label: string;
  effect: AccessPolicyEffect;
  actions: SecurityPermissionAction[];
  modules?: SecurityModuleId[];
  resourceTypes?: SecurityResourceType[];
  roles?: string[];
  constraints?: AccessPolicyConstraint[];
  priority?: number;
  enabled?: boolean;
  requiresApproval?: boolean;
}

export interface PolicyEvaluationResult {
  decision: "allow" | "deny" | "not_applicable";
  matchedPolicies: AccessPolicyDefinition[];
  requiresApproval: boolean;
  warnings: string[];
  errors: string[];
}

export class AccessPolicyEngine {
  private readonly policies = new Map<string, AccessPolicyDefinition>();
  private config: SecurityConfiguration;
  private maxPolicies: number;

  constructor(config: SecurityConfiguration) {
    this.config = config;
    this.maxPolicies = config.maxPolicies;
  }

  setConfiguration(config: SecurityConfiguration): void {
    this.config = config;
    this.maxPolicies = config.maxPolicies;
  }

  create(
    input: CreateAccessPolicyInput,
    options?: { force?: boolean }
  ): {
    registered: boolean;
    skipped: boolean;
    policy: AccessPolicyDefinition | null;
    errors: string[];
  } {
    const errors: string[] = [];
    if (!input.policyId?.trim()) errors.push("policyId is required");
    if (!input.actions?.length) errors.push("actions are required");
    if (errors.length > 0) {
      return { registered: false, skipped: false, policy: null, errors };
    }
    if (this.policies.has(input.policyId) && !options?.force) {
      return {
        registered: false,
        skipped: true,
        policy: clonePolicy(this.policies.get(input.policyId)!),
        errors: [],
      };
    }
    if (
      this.policies.size >= this.maxPolicies &&
      !this.policies.has(input.policyId)
    ) {
      return {
        registered: false,
        skipped: false,
        policy: null,
        errors: [`maxPolicies (${this.maxPolicies}) exceeded`],
      };
    }

    const policy: AccessPolicyDefinition = {
      policyId: input.policyId,
      label: input.label,
      effect: input.effect,
      actions: [...input.actions],
      modules: input.modules ? [...input.modules] : undefined,
      resourceTypes: input.resourceTypes ? [...input.resourceTypes] : undefined,
      roles: input.roles ? [...input.roles] : undefined,
      constraints: input.constraints
        ? input.constraints.map((c) => ({ ...c }))
        : undefined,
      priority: input.priority ?? 100,
      enabled: input.enabled ?? true,
      requiresApproval: input.requiresApproval,
      createdAt: new Date().toISOString(),
    };
    this.policies.set(policy.policyId, policy);
    return {
      registered: true,
      skipped: false,
      policy: clonePolicy(policy),
      errors: [],
    };
  }

  update(
    policyId: string,
    patch: Partial<CreateAccessPolicyInput>
  ): AccessPolicyDefinition | null {
    const existing = this.policies.get(policyId);
    if (!existing) return null;
    const next: AccessPolicyDefinition = {
      ...existing,
      label: patch.label ?? existing.label,
      effect: patch.effect ?? existing.effect,
      actions: patch.actions ? [...patch.actions] : existing.actions,
      modules: patch.modules
        ? [...patch.modules]
        : existing.modules
          ? [...existing.modules]
          : undefined,
      resourceTypes: patch.resourceTypes
        ? [...patch.resourceTypes]
        : existing.resourceTypes
          ? [...existing.resourceTypes]
          : undefined,
      roles: patch.roles
        ? [...patch.roles]
        : existing.roles
          ? [...existing.roles]
          : undefined,
      constraints: patch.constraints
        ? patch.constraints.map((c) => ({ ...c }))
        : existing.constraints
          ? existing.constraints.map((c) => ({ ...c }))
          : undefined,
      priority: patch.priority ?? existing.priority,
      enabled: patch.enabled ?? existing.enabled,
      requiresApproval:
        patch.requiresApproval ?? existing.requiresApproval,
    };
    this.policies.set(policyId, next);
    return clonePolicy(next);
  }

  delete(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  get(policyId: string): AccessPolicyDefinition | null {
    const p = this.policies.get(policyId);
    return p ? clonePolicy(p) : null;
  }

  list(): AccessPolicyDefinition[] {
    return [...this.policies.values()]
      .sort((a, b) => a.priority - b.priority)
      .map(clonePolicy);
  }

  evaluate(context: SecurityContext): PolicyEvaluationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const matched = this.list().filter((p) => {
        if (!p.enabled) return false;
        if (!p.actions.includes(context.action)) return false;
        if (p.modules && !p.modules.includes(context.resource.module)) {
          return false;
        }
        if (
          p.resourceTypes &&
          !p.resourceTypes.includes(context.resource.type)
        ) {
          return false;
        }
        if (
          p.roles &&
          !p.roles.some((r) => context.subject.roles.includes(r))
        ) {
          return false;
        }
        if (p.constraints?.length) {
          return p.constraints.every((c) =>
            matchConstraint(c, {
              ...context.subject.attributes,
              ...context.environment,
            })
          );
        }
        return true;
      });

      if (matched.length === 0) {
        return {
          decision: "not_applicable",
          matchedPolicies: [],
          requiresApproval: false,
          warnings,
          errors,
        };
      }

      // Higher priority (lower number) first; deny overrides allow at same priority.
      const ordered = [...matched].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.effect === b.effect) return 0;
        return a.effect === "deny" ? -1 : 1;
      });
      const top = ordered[0]!;
      const requiresApproval =
        Boolean(top.requiresApproval) ||
        (this.config.requireApprovalForSensitive &&
          Boolean(context.resource.requiresApproval || context.resource.sensitive));

      return {
        decision: top.effect,
        matchedPolicies: matched.map(clonePolicy),
        requiresApproval,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`policy evaluation failed: ${String(err)}`);
      return {
        decision: this.config.denyByDefault ? "deny" : "not_applicable",
        matchedPolicies: [],
        requiresApproval: false,
        warnings,
        errors,
      };
    }
  }

  coverageScore(protectedModules: string[]): number {
    const enabled = this.list().filter((p) => p.enabled);
    if (protectedModules.length === 0) return 100;
    if (enabled.length === 0) return 0;
    const covered = new Set<string>();
    for (const p of enabled) {
      if (!p.modules?.length) {
        for (const m of protectedModules) covered.add(m);
      } else {
        for (const m of p.modules) {
          if (protectedModules.includes(m)) covered.add(m);
        }
      }
    }
    return clamp(
      Math.round((covered.size / protectedModules.length) * 100),
      0,
      100
    );
  }

  clear(): void {
    this.policies.clear();
  }

  get size(): number {
    return this.policies.size;
  }
}

function matchConstraint(
  constraint: AccessPolicyConstraint,
  attrs: Record<string, string | number | boolean> | undefined
): boolean {
  const bag = attrs ?? {};
  const present = Object.prototype.hasOwnProperty.call(bag, constraint.attribute);
  const actual = bag[constraint.attribute];
  switch (constraint.operator) {
    case "exists":
      return present;
    case "eq":
      return present && actual === constraint.value;
    case "neq":
      return present && actual !== constraint.value;
    case "in": {
      if (!present || !Array.isArray(constraint.value)) return false;
      return (constraint.value as Array<string | number | boolean>).includes(
        actual as string | number | boolean
      );
    }
    default:
      return false;
  }
}

function clonePolicy(policy: AccessPolicyDefinition): AccessPolicyDefinition {
  return {
    ...policy,
    actions: [...policy.actions],
    modules: policy.modules ? [...policy.modules] : undefined,
    resourceTypes: policy.resourceTypes
      ? [...policy.resourceTypes]
      : undefined,
    roles: policy.roles ? [...policy.roles] : undefined,
    constraints: policy.constraints
      ? policy.constraints.map((c) => ({ ...c }))
      : undefined,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
