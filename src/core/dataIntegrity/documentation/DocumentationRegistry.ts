/**
 * Documentation registry — read-only catalog of documentable modules and APIs.
 */

export type DocumentationTargetKind =
  | "module"
  | "api"
  | "rule"
  | "pipeline"
  | "engine"
  | "guide"
  | "custom"
  | (string & {});

export interface DocumentationTargetDefinition {
  targetId: string;
  kind: DocumentationTargetKind;
  name: string;
  module: string;
  description: string;
  publicApi: string[];
  dependencies: string[];
  version: string;
  deprecated?: boolean;
  metadata?: Record<string, unknown>;
  registeredAt: string;
}

const targets = new Map<string, DocumentationTargetDefinition>();
let builtinsRegistered = false;

export function createDocumentationTargetId(
  kind: DocumentationTargetKind,
  module: string
): string {
  return `doctarget:${kind}:${module}`.toLowerCase();
}

export function registerDocumentationTarget(
  definition: Omit<DocumentationTargetDefinition, "registeredAt"> & {
    registeredAt?: string;
  },
  options?: { force?: boolean; maxTargets?: number }
): { registered: boolean; skipped: boolean } {
  if (targets.has(definition.targetId) && !options?.force) {
    return { registered: false, skipped: true };
  }
  const max = options?.maxTargets ?? 1_000;
  if (targets.size >= max && !targets.has(definition.targetId)) {
    return { registered: false, skipped: true };
  }
  targets.set(definition.targetId, {
    ...definition,
    publicApi: [...definition.publicApi],
    dependencies: [...definition.dependencies],
    registeredAt: definition.registeredAt ?? new Date().toISOString(),
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  });
  return { registered: true, skipped: false };
}

export function getDocumentationTarget(
  targetId: string
): DocumentationTargetDefinition | null {
  const t = targets.get(targetId);
  return t ? cloneTarget(t) : null;
}

export function listDocumentationTargets(filter?: {
  kind?: DocumentationTargetKind;
  module?: string;
}): DocumentationTargetDefinition[] {
  return [...targets.values()]
    .filter((t) => {
      if (filter?.kind && t.kind !== filter.kind) return false;
      if (filter?.module && t.module !== filter.module) return false;
      return true;
    })
    .map(cloneTarget);
}

export function resetDocumentationRegistry(): void {
  targets.clear();
  builtinsRegistered = false;
}

export function areBuiltinDocumentationTargetsRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinDocumentationTargetsRegistered(): void {
  builtinsRegistered = true;
}

function cloneTarget(
  definition: DocumentationTargetDefinition
): DocumentationTargetDefinition {
  return {
    ...definition,
    publicApi: [...definition.publicApi],
    dependencies: [...definition.dependencies],
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  };
}
