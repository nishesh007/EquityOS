/**
 * Engine health evaluation for diagnostics.
 */

import type { DiagnosticsConfiguration } from "./DiagnosticsConfiguration";
import type { EngineInspectionRow } from "./DiagnosticsInspector";
import type { RuleInspectionResult } from "./DiagnosticsRuleInspector";
import type { PipelineInspectionResult } from "./DiagnosticsPipelineInspector";
import type { ProfileResult } from "./DiagnosticsProfiler";

export interface DiagnosticsHealthBreakdown {
  registrationHealth: number;
  executionHealth: number;
  dependencyHealth: number;
  runtimeHealth: number;
  memoryHealth: number;
  cacheHealth: number;
  configurationHealth: number;
  overallHealthScore: number;
}

export interface DiagnosticsHealthResult {
  breakdown: DiagnosticsHealthBreakdown;
  status: "HEALTHY" | "DEGRADED" | "CRITICAL";
  warnings: string[];
  errors: string[];
  evaluatedAt: string;
}

export class DiagnosticsHealthChecker {
  constructor(private config: DiagnosticsConfiguration) {}

  setConfiguration(config: DiagnosticsConfiguration): void {
    this.config = config;
  }

  evaluate(input: {
    engines?: EngineInspectionRow[];
    rules?: RuleInspectionResult;
    pipelines?: PipelineInspectionResult;
    profile?: ProfileResult | null;
  }): DiagnosticsHealthResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const engines = input.engines ?? [];
      const registered =
        engines.length === 0
          ? 100
          : (engines.filter((e) => e.registered).length / engines.length) * 100;
      const healthy =
        engines.length === 0
          ? 100
          : (engines.filter((e) => e.healthy).length / engines.length) * 100;

      const successRates = engines.map((e) => e.successRate);
      const execution =
        successRates.length === 0
          ? 100
          : successRates.reduce((a, b) => a + b, 0) / successRates.length;

      const ruleDeps = input.rules?.rules ?? [];
      const missingDeps = ruleDeps.filter((r) =>
        r.dependencies.some(
          (dep) => !ruleDeps.some((other) => other.ruleId === dep)
        )
      ).length;
      const dependency =
        ruleDeps.length === 0
          ? 100
          : Math.max(0, 100 - (missingDeps / ruleDeps.length) * 100);

      const runtimes = engines.map((e) => e.averageRuntimeMs);
      const avgRuntime =
        runtimes.length === 0
          ? 0
          : runtimes.reduce((a, b) => a + b, 0) / runtimes.length;
      const runtime = clamp(
        100 - (avgRuntime / Math.max(this.config.slowEngineThresholdMs, 1)) * 40,
        0,
        100
      );

      const memoryBytes = input.profile?.memoryUsageBytes ?? 0;
      const memory =
        memoryBytes <= 0
          ? 100
          : clamp(100 - memoryBytes / (50 * 1024 * 1024) * 20, 40, 100);

      const cacheHit = input.profile?.cachePerformance.averageHitRate;
      const cache = cacheHit == null ? 100 : clamp(cacheHit, 0, 100);

      const unregisteredRules = input.rules?.unregisteredCount ?? 0;
      const pipelineFailures = (input.pipelines?.pipelines ?? []).reduce(
        (sum, p) => sum + p.failures,
        0
      );
      const configuration = clamp(
        100 - unregisteredRules * 5 - pipelineFailures * 2,
        0,
        100
      );

      if (registered < 100) warnings.push("Some modules are not registered.");
      if (execution < 70) warnings.push("Execution health is degraded.");
      if (missingDeps > 0) {
        warnings.push(`${missingDeps} rule(s) have unresolved dependencies.`);
      }

      const w = this.config.healthWeights;
      const overall = round2(
        registered * w.registration +
          execution * w.execution +
          dependency * w.dependency +
          runtime * w.runtime +
          memory * w.memory +
          cache * w.cache +
          configuration * w.configuration
      );

      // Normalize if weights don't sum to 1
      const weightSum =
        w.registration +
        w.execution +
        w.dependency +
        w.runtime +
        w.memory +
        w.cache +
        w.configuration;
      const overallHealthScore = round2(
        weightSum === 0 ? overall : overall / weightSum
      );

      const status: DiagnosticsHealthResult["status"] =
        overallHealthScore >= 80
          ? "HEALTHY"
          : overallHealthScore >= 50
            ? "DEGRADED"
            : "CRITICAL";

      if (healthy < 100) {
        warnings.push("One or more engines reported unhealthy status.");
      }

      return {
        breakdown: {
          registrationHealth: round2(registered),
          executionHealth: round2(execution),
          dependencyHealth: round2(dependency),
          runtimeHealth: round2(runtime),
          memoryHealth: round2(memory),
          cacheHealth: round2(cache),
          configurationHealth: round2(configuration),
          overallHealthScore,
        },
        status,
        warnings,
        errors,
        evaluatedAt: new Date().toISOString(),
      };
    } catch (err) {
      errors.push(`Health evaluation failed: ${String(err)}`);
      return {
        breakdown: {
          registrationHealth: 0,
          executionHealth: 0,
          dependencyHealth: 0,
          runtimeHealth: 0,
          memoryHealth: 0,
          cacheHealth: 0,
          configurationHealth: 0,
          overallHealthScore: 0,
        },
        status: "CRITICAL",
        warnings,
        errors,
        evaluatedAt: new Date().toISOString(),
      };
    }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
