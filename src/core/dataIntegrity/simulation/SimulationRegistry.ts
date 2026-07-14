/**
 * Simulation registry — read-only sandbox source modules.
 */

export type SimulationSourceKind =
  | "orchestrator"
  | "rule_engine"
  | "integrity"
  | "trade"
  | "trust"
  | "analytics"
  | "knowledge"
  | "performance"
  | "reliability"
  | "explainability"
  | "dashboard"
  | "reporting"
  | "events"
  | "custom"
  | (string & {});

export interface SimulationSourceDefinition {
  sourceId: string;
  kind: SimulationSourceKind;
  label: string;
  module: string;
  baselineScore: number;
  baselineConfidence: number;
  baselineTrust: number;
  weight: number;
  metadata?: Record<string, unknown>;
  registeredAt: string;
}

const sources = new Map<string, SimulationSourceDefinition>();
let builtinsRegistered = false;

export function createSimulationSourceId(kind: SimulationSourceKind): string {
  return `simsrc:${kind}`.toLowerCase();
}

export function registerSimulationSource(
  definition: Omit<SimulationSourceDefinition, "registeredAt"> & {
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

export function getSimulationSource(
  sourceId: string
): SimulationSourceDefinition | null {
  const s = sources.get(sourceId);
  return s ? cloneSource(s) : null;
}

export function listSimulationSources(filter?: {
  kind?: SimulationSourceKind;
  module?: string;
}): SimulationSourceDefinition[] {
  return [...sources.values()]
    .filter((s) => {
      if (filter?.kind && s.kind !== filter.kind) return false;
      if (filter?.module && s.module !== filter.module) return false;
      return true;
    })
    .map(cloneSource);
}

export function resetSimulationRegistry(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinSimulationSourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinSimulationSourcesRegistered(): void {
  builtinsRegistered = true;
}

function cloneSource(
  definition: SimulationSourceDefinition
): SimulationSourceDefinition {
  return {
    ...definition,
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  };
}
