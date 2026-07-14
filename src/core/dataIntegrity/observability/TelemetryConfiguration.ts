/**
 * Institutional Validation Observability — configuration.
 * Sampling, retention, buffers, export formats, and score weights live here; no magic numbers elsewhere.
 */

export type TelemetryStrictMode = "strict" | "relaxed";

export type TelemetryExportFormat =
  | "JSON"
  | "CSV"
  | "OPENTELEMETRY"
  | "PROMETHEUS"
  | (string & {});

export interface ObservabilityScoreWeights {
  telemetryCoverage: number;
  metricsCoverage: number;
  traceCoverage: number;
  eventCoverage: number;
  healthVisibility: number;
  storageReliability: number;
}

export interface TelemetryConfiguration {
  mode: TelemetryStrictMode;
  engineVersion: string;
  samplingRate: number;
  traceDepth: number;
  retentionPeriodMs: number;
  bufferSize: number;
  compressionEnabled: boolean;
  exportFormats: TelemetryExportFormat[];
  snapshotRetention: number;
  maxAuditEntries: number;
  maxDroppedEventLog: number;
  expectedSourceCount: number;
  scoreWeights: ObservabilityScoreWeights;
}

export const DEFAULT_TELEMETRY_CONFIGURATION: TelemetryConfiguration = {
  mode: "strict",
  engineVersion: "9F.20.0",
  samplingRate: 1,
  traceDepth: 32,
  retentionPeriodMs: 3_600_000,
  bufferSize: 5_000,
  compressionEnabled: false,
  exportFormats: ["JSON", "CSV", "OPENTELEMETRY", "PROMETHEUS"],
  snapshotRetention: 100,
  maxAuditEntries: 500,
  maxDroppedEventLog: 200,
  expectedSourceCount: 18,
  scoreWeights: {
    telemetryCoverage: 0.25,
    metricsCoverage: 0.2,
    traceCoverage: 0.2,
    eventCoverage: 0.15,
    healthVisibility: 0.1,
    storageReliability: 0.1,
  },
};

export type TelemetryConfigurationInput = Partial<
  Omit<TelemetryConfiguration, "scoreWeights" | "exportFormats">
> & {
  scoreWeights?: Partial<ObservabilityScoreWeights>;
  exportFormats?: TelemetryExportFormat[];
};

export function resolveTelemetryConfiguration(
  input?: TelemetryConfigurationInput
): TelemetryConfiguration {
  const base = DEFAULT_TELEMETRY_CONFIGURATION;
  return {
    ...base,
    ...input,
    exportFormats: input?.exportFormats
      ? [...input.exportFormats]
      : [...base.exportFormats],
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    samplingRate: clamp(input?.samplingRate ?? base.samplingRate, 0, 1),
    traceDepth: Math.max(1, input?.traceDepth ?? base.traceDepth),
    bufferSize: Math.max(10, input?.bufferSize ?? base.bufferSize),
    retentionPeriodMs: Math.max(
      1_000,
      input?.retentionPeriodMs ?? base.retentionPeriodMs
    ),
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
    expectedSourceCount: Math.max(
      1,
      input?.expectedSourceCount ?? base.expectedSourceCount
    ),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
