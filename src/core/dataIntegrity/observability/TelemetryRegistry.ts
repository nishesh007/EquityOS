/**
 * Extensible read-only telemetry source registry.
 */

export type TelemetrySourceId =
  | "orchestrator"
  | "eventBus"
  | "ruleEngine"
  | "dataIntegrity"
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
  | "diagnostics"
  | "admin"
  | "optimization"
  | "reliability"
  | (string & {});

export interface TelemetrySample {
  sourceId: TelemetrySourceId;
  module: string;
  timestamp: string;
  validationRequests?: number;
  pipelineExecutions?: number;
  ruleExecutions?: number;
  executionTimeMs?: number;
  memoryBytes?: number;
  cpuUsagePct?: number;
  cacheHits?: number;
  cacheMisses?: number;
  retries?: number;
  timeouts?: number;
  failures?: number;
  warnings?: number;
  events?: number;
  throughput?: number;
  latencyMs?: number;
  peakRuntimeMs?: number;
  errorRate?: number;
  warningRate?: number;
  successRate?: number;
  availability?: number;
  healthScore?: number;
  trustScore?: number;
  integrityScore?: number;
  metadata?: Record<string, unknown>;
}

export type TelemetrySourceCollector = () => TelemetrySample[];

export interface TelemetrySourceDefinition {
  id: TelemetrySourceId;
  name: string;
  description?: string;
  collect: TelemetrySourceCollector;
}

const sources = new Map<string, TelemetrySourceDefinition>();
let builtinsRegistered = false;

export function registerTelemetrySource(
  definition: TelemetrySourceDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (sources.has(definition.id) && !options?.force) {
    return { registered: false, skipped: true };
  }
  sources.set(definition.id, { ...definition });
  return { registered: true, skipped: false };
}

export function getRegisteredTelemetrySources(): TelemetrySourceDefinition[] {
  return [...sources.values()].map((s) => ({ ...s }));
}

export function collectAllTelemetrySamples(): TelemetrySample[] {
  const out: TelemetrySample[] = [];
  for (const source of sources.values()) {
    try {
      out.push(...source.collect());
    } catch {
      // Read-only collectors must never break observability
    }
  }
  return out;
}

export function resetTelemetrySourceRegistrationState(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinTelemetrySourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinTelemetrySourcesRegistered(): void {
  builtinsRegistered = true;
}
