/**
 * Performance registry — read-only integration targets for benchmark sources.
 */

export type PerformanceSourceKind =
  | "orchestrator"
  | "analytics"
  | "diagnostics"
  | "reliability"
  | "observability"
  | "optimization"
  | "reporting"
  | "dashboard"
  | "versioning"
  | "security"
  | "events"
  | "custom"
  | (string & {});

export interface PerformanceSourceDefinition {
  sourceId: string;
  kind: PerformanceSourceKind;
  label: string;
  /** Synthetic baseline latency (ms) used for advisory benchmarks. */
  baselineLatencyMs: number;
  /** Synthetic baseline throughput (ops/sec). */
  baselineThroughput: number;
  weight: number;
  metadata?: Record<string, unknown>;
  registeredAt: string;
}

const sources = new Map<string, PerformanceSourceDefinition>();
let builtinsRegistered = false;

export function createPerformanceSourceId(kind: PerformanceSourceKind): string {
  return `perfsrc:${kind}`.toLowerCase();
}

export function registerPerformanceSource(
  definition: Omit<PerformanceSourceDefinition, "registeredAt"> & {
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

export function getPerformanceSource(
  sourceId: string
): PerformanceSourceDefinition | null {
  const s = sources.get(sourceId);
  return s ? cloneSource(s) : null;
}

export function listPerformanceSources(filter?: {
  kind?: PerformanceSourceKind;
}): PerformanceSourceDefinition[] {
  return [...sources.values()]
    .filter((s) => (filter?.kind ? s.kind === filter.kind : true))
    .map(cloneSource);
}

export function resetPerformanceRegistry(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinPerformanceSourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinPerformanceSourcesRegistered(): void {
  builtinsRegistered = true;
}

function cloneSource(
  definition: PerformanceSourceDefinition
): PerformanceSourceDefinition {
  return {
    ...definition,
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  };
}
