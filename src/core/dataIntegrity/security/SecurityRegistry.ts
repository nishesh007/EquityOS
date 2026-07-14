/**
 * Security registry — protected modules / resources for read-only integration.
 * Does not alter validation decisions.
 */

export type SecurityResourceType =
  | "VALIDATION_ENGINE"
  | "REPORT"
  | "SNAPSHOT"
  | "METRICS"
  | "DASHBOARD"
  | "POLICY"
  | "CONFIGURATION"
  | "KNOWLEDGE_GRAPH"
  | "ANALYTICS"
  | "DIAGNOSTICS"
  | "AUDIT_LOG"
  | "API"
  | "MODULE"
  | "CUSTOM"
  | (string & {});

export type SecurityModuleId =
  | "orchestrator"
  | "admin"
  | "compliance"
  | "versioning"
  | "knowledge"
  | "analytics"
  | "diagnostics"
  | "reporting"
  | "dashboard"
  | "observability"
  | "reliability"
  | "optimization"
  | "events"
  | "intelligence"
  | "security"
  | (string & {});

export interface SecurityResourceDefinition {
  resourceId: string;
  type: SecurityResourceType;
  module: SecurityModuleId;
  label: string;
  sensitive?: boolean;
  requiresApproval?: boolean;
  metadata?: Record<string, unknown>;
  registeredAt: string;
}

const resources = new Map<string, SecurityResourceDefinition>();
let builtinsRegistered = false;

export function createResourceId(
  type: SecurityResourceType,
  module: SecurityModuleId
): string {
  return `secres:${type}:${module}`.toLowerCase();
}

export function registerSecurityResource(
  definition: Omit<SecurityResourceDefinition, "registeredAt"> & {
    registeredAt?: string;
  },
  options?: { force?: boolean; maxResources?: number }
): { registered: boolean; skipped: boolean } {
  if (resources.has(definition.resourceId) && !options?.force) {
    return { registered: false, skipped: true };
  }
  const max = options?.maxResources ?? 1_000;
  if (resources.size >= max && !resources.has(definition.resourceId)) {
    return { registered: false, skipped: true };
  }
  resources.set(definition.resourceId, {
    ...definition,
    registeredAt: definition.registeredAt ?? new Date().toISOString(),
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  });
  return { registered: true, skipped: false };
}

export function getSecurityResource(
  resourceId: string
): SecurityResourceDefinition | null {
  const r = resources.get(resourceId);
  return r ? cloneResource(r) : null;
}

export function listSecurityResources(filter?: {
  type?: SecurityResourceType;
  module?: SecurityModuleId;
}): SecurityResourceDefinition[] {
  return [...resources.values()]
    .filter((r) => {
      if (filter?.type && r.type !== filter.type) return false;
      if (filter?.module && r.module !== filter.module) return false;
      return true;
    })
    .map(cloneResource);
}

export function resetSecurityRegistry(): void {
  resources.clear();
  builtinsRegistered = false;
}

export function areBuiltinSecurityResourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinSecurityResourcesRegistered(): void {
  builtinsRegistered = true;
}

function cloneResource(
  definition: SecurityResourceDefinition
): SecurityResourceDefinition {
  return {
    ...definition,
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  };
}
