/**
 * Release registry — read-only certification source modules.
 */

export type ReleaseSourceKind =
  | "orchestrator"
  | "integrity"
  | "trade"
  | "trust"
  | "analytics"
  | "performance"
  | "learning"
  | "simulation"
  | "explainability"
  | "compliance"
  | "security"
  | "versioning"
  | "reliability"
  | "dashboard"
  | "reporting"
  | "observability"
  | "knowledge"
  | "events"
  | "custom"
  | (string & {});

export interface ReleaseSourceDefinition {
  sourceId: string;
  kind: ReleaseSourceKind;
  label: string;
  module: string;
  healthScore: number;
  testCoverage: number;
  securityScore: number;
  complianceScore: number;
  performanceScore: number;
  reliabilityScore: number;
  documentationScore: number;
  weight: number;
  metadata?: Record<string, unknown>;
  registeredAt: string;
}

const sources = new Map<string, ReleaseSourceDefinition>();
let builtinsRegistered = false;

export function createReleaseSourceId(kind: ReleaseSourceKind): string {
  return `relsrc:${kind}`.toLowerCase();
}

export function registerReleaseSource(
  definition: Omit<ReleaseSourceDefinition, "registeredAt"> & {
    registeredAt?: string;
  },
  options?: { force?: boolean; maxSources?: number }
): { registered: boolean; skipped: boolean } {
  if (sources.has(definition.sourceId) && !options?.force) {
    return { registered: false, skipped: true };
  }
  const max = options?.maxSources ?? 1_000;
  if (sources.size >= max && !sources.has(definition.sourceId)) {
    return { registered: false, skipped: true };
  }
  sources.set(definition.sourceId, {
    ...definition,
    registeredAt: definition.registeredAt ?? new Date().toISOString(),
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  });
  return { registered: true, skipped: false };
}

export function getReleaseSource(
  sourceId: string
): ReleaseSourceDefinition | null {
  const s = sources.get(sourceId);
  return s ? cloneSource(s) : null;
}

export function listReleaseSources(filter?: {
  kind?: ReleaseSourceKind;
  module?: string;
}): ReleaseSourceDefinition[] {
  return [...sources.values()]
    .filter((s) => {
      if (filter?.kind && s.kind !== filter.kind) return false;
      if (filter?.module && s.module !== filter.module) return false;
      return true;
    })
    .map(cloneSource);
}

export function resetReleaseRegistry(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinReleaseSourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinReleaseSourcesRegistered(): void {
  builtinsRegistered = true;
}

function cloneSource(
  definition: ReleaseSourceDefinition
): ReleaseSourceDefinition {
  return {
    ...definition,
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  };
}
