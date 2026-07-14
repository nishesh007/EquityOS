/**
 * Extensible read-only probe registry for diagnostics.
 * Future modules register probes without changing diagnostics core.
 */

export type DiagnosticsSourceId =
  | "dataIntegrity"
  | "ruleEngine"
  | "market"
  | "technical"
  | "fundamental"
  | "recommendation"
  | "tradeSetup"
  | "hallucination"
  | "historical"
  | "trust"
  | "dashboard"
  | "analytics"
  | "reporting"
  | "eventBus"
  | "orchestrator"
  | (string & {});

/** Normalized probe payload consumed by diagnostics (read-only). */
export interface DiagnosticsProbe {
  sourceId: DiagnosticsSourceId;
  module: string;
  timestamp: string;
  registered?: boolean;
  healthy?: boolean;
  validationCount?: number;
  passed?: number;
  failed?: number;
  warnings?: number;
  critical?: number;
  averageRuntimeMs?: number;
  integrityScore?: number;
  trustScore?: number;
  healthScore?: number;
  memoryUsageBytes?: number;
  cacheHitRate?: number;
  configurationVersion?: string;
  engineVersion?: string;
  ruleCount?: number;
  pipelineCount?: number;
  metadata?: Record<string, unknown>;
}

export type DiagnosticsCollector = () => DiagnosticsProbe[];

export interface DiagnosticsSourceDefinition {
  id: DiagnosticsSourceId;
  name: string;
  description?: string;
  collect: DiagnosticsCollector;
}

const sources = new Map<string, DiagnosticsSourceDefinition>();
let builtinsRegistered = false;

export function registerDiagnosticsSource(
  definition: DiagnosticsSourceDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (sources.has(definition.id) && !options?.force) {
    return { registered: false, skipped: true };
  }
  sources.set(definition.id, { ...definition });
  return { registered: true, skipped: false };
}

export function getRegisteredDiagnosticsSources(): DiagnosticsSourceDefinition[] {
  return [...sources.values()].map((s) => ({ ...s }));
}

export function collectAllDiagnosticsProbes(): DiagnosticsProbe[] {
  const out: DiagnosticsProbe[] = [];
  for (const source of sources.values()) {
    try {
      out.push(...source.collect());
    } catch {
      // Read-only collectors must never break diagnostics
    }
  }
  return out;
}

export function resetDiagnosticsSourceRegistrationState(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinDiagnosticsSourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinDiagnosticsSourcesRegistered(): void {
  builtinsRegistered = true;
}
