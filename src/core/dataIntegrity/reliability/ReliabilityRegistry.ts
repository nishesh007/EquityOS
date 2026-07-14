/**
 * Extensible read-only health probe registry for reliability.
 */

export type ReliabilitySourceId =
  | "orchestrator"
  | "ruleEngine"
  | "analytics"
  | "diagnostics"
  | "reporting"
  | "optimization"
  | "dashboard"
  | "eventBus"
  | "trust"
  | "historical"
  | "admin"
  | "platform"
  | (string & {});

export type ProbeHealthStatus = "HEALTHY" | "DEGRADED" | "CRITICAL" | "UNKNOWN";

export type FailureKind =
  | "INFRASTRUCTURE"
  | "TIMEOUT"
  | "DEPENDENCY"
  | "CONFIGURATION"
  | "LOGICAL"
  | "UNKNOWN";

export interface ReliabilityProbe {
  sourceId: ReliabilitySourceId;
  module: string;
  timestamp: string;
  status?: ProbeHealthStatus;
  healthScore?: number;
  available?: boolean;
  latencyMs?: number;
  errorRate?: number;
  timeoutCount?: number;
  retryCount?: number;
  failureKind?: FailureKind;
  critical?: boolean;
  advisory?: boolean;
  metadata?: Record<string, unknown>;
}

export type ReliabilityCollector = () => ReliabilityProbe[];

export interface ReliabilitySourceDefinition {
  id: ReliabilitySourceId;
  name: string;
  description?: string;
  collect: ReliabilityCollector;
}

const sources = new Map<string, ReliabilitySourceDefinition>();
let builtinsRegistered = false;

export function registerReliabilitySource(
  definition: ReliabilitySourceDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (sources.has(definition.id) && !options?.force) {
    return { registered: false, skipped: true };
  }
  sources.set(definition.id, { ...definition });
  return { registered: true, skipped: false };
}

export function getRegisteredReliabilitySources(): ReliabilitySourceDefinition[] {
  return [...sources.values()].map((s) => ({ ...s }));
}

export function collectAllReliabilityProbes(): ReliabilityProbe[] {
  const out: ReliabilityProbe[] = [];
  for (const source of sources.values()) {
    try {
      out.push(...source.collect());
    } catch {
      // Read-only collectors must never break reliability
    }
  }
  return out;
}

export function resetReliabilitySourceRegistrationState(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinReliabilitySourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinReliabilitySourcesRegistered(): void {
  builtinsRegistered = true;
}
