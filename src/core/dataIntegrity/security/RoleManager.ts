/**
 * Role manager — built-in and custom institutional roles with permission sets.
 */

import type { SecurityPermissionAction } from "./SecurityContext";

export type BuiltinRoleId =
  | "administrator"
  | "research_analyst"
  | "portfolio_manager"
  | "compliance_officer"
  | "auditor"
  | "developer"
  | "read_only";

export interface RoleDefinition {
  roleId: string;
  label: string;
  description: string;
  permissions: SecurityPermissionAction[];
  inheritsFrom?: string[];
  custom?: boolean;
  modules?: string[];
  createdAt: string;
}

export interface CreateRoleInput {
  roleId: string;
  label: string;
  description?: string;
  permissions: SecurityPermissionAction[];
  inheritsFrom?: string[];
  modules?: string[];
  custom?: boolean;
}

const ALL_ACTIONS: SecurityPermissionAction[] = [
  "read",
  "write",
  "execute",
  "approve",
  "export",
  "configure",
  "manage_policies",
  "manage_versions",
  "manage_security",
  "manage_snapshots",
  "view_audit_logs",
];

export function buildBuiltinRoles(): RoleDefinition[] {
  const now = new Date().toISOString();
  return [
    {
      roleId: "administrator",
      label: "Administrator",
      description: "Full platform administration including security.",
      permissions: [...ALL_ACTIONS],
      custom: false,
      createdAt: now,
    },
    {
      roleId: "research_analyst",
      label: "Research Analyst",
      description: "Research read/execute/export across validation modules.",
      permissions: ["read", "execute", "export"],
      modules: [
        "orchestrator",
        "analytics",
        "reporting",
        "dashboard",
        "knowledge",
        "diagnostics",
      ],
      custom: false,
      createdAt: now,
    },
    {
      roleId: "portfolio_manager",
      label: "Portfolio Manager",
      description: "Portfolio decision support with approve rights.",
      permissions: ["read", "execute", "approve", "export"],
      modules: [
        "orchestrator",
        "analytics",
        "reporting",
        "dashboard",
        "compliance",
      ],
      custom: false,
      createdAt: now,
    },
    {
      roleId: "compliance_officer",
      label: "Compliance Officer",
      description: "Compliance policy and audit oversight.",
      permissions: [
        "read",
        "approve",
        "export",
        "manage_policies",
        "view_audit_logs",
      ],
      modules: ["compliance", "admin", "reporting", "audit"],
      custom: false,
      createdAt: now,
    },
    {
      roleId: "auditor",
      label: "Auditor",
      description: "Read-only audit and snapshot visibility.",
      permissions: ["read", "export", "view_audit_logs", "manage_snapshots"],
      custom: false,
      createdAt: now,
    },
    {
      roleId: "developer",
      label: "Developer",
      description: "Diagnostics, configuration, and version management.",
      permissions: [
        "read",
        "write",
        "execute",
        "configure",
        "manage_versions",
        "manage_snapshots",
      ],
      modules: [
        "diagnostics",
        "observability",
        "versioning",
        "optimization",
        "reliability",
      ],
      custom: false,
      createdAt: now,
    },
    {
      roleId: "read_only",
      label: "Read Only",
      description: "Default least-privilege read access.",
      permissions: ["read"],
      custom: false,
      createdAt: now,
    },
  ];
}

export class RoleManager {
  private readonly roles = new Map<string, RoleDefinition>();
  private maxRoles: number;

  constructor(maxRoles = 200) {
    this.maxRoles = maxRoles;
  }

  setMaxRoles(n: number): void {
    this.maxRoles = n;
  }

  register(
    input: CreateRoleInput,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean; role: RoleDefinition | null; errors: string[] } {
    const errors: string[] = [];
    if (!input.roleId?.trim()) {
      errors.push("roleId is required");
      return { registered: false, skipped: false, role: null, errors };
    }
    if (this.roles.has(input.roleId) && !options?.force) {
      return {
        registered: false,
        skipped: true,
        role: cloneRole(this.roles.get(input.roleId)!),
        errors: [],
      };
    }
    if (this.roles.size >= this.maxRoles && !this.roles.has(input.roleId)) {
      errors.push(`maxRoles (${this.maxRoles}) exceeded`);
      return { registered: false, skipped: false, role: null, errors };
    }
    for (const parent of input.inheritsFrom ?? []) {
      if (!this.roles.has(parent)) {
        errors.push(`inheritsFrom role not found: ${parent}`);
      }
    }
    if (errors.length > 0) {
      return { registered: false, skipped: false, role: null, errors };
    }

    const role: RoleDefinition = {
      roleId: input.roleId,
      label: input.label,
      description: input.description ?? "",
      permissions: [...new Set(input.permissions)],
      inheritsFrom: input.inheritsFrom ? [...input.inheritsFrom] : undefined,
      modules: input.modules ? [...input.modules] : undefined,
      custom: input.custom ?? true,
      createdAt: new Date().toISOString(),
    };
    this.roles.set(role.roleId, role);
    return { registered: true, skipped: false, role: cloneRole(role), errors: [] };
  }

  get(roleId: string): RoleDefinition | null {
    const r = this.roles.get(roleId);
    return r ? cloneRole(r) : null;
  }

  list(): RoleDefinition[] {
    return [...this.roles.values()].map(cloneRole);
  }

  resolvePermissions(roleIds: string[]): {
    permissions: Set<SecurityPermissionAction>;
    modules: Set<string> | null;
    warnings: string[];
    errors: string[];
  } {
    const permissions = new Set<SecurityPermissionAction>();
    const moduleSets: Array<Set<string> | null> = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    const visited = new Set<string>();

    const walk = (roleId: string): void => {
      if (visited.has(roleId)) {
        warnings.push(`role inheritance cycle involving ${roleId}`);
        return;
      }
      visited.add(roleId);
      const role = this.roles.get(roleId);
      if (!role) {
        errors.push(`unknown role: ${roleId}`);
        return;
      }
      for (const p of role.permissions) permissions.add(p);
      if (role.modules) {
        moduleSets.push(new Set(role.modules));
      } else {
        moduleSets.push(null);
      }
      for (const parent of role.inheritsFrom ?? []) {
        walk(parent);
      }
    };

    for (const id of roleIds) walk(id);

    // Unrestricted (null) if any role grants all modules; else union of module sets.
    let modules: Set<string> | null = null;
    if (moduleSets.length > 0 && moduleSets.every((m) => m !== null)) {
      modules = new Set<string>();
      for (const set of moduleSets) {
        for (const m of set!) modules.add(m);
      }
    }

    return { permissions, modules, warnings, errors };
  }

  clear(): void {
    this.roles.clear();
  }

  get size(): number {
    return this.roles.size;
  }
}

function cloneRole(role: RoleDefinition): RoleDefinition {
  return {
    ...role,
    permissions: [...role.permissions],
    inheritsFrom: role.inheritsFrom ? [...role.inheritsFrom] : undefined,
    modules: role.modules ? [...role.modules] : undefined,
  };
}
