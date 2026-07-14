/**
 * Extensible read-only observation registry for intelligence insights.
 */

export type InsightSourceId =
  | "orchestrator"
  | "analytics"
  | "observability"
  | "diagnostics"
  | "reporting"
  | "optimization"
  | "reliability"
  | "admin"
  | "trust"
  | "historical"
  | "dashboard"
  | "eventBus"
  | "ruleEngine"
  | (string & {});

export interface InsightObservation {
  sourceId: InsightSourceId;
  module: string;
  timestamp: string;
  ruleId?: string;
  pipelineId?: string;
  failures?: number;
  warnings?: number;
  validations?: number;
  runtimeMs?: number;
  retries?: number;
  timeouts?: number;
  trustScore?: number;
  integrityScore?: number;
  healthScore?: number;
  hallucinationScore?: number;
  historicalScore?: number;
  recommendationQuality?: number;
  cacheHitRate?: number;
  parallelSlots?: number;
  errorRate?: number;
  availability?: number;
  metadata?: Record<string, unknown>;
}

export type InsightCollector = () => InsightObservation[];

export interface InsightSourceDefinition {
  id: InsightSourceId;
  name: string;
  description?: string;
  collect: InsightCollector;
}

const sources = new Map<string, InsightSourceDefinition>();
let builtinsRegistered = false;

export function registerInsightSource(
  definition: InsightSourceDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (sources.has(definition.id) && !options?.force) {
    return { registered: false, skipped: true };
  }
  sources.set(definition.id, { ...definition });
  return { registered: true, skipped: false };
}

export function getRegisteredInsightSources(): InsightSourceDefinition[] {
  return [...sources.values()].map((s) => ({ ...s }));
}

export function collectAllInsightObservations(): InsightObservation[] {
  const out: InsightObservation[] = [];
  for (const source of sources.values()) {
    try {
      out.push(...source.collect());
    } catch {
      // Read-only collectors must never break intelligence
    }
  }
  return out;
}

export function resetInsightSourceRegistrationState(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinInsightSourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinInsightSourcesRegistered(): void {
  builtinsRegistered = true;
}
