/**
 * Extensible registry of validation modules feeding the dashboard.
 * Newly registered modules are automatically included in aggregation.
 */

export type DashboardModuleId =
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
  | (string & {});

export type DashboardModuleHealthStatus =
  | "EXCELLENT"
  | "HEALTHY"
  | "STABLE"
  | "NEEDS_ATTENTION"
  | "CRITICAL"
  | "UNKNOWN";

export interface DashboardModuleStatus {
  moduleId: DashboardModuleId;
  moduleName: string;
  currentStatus: "ACTIVE" | "IDLE" | "DEGRADED" | "OFFLINE";
  validationCount: number;
  successPercent: number;
  failurePercent: number;
  averageScore: number;
  averageRuntime: number;
  lastValidation: string | null;
  healthStatus: DashboardModuleHealthStatus;
  warningCount: number;
  criticalCount: number;
}

/** Raw metrics payload collected from a validation source. */
export interface DashboardModuleRawMetrics {
  moduleId: DashboardModuleId;
  moduleName: string;
  validationCount: number;
  passedCount: number;
  failedCount: number;
  warningCount: number;
  criticalCount: number;
  averageScore: number;
  averageRuntime: number;
  lastValidation: string | null;
  extras?: Record<string, number>;
}

export type DashboardModuleCollector = () => DashboardModuleRawMetrics;

export interface DashboardModuleDefinition {
  id: DashboardModuleId;
  name: string;
  description?: string;
  collect: DashboardModuleCollector;
}

const modules = new Map<string, DashboardModuleDefinition>();
let builtinsRegistered = false;

export function registerDashboardModule(
  definition: DashboardModuleDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (modules.has(definition.id) && !options?.force) {
    return { registered: false, skipped: true };
  }
  modules.set(definition.id, { ...definition });
  return { registered: true, skipped: false };
}

export function getRegisteredDashboardModules(): DashboardModuleDefinition[] {
  return [...modules.values()].map((m) => ({ ...m }));
}

export function getDashboardModule(
  id: DashboardModuleId
): DashboardModuleDefinition | undefined {
  const found = modules.get(id);
  return found ? { ...found } : undefined;
}

export function collectAllModuleMetrics(): DashboardModuleRawMetrics[] {
  return [...modules.values()].map((m) => m.collect());
}

export function resetDashboardModuleRegistrationState(): void {
  modules.clear();
  builtinsRegistered = false;
}

export function areBuiltinDashboardModulesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinDashboardModulesRegistered(): void {
  builtinsRegistered = true;
}
