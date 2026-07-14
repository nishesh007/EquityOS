/**
 * Extensible read-only probe registry for optimization.
 */

export type OptimizationSourceId =
  | "orchestrator"
  | "analytics"
  | "diagnostics"
  | "reporting"
  | "dashboard"
  | "eventBus"
  | "trust"
  | "historical"
  | "ruleEngine"
  | "admin"
  | (string & {});

export interface OptimizationProbe {
  sourceId: OptimizationSourceId;
  module: string;
  timestamp: string;
  pipelineId?: string;
  ruleId?: string;
  runtimeMs?: number;
  cacheHitRate?: number;
  cacheSize?: number;
  cacheTtlMs?: number;
  memoryBytes?: number;
  retryCount?: number;
  queueDepth?: number;
  parallelSlots?: number;
  dependencies?: string[];
  executionOrder?: number;
  batchSize?: number;
  successRate?: number;
  metadata?: Record<string, unknown>;
}

export type OptimizationCollector = () => OptimizationProbe[];

export interface OptimizationSourceDefinition {
  id: OptimizationSourceId;
  name: string;
  description?: string;
  collect: OptimizationCollector;
}

const sources = new Map<string, OptimizationSourceDefinition>();
let builtinsRegistered = false;

export function registerOptimizationSource(
  definition: OptimizationSourceDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (sources.has(definition.id) && !options?.force) {
    return { registered: false, skipped: true };
  }
  sources.set(definition.id, { ...definition });
  return { registered: true, skipped: false };
}

export function getRegisteredOptimizationSources(): OptimizationSourceDefinition[] {
  return [...sources.values()].map((s) => ({ ...s }));
}

export function collectAllOptimizationProbes(): OptimizationProbe[] {
  const out: OptimizationProbe[] = [];
  for (const source of sources.values()) {
    try {
      out.push(...source.collect());
    } catch {
      // Read-only collectors must never break optimization
    }
  }
  return out;
}

export function resetOptimizationSourceRegistrationState(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinOptimizationSourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinOptimizationSourcesRegistered(): void {
  builtinsRegistered = true;
}
