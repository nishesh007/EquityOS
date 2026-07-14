/**
 * Extensible read-only observation registry for compliance evaluation.
 */

export type ComplianceSourceId =
  | "orchestrator"
  | "admin"
  | "policy"
  | "reporting"
  | "analytics"
  | "diagnostics"
  | "optimization"
  | "reliability"
  | "observability"
  | "intelligence"
  | "trust"
  | "dashboard"
  | "eventBus"
  | "ruleEngine"
  | (string & {});

export interface ComplianceObservation {
  sourceId: ComplianceSourceId;
  module: string;
  timestamp: string;
  /** Governance / policy signals */
  policiesPresent?: number;
  policiesEnabled?: number;
  criticalRulesDisabled?: number;
  rulesEnabled?: number;
  rulesTotal?: number;
  /** Coverage flags */
  auditEnabled?: boolean;
  monitoringEnabled?: boolean;
  reportingEnabled?: boolean;
  diagnosticsEnabled?: boolean;
  /** Configuration */
  configVersion?: string;
  expectedConfigVersion?: string;
  configurationDrift?: boolean;
  /** Health / readiness */
  healthScore?: number;
  reliabilityScore?: number;
  observabilityScore?: number;
  trustScore?: number;
  availability?: number;
  /** Gaps / deps */
  dependencyOk?: boolean;
  versionMismatch?: boolean;
  auditGap?: boolean;
  monitoringGap?: boolean;
  reportingGap?: boolean;
  governanceViolation?: boolean;
  metadata?: Record<string, unknown>;
}

export type ComplianceCollector = () => ComplianceObservation[];

export interface ComplianceSourceDefinition {
  id: ComplianceSourceId;
  name: string;
  description?: string;
  collect: ComplianceCollector;
}

const sources = new Map<string, ComplianceSourceDefinition>();
let builtinsRegistered = false;

export function registerComplianceSource(
  definition: ComplianceSourceDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (sources.has(definition.id) && !options?.force) {
    return { registered: false, skipped: true };
  }
  sources.set(definition.id, { ...definition });
  return { registered: true, skipped: false };
}

export function getRegisteredComplianceSources(): ComplianceSourceDefinition[] {
  return [...sources.values()].map((s) => ({ ...s }));
}

export function collectAllComplianceObservations(): ComplianceObservation[] {
  const out: ComplianceObservation[] = [];
  for (const source of sources.values()) {
    try {
      out.push(...source.collect());
    } catch {
      // Read-only collectors must never break compliance
    }
  }
  return out;
}

export function resetComplianceSourceRegistrationState(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinComplianceSourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinComplianceSourcesRegistered(): void {
  builtinsRegistered = true;
}
