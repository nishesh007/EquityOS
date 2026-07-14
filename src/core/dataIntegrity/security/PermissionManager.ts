/**
 * Permission manager — grants, denials, and integrity checks over actions.
 */

import type { SecurityPermissionAction } from "./SecurityContext";
import type { SecurityModuleId, SecurityResourceType } from "./SecurityRegistry";

export interface PermissionGrant {
  grantId: string;
  subjectId?: string;
  roleId?: string;
  action: SecurityPermissionAction;
  resourceType?: SecurityResourceType;
  module?: SecurityModuleId;
  effect: "allow" | "deny";
  createdAt: string;
}

export interface CreatePermissionInput {
  grantId?: string;
  subjectId?: string;
  roleId?: string;
  action: SecurityPermissionAction;
  resourceType?: SecurityResourceType;
  module?: SecurityModuleId;
  effect?: "allow" | "deny";
}

export class PermissionManager {
  private readonly grants = new Map<string, PermissionGrant>();
  private maxPermissions: number;

  constructor(maxPermissions = 500) {
    this.maxPermissions = maxPermissions;
  }

  setMaxPermissions(n: number): void {
    this.maxPermissions = n;
  }

  grant(
    input: CreatePermissionInput,
    options?: { force?: boolean }
  ): {
    registered: boolean;
    skipped: boolean;
    grant: PermissionGrant | null;
    errors: string[];
  } {
    const errors: string[] = [];
    if (!input.action) errors.push("action is required");
    if (!input.subjectId && !input.roleId) {
      errors.push("subjectId or roleId is required");
    }
    if (errors.length > 0) {
      return { registered: false, skipped: false, grant: null, errors };
    }

    const grantId =
      input.grantId ??
      `perm:${input.roleId ?? input.subjectId}:${input.action}:${input.module ?? "*"}:${input.resourceType ?? "*"}`;

    if (this.grants.has(grantId) && !options?.force) {
      return {
        registered: false,
        skipped: true,
        grant: cloneGrant(this.grants.get(grantId)!),
        errors: [],
      };
    }
    if (this.grants.size >= this.maxPermissions && !this.grants.has(grantId)) {
      return {
        registered: false,
        skipped: false,
        grant: null,
        errors: [`maxPermissions (${this.maxPermissions}) exceeded`],
      };
    }

    const grant: PermissionGrant = {
      grantId,
      subjectId: input.subjectId,
      roleId: input.roleId,
      action: input.action,
      resourceType: input.resourceType,
      module: input.module,
      effect: input.effect ?? "allow",
      createdAt: new Date().toISOString(),
    };
    this.grants.set(grantId, grant);
    return { registered: true, skipped: false, grant: cloneGrant(grant), errors: [] };
  }

  revoke(grantId: string): boolean {
    return this.grants.delete(grantId);
  }

  list(filter?: {
    subjectId?: string;
    roleId?: string;
    action?: SecurityPermissionAction;
  }): PermissionGrant[] {
    return [...this.grants.values()]
      .filter((g) => {
        if (filter?.subjectId && g.subjectId !== filter.subjectId) return false;
        if (filter?.roleId && g.roleId !== filter.roleId) return false;
        if (filter?.action && g.action !== filter.action) return false;
        return true;
      })
      .map(cloneGrant);
  }

  /**
   * Explicit grants/denies for a subject+roles against a resource action.
   * Deny wins over allow when both match.
   */
  evaluateExplicit(input: {
    subjectId: string;
    roleIds: string[];
    action: SecurityPermissionAction;
    module: SecurityModuleId;
    resourceType: SecurityResourceType;
  }): { allowed: boolean | null; matched: PermissionGrant[]; warnings: string[] } {
    const matched = this.list().filter((g) => {
      const subjectMatch =
        (g.subjectId && g.subjectId === input.subjectId) ||
        (g.roleId && input.roleIds.includes(g.roleId));
      if (!subjectMatch) return false;
      if (g.action !== input.action) return false;
      if (g.module && g.module !== input.module) return false;
      if (g.resourceType && g.resourceType !== input.resourceType) return false;
      return true;
    });

    const warnings: string[] = [];
    const denies = matched.filter((g) => g.effect === "deny");
    const allows = matched.filter((g) => g.effect === "allow");
    if (denies.length > 0 && allows.length > 0) {
      warnings.push("conflicting allow/deny grants; deny takes precedence");
    }
    if (denies.length > 0) return { allowed: false, matched, warnings };
    if (allows.length > 0) return { allowed: true, matched, warnings };
    return { allowed: null, matched, warnings };
  }

  integrityScore(): number {
    const all = this.list();
    if (all.length === 0) return 70;
    let conflicts = 0;
    const keys = new Map<string, PermissionGrant[]>();
    for (const g of all) {
      const key = `${g.roleId ?? g.subjectId}:${g.action}:${g.module ?? "*"}:${g.resourceType ?? "*"}`;
      const bag = keys.get(key) ?? [];
      bag.push(g);
      keys.set(key, bag);
    }
    for (const bag of keys.values()) {
      const hasAllow = bag.some((g) => g.effect === "allow");
      const hasDeny = bag.some((g) => g.effect === "deny");
      if (hasAllow && hasDeny) conflicts += 1;
    }
    const ratio = conflicts / Math.max(1, keys.size);
    return clamp(Math.round(100 - ratio * 100), 0, 100);
  }

  clear(): void {
    this.grants.clear();
  }

  get size(): number {
    return this.grants.size;
  }
}

function cloneGrant(grant: PermissionGrant): PermissionGrant {
  return { ...grant };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
