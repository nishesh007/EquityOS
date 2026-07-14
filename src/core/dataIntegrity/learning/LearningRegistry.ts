/**
 * Learning registry — read-only advisory learning sources.
 */

export type LearningSourceKind =
  | "orchestrator"
  | "analytics"
  | "simulation"
  | "performance"
  | "trust"
  | "explainability"
  | "knowledge"
  | "dashboard"
  | "reporting"
  | "observability"
  | "compliance"
  | "security"
  | "events"
  | "custom"
  | (string & {});

export type LearningSignalKind =
  | "historical_validation"
  | "simulation_result"
  | "performance_trend"
  | "trust_score"
  | "feedback_record"
  | "rule_performance"
  | "failure_history"
  | "regression_history"
  | "operational_metric";

export interface LearningSourceDefinition {
  sourceId: string;
  kind: LearningSourceKind;
  label: string;
  module: string;
  signals: LearningSignalKind[];
  baselineQuality: number;
  weight: number;
  metadata?: Record<string, unknown>;
  registeredAt: string;
}

const sources = new Map<string, LearningSourceDefinition>();
let builtinsRegistered = false;

export function createLearningSourceId(kind: LearningSourceKind): string {
  return `learnsrc:${kind}`.toLowerCase();
}

export function registerLearningSource(
  definition: Omit<LearningSourceDefinition, "registeredAt"> & {
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
    signals: [...definition.signals],
    registeredAt: definition.registeredAt ?? new Date().toISOString(),
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  });
  return { registered: true, skipped: false };
}

export function getLearningSource(
  sourceId: string
): LearningSourceDefinition | null {
  const s = sources.get(sourceId);
  return s ? cloneSource(s) : null;
}

export function listLearningSources(filter?: {
  kind?: LearningSourceKind;
  module?: string;
}): LearningSourceDefinition[] {
  return [...sources.values()]
    .filter((s) => {
      if (filter?.kind && s.kind !== filter.kind) return false;
      if (filter?.module && s.module !== filter.module) return false;
      return true;
    })
    .map(cloneSource);
}

export function resetLearningRegistry(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinLearningSourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinLearningSourcesRegistered(): void {
  builtinsRegistered = true;
}

function cloneSource(
  definition: LearningSourceDefinition
): LearningSourceDefinition {
  return {
    ...definition,
    signals: [...definition.signals],
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  };
}
