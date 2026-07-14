/**
 * General module / engine inspector for diagnostics.
 */

import type { DiagnosticsProbe } from "./DiagnosticsRegistry";

export interface EngineInspectionRow {
  module: string;
  sourceId: string;
  registered: boolean;
  healthy: boolean;
  validationCount: number;
  successRate: number;
  failureRate: number;
  averageRuntimeMs: number;
  healthScore: number;
  integrityScore: number | null;
  trustScore: number | null;
  memoryUsageBytes: number | null;
  cacheHitRate: number | null;
  configurationVersion: string | null;
  engineVersion: string | null;
  warnings: string[];
}

export interface ModuleInspectionResult {
  engines: EngineInspectionRow[];
  inspectedAt: string;
  warnings: string[];
  errors: string[];
}

export class DiagnosticsInspector {
  inspectModules(probes: DiagnosticsProbe[]): ModuleInspectionResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const engines: EngineInspectionRow[] = [];

    try {
      for (const probe of probes) {
        try {
          const total = Math.max(0, probe.validationCount ?? 0);
          const passed = Math.max(0, probe.passed ?? 0);
          const failed = Math.max(0, probe.failed ?? 0);
          const denom = total > 0 ? total : passed + failed;
          const successRate =
            denom === 0 ? 100 : round2((passed / denom) * 100);
          const failureRate =
            denom === 0 ? 0 : round2((failed / denom) * 100);
          const rowWarnings: string[] = [];
          if (probe.registered === false) {
            rowWarnings.push(`Module ${probe.module} is not registered.`);
            warnings.push(...rowWarnings);
          }
          if (probe.healthy === false) {
            rowWarnings.push(`Module ${probe.module} reports unhealthy.`);
            warnings.push(...rowWarnings);
          }
          engines.push({
            module: probe.module,
            sourceId: String(probe.sourceId),
            registered: probe.registered !== false,
            healthy: probe.healthy !== false,
            validationCount: total,
            successRate,
            failureRate,
            averageRuntimeMs: probe.averageRuntimeMs ?? 0,
            healthScore: probe.healthScore ?? successRate,
            integrityScore: probe.integrityScore ?? null,
            trustScore: probe.trustScore ?? null,
            memoryUsageBytes: probe.memoryUsageBytes ?? null,
            cacheHitRate: probe.cacheHitRate ?? null,
            configurationVersion: probe.configurationVersion ?? null,
            engineVersion: probe.engineVersion ?? null,
            warnings: rowWarnings,
          });
        } catch (err) {
          errors.push(
            `Failed inspecting module ${probe.module}: ${String(err)}`
          );
        }
      }
    } catch (err) {
      errors.push(`Module inspection failed: ${String(err)}`);
    }

    return {
      engines,
      inspectedAt: new Date().toISOString(),
      warnings,
      errors,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
