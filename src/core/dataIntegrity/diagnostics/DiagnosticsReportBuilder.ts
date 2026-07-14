/**
 * Structured diagnostics report builder.
 */

import type {
  DiagnosticsMode,
  DiagnosticsReportType,
} from "./DiagnosticsConfiguration";
import type { DiagnosticsHealthResult } from "./DiagnosticsHealthChecker";
import type { ModuleInspectionResult } from "./DiagnosticsInspector";
import type { RuleInspectionResult } from "./DiagnosticsRuleInspector";
import type { PipelineInspectionResult } from "./DiagnosticsPipelineInspector";
import type { ProfileResult } from "./DiagnosticsProfiler";
import type { DiagnosticsTrace } from "./DiagnosticsTracer";
import type { DiagnosticsSnapshotComparison } from "./DiagnosticsSnapshot";

export interface DiagnosticsReport {
  reportId: string;
  reportType: DiagnosticsReportType;
  mode: DiagnosticsMode;
  generatedAt: string;
  summary: {
    overallHealthScore: number;
    healthStatus: string;
    engineCount: number;
    ruleCount: number;
    pipelineCount: number;
    traceCount: number;
    slowRuleCount: number;
    slowPipelineCount: number;
    regressionDetected: boolean;
  };
  health: DiagnosticsHealthResult | null;
  modules: ModuleInspectionResult | null;
  rules: RuleInspectionResult | null;
  pipelines: PipelineInspectionResult | null;
  profile: ProfileResult | null;
  traces: DiagnosticsTrace[];
  regression: DiagnosticsSnapshotComparison | null;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  engineVersion: string;
  partial: boolean;
}

export class DiagnosticsReportBuilder {
  build(input: {
    reportType: DiagnosticsReportType;
    mode: DiagnosticsMode;
    health?: DiagnosticsHealthResult | null;
    modules?: ModuleInspectionResult | null;
    rules?: RuleInspectionResult | null;
    pipelines?: PipelineInspectionResult | null;
    profile?: ProfileResult | null;
    traces?: DiagnosticsTrace[];
    regression?: DiagnosticsSnapshotComparison | null;
    warnings?: string[];
    errors?: string[];
    engineVersion: string;
  }): DiagnosticsReport {
    const warnings = [...(input.warnings ?? [])];
    const errors = [...(input.errors ?? [])];
    const recommendations: string[] = [];

    const health = input.health ?? null;
    const modules = input.modules ?? null;
    const rules = input.rules ?? null;
    const pipelines = input.pipelines ?? null;
    const profile = input.profile ?? null;
    const traces = [...(input.traces ?? [])];
    const regression = input.regression ?? null;

    if (health && health.breakdown.overallHealthScore < 80) {
      recommendations.push("Investigate degraded engine health components.");
    }
    if ((profile?.slowestRules.length ?? 0) > 0) {
      recommendations.push("Optimize slow rules identified by the profiler.");
    }
    if ((profile?.slowestPipelines.length ?? 0) > 0) {
      recommendations.push("Review slow pipelines for sequential bottlenecks.");
    }
    if (regression?.regressionDetected) {
      recommendations.push(
        ...regression.regressionReasons.map((r) => `Regression: ${r}`)
      );
    }
    if ((rules?.unregisteredCount ?? 0) > 0) {
      recommendations.push("Register missing rules before production use.");
    }

    const partial =
      errors.length > 0 ||
      (modules == null && rules == null && pipelines == null);

    return {
      reportId: createReportId(),
      reportType: input.reportType,
      mode: input.mode,
      generatedAt: new Date().toISOString(),
      summary: {
        overallHealthScore: health?.breakdown.overallHealthScore ?? 0,
        healthStatus: health?.status ?? "UNKNOWN",
        engineCount: modules?.engines.length ?? 0,
        ruleCount: rules?.rules.length ?? 0,
        pipelineCount: pipelines?.pipelines.length ?? 0,
        traceCount: traces.length,
        slowRuleCount: profile?.slowestRules.length ?? 0,
        slowPipelineCount: profile?.slowestPipelines.length ?? 0,
        regressionDetected: regression?.regressionDetected ?? false,
      },
      health,
      modules,
      rules,
      pipelines,
      profile,
      traces,
      regression,
      warnings,
      errors,
      recommendations,
      engineVersion: input.engineVersion,
      partial,
    };
  }
}

function createReportId(): string {
  return `diag-rpt:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`;
}
