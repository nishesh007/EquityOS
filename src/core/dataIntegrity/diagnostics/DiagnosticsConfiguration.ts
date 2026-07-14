/**
 * Institutional Validation Diagnostics — configuration.
 * Profiler, tracing, sampling, and retention live here; no magic numbers elsewhere.
 */

export type DiagnosticsMode =
  | "quick"
  | "deep"
  | "pipeline"
  | "rule"
  | "engine"
  | "performance"
  | "memory"
  | "custom";

export type DiagnosticsEnvironment = "development" | "production";

export type DiagnosticsStrictMode = "strict" | "relaxed";

export type DiagnosticsReportType =
  | "DiagnosticsSummary"
  | "PerformanceReport"
  | "HealthReport"
  | "PipelineReport"
  | "RuleReport"
  | "RegressionReport"
  | (string & {});

export interface DiagnosticsHealthWeights {
  registration: number;
  execution: number;
  dependency: number;
  runtime: number;
  memory: number;
  cache: number;
  configuration: number;
}

export interface DiagnosticsConfiguration {
  mode: DiagnosticsStrictMode;
  environment: DiagnosticsEnvironment;
  engineVersion: string;
  profilerEnabled: boolean;
  tracingEnabled: boolean;
  samplingRate: number;
  snapshotRetention: number;
  maxAuditEntries: number;
  maxTraceHistory: number;
  maxProfileSamples: number;
  regressionHealthDropThreshold: number;
  regressionRuntimeIncreasePct: number;
  slowRuleThresholdMs: number;
  slowPipelineThresholdMs: number;
  slowEngineThresholdMs: number;
  healthWeights: DiagnosticsHealthWeights;
  defaultDiagnosticsMode: DiagnosticsMode;
  developmentMode: boolean;
  productionMode: boolean;
}

export const DEFAULT_DIAGNOSTICS_CONFIGURATION: DiagnosticsConfiguration = {
  mode: "strict",
  environment: "development",
  engineVersion: "9F.16.0",
  profilerEnabled: true,
  tracingEnabled: true,
  samplingRate: 1,
  snapshotRetention: 100,
  maxAuditEntries: 500,
  maxTraceHistory: 200,
  maxProfileSamples: 500,
  regressionHealthDropThreshold: 10,
  regressionRuntimeIncreasePct: 50,
  slowRuleThresholdMs: 100,
  slowPipelineThresholdMs: 500,
  slowEngineThresholdMs: 300,
  healthWeights: {
    registration: 0.15,
    execution: 0.2,
    dependency: 0.15,
    runtime: 0.15,
    memory: 0.1,
    cache: 0.1,
    configuration: 0.15,
  },
  defaultDiagnosticsMode: "quick",
  developmentMode: true,
  productionMode: false,
};

export type DiagnosticsConfigurationInput = Partial<
  Omit<DiagnosticsConfiguration, "healthWeights">
> & {
  healthWeights?: Partial<DiagnosticsHealthWeights>;
};

export function resolveDiagnosticsConfiguration(
  input?: DiagnosticsConfigurationInput
): DiagnosticsConfiguration {
  const base = DEFAULT_DIAGNOSTICS_CONFIGURATION;
  const env =
    input?.environment ??
    (input?.productionMode
      ? "production"
      : input?.developmentMode === false
        ? "production"
        : base.environment);

  const developmentMode =
    input?.developmentMode ?? (env === "development");
  const productionMode = input?.productionMode ?? (env === "production");

  return {
    ...base,
    ...input,
    environment: env,
    developmentMode,
    productionMode,
    healthWeights: {
      ...base.healthWeights,
      ...input?.healthWeights,
    },
    samplingRate: clamp(
      input?.samplingRate ?? base.samplingRate,
      0,
      1
    ),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
