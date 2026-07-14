/**
 * Platform registry — catalog of Sprint 9F engines for orchestration-only integration.
 */

export type PlatformEngineId =
  | "integrity"
  | "recommendation"
  | "trade_setup"
  | "hallucination"
  | "historical"
  | "trust"
  | "dashboard"
  | "orchestrator"
  | "events"
  | "analytics"
  | "reporting"
  | "diagnostics"
  | "admin"
  | "optimization"
  | "reliability"
  | "observability"
  | "intelligence"
  | "compliance"
  | "knowledge"
  | "versioning"
  | "security"
  | "performance"
  | "explainability"
  | "simulation"
  | "learning"
  | "release"
  | "documentation";

export interface PlatformEngineRecord {
  engineId: PlatformEngineId;
  label: string;
  sprint: string;
  registered: boolean;
  healthy: boolean;
  exportReady: boolean;
  metricsReady: boolean;
  snapshotReady: boolean;
  auditReady: boolean;
  registeredAt: string | null;
}

const engines = new Map<PlatformEngineId, PlatformEngineRecord>();

export const REQUIRED_PLATFORM_ENGINES: PlatformEngineId[] = [
  "integrity",
  "recommendation",
  "trade_setup",
  "hallucination",
  "historical",
  "trust",
  "dashboard",
  "orchestrator",
  "events",
  "analytics",
  "reporting",
  "diagnostics",
  "admin",
  "optimization",
  "reliability",
  "observability",
  "intelligence",
  "compliance",
  "knowledge",
  "versioning",
  "security",
  "performance",
  "explainability",
  "simulation",
  "learning",
  "release",
  "documentation",
];

export function createDefaultEngineRecord(
  engineId: PlatformEngineId,
  label: string,
  sprint: string
): PlatformEngineRecord {
  return {
    engineId,
    label,
    sprint,
    registered: false,
    healthy: false,
    exportReady: false,
    metricsReady: false,
    snapshotReady: false,
    auditReady: false,
    registeredAt: null,
  };
}

export function upsertPlatformEngine(
  record: PlatformEngineRecord
): PlatformEngineRecord {
  const next = { ...record };
  engines.set(record.engineId, next);
  return { ...next };
}

export function getPlatformEngine(
  engineId: PlatformEngineId
): PlatformEngineRecord | null {
  const r = engines.get(engineId);
  return r ? { ...r } : null;
}

export function listPlatformEngines(): PlatformEngineRecord[] {
  return [...engines.values()].map((r) => ({ ...r }));
}

export function resetPlatformRegistry(): void {
  engines.clear();
}

export function markEngineRegistered(
  engineId: PlatformEngineId,
  patch?: Partial<PlatformEngineRecord>
): PlatformEngineRecord {
  const existing = engines.get(engineId);
  const base =
    existing ??
    createDefaultEngineRecord(engineId, engineId, "9F");
  const next: PlatformEngineRecord = {
    ...base,
    ...patch,
    engineId,
    registered: true,
    healthy: patch?.healthy ?? true,
    exportReady: patch?.exportReady ?? true,
    metricsReady: patch?.metricsReady ?? true,
    snapshotReady: patch?.snapshotReady ?? true,
    auditReady: patch?.auditReady ?? true,
    registeredAt: new Date().toISOString(),
  };
  engines.set(engineId, next);
  return { ...next };
}
