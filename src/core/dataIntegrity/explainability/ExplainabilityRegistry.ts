/**
 * Explainability registry — read-only source modules for decision tracing.
 */

export type ExplainabilitySourceKind =
  | "orchestrator"
  | "rule_engine"
  | "integrity"
  | "trade"
  | "hallucination"
  | "trust"
  | "analytics"
  | "knowledge"
  | "dashboard"
  | "reporting"
  | "observability"
  | "events"
  | "custom"
  | (string & {});

export interface ExplainabilitySourceDefinition {
  sourceId: string;
  kind: ExplainabilitySourceKind;
  label: string;
  module: string;
  defaultConfidence: number;
  weight: number;
  metadata?: Record<string, unknown>;
  registeredAt: string;
}

const sources = new Map<string, ExplainabilitySourceDefinition>();
let builtinsRegistered = false;

export function createExplainabilitySourceId(
  kind: ExplainabilitySourceKind
): string {
  return `explsrc:${kind}`.toLowerCase();
}

export function registerExplainabilitySource(
  definition: Omit<ExplainabilitySourceDefinition, "registeredAt"> & {
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

export function getExplainabilitySource(
  sourceId: string
): ExplainabilitySourceDefinition | null {
  const s = sources.get(sourceId);
  return s ? cloneSource(s) : null;
}

export function listExplainabilitySources(filter?: {
  kind?: ExplainabilitySourceKind;
  module?: string;
}): ExplainabilitySourceDefinition[] {
  return [...sources.values()]
    .filter((s) => {
      if (filter?.kind && s.kind !== filter.kind) return false;
      if (filter?.module && s.module !== filter.module) return false;
      return true;
    })
    .map(cloneSource);
}

export function resetExplainabilityRegistry(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinExplainabilitySourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinExplainabilitySourcesRegistered(): void {
  builtinsRegistered = true;
}

function cloneSource(
  definition: ExplainabilitySourceDefinition
): ExplainabilitySourceDefinition {
  return {
    ...definition,
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  };
}
