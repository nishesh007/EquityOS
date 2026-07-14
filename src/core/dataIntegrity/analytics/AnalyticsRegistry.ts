/**
 * Extensible read-only data source registry for analytics.
 * Future validation modules register collectors without changing analytics core.
 */

export type AnalyticsSourceId =
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
  | "eventBus"
  | "orchestrator"
  | (string & {});

/** Normalized observation consumed by analytics (read-only). */
export interface AnalyticsObservation {
  sourceId: AnalyticsSourceId;
  timestamp: string;
  validationCount?: number;
  passed?: number;
  failed?: number;
  warnings?: number;
  critical?: number;
  averageRuntimeMs?: number;
  integrityScore?: number;
  trustScore?: number;
  hallucinationScore?: number;
  historicalScore?: number;
  recommendationQuality?: number;
  tradeQuality?: number;
  stock?: string;
  sector?: string;
  exchange?: string;
  recommendation?: string;
  ruleId?: string;
  ruleTriggered?: boolean;
  ruleFailed?: boolean;
  falsePositive?: boolean;
  falseNegative?: boolean;
  module?: string;
  metadata?: Record<string, unknown>;
}

export type AnalyticsCollector = () => AnalyticsObservation[];

export interface AnalyticsSourceDefinition {
  id: AnalyticsSourceId;
  name: string;
  description?: string;
  collect: AnalyticsCollector;
}

const sources = new Map<string, AnalyticsSourceDefinition>();
let builtinsRegistered = false;

export function registerAnalyticsSource(
  definition: AnalyticsSourceDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (sources.has(definition.id) && !options?.force) {
    return { registered: false, skipped: true };
  }
  sources.set(definition.id, { ...definition });
  return { registered: true, skipped: false };
}

export function getRegisteredAnalyticsSources(): AnalyticsSourceDefinition[] {
  return [...sources.values()].map((s) => ({ ...s }));
}

export function collectAllObservations(): AnalyticsObservation[] {
  const out: AnalyticsObservation[] = [];
  for (const source of sources.values()) {
    try {
      out.push(...source.collect());
    } catch {
      // Read-only collectors must never break analytics
    }
  }
  return out;
}

export function resetAnalyticsSourceRegistrationState(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinAnalyticsSourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinAnalyticsSourcesRegistered(): void {
  builtinsRegistered = true;
}
