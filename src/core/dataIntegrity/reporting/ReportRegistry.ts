/**
 * Extensible registry of read-only report data sources.
 */

import type { ReportSourcePayload } from "./ReportAggregator";

export type ReportSourceId =
  | "orchestrator"
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
  | "eventBus"
  | (string & {});

export type ReportSourceCollector = () => ReportSourcePayload[];

export interface ReportSourceDefinition {
  id: ReportSourceId;
  name: string;
  description?: string;
  collect: ReportSourceCollector;
}

const sources = new Map<string, ReportSourceDefinition>();
let builtinsRegistered = false;

export function registerReportSource(
  definition: ReportSourceDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (sources.has(definition.id) && !options?.force) {
    return { registered: false, skipped: true };
  }
  sources.set(definition.id, { ...definition });
  return { registered: true, skipped: false };
}

export function getRegisteredReportSources(): ReportSourceDefinition[] {
  return [...sources.values()].map((s) => ({ ...s }));
}

export function collectAllReportPayloads(): ReportSourcePayload[] {
  const out: ReportSourcePayload[] = [];
  for (const source of sources.values()) {
    try {
      out.push(...source.collect());
    } catch {
      // Read-only collectors must never break reporting
    }
  }
  return out;
}

export function resetReportSourceRegistrationState(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinReportSourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinReportSourcesRegistered(): void {
  builtinsRegistered = true;
}
