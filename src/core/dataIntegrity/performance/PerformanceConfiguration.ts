/**
 * Institutional Validation Performance — configuration.
 * Benchmark mode, sample size, concurrency, retention, and score weights live here.
 */

export type BenchmarkMode =
  | "cold_start"
  | "warm_start"
  | "single"
  | "batch"
  | "pipeline"
  | "module"
  | "snapshot"
  | "regression";

export type PerformanceStrictMode = "strict" | "relaxed";

export interface PerformanceScoreWeights {
  latency: number;
  throughput: number;
  resourceEfficiency: number;
  scalability: number;
  capacityPlanning: number;
  regressionStability: number;
}

export interface PerformanceConfiguration {
  mode: PerformanceStrictMode;
  engineVersion: string;
  benchmarkMode: BenchmarkMode;
  sampleSize: number;
  concurrency: number;
  warmupSamples: number;
  targetLatencyMs: number;
  targetThroughputPerSec: number;
  safetyMarginPct: number;
  snapshotRetention: number;
  auditRetention: number;
  maxAuditEntries: number;
  maxBenchmarks: number;
  institutionalMode: boolean;
  scoreWeights: PerformanceScoreWeights;
}

export const DEFAULT_PERFORMANCE_CONFIGURATION: PerformanceConfiguration = {
  mode: "strict",
  engineVersion: "9F.26.0",
  benchmarkMode: "warm_start",
  sampleSize: 50,
  concurrency: 4,
  warmupSamples: 5,
  targetLatencyMs: 100,
  targetThroughputPerSec: 100,
  safetyMarginPct: 25,
  snapshotRetention: 100,
  auditRetention: 1_000,
  maxAuditEntries: 500,
  maxBenchmarks: 500,
  institutionalMode: true,
  scoreWeights: {
    latency: 0.25,
    throughput: 0.25,
    resourceEfficiency: 0.2,
    scalability: 0.15,
    capacityPlanning: 0.1,
    regressionStability: 0.05,
  },
};

export type PerformanceConfigurationInput = Partial<
  Omit<PerformanceConfiguration, "scoreWeights">
> & {
  scoreWeights?: Partial<PerformanceScoreWeights>;
};

export function resolvePerformanceConfiguration(
  input?: PerformanceConfigurationInput
): PerformanceConfiguration {
  const base = DEFAULT_PERFORMANCE_CONFIGURATION;
  return {
    ...base,
    ...input,
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    sampleSize: Math.max(1, input?.sampleSize ?? base.sampleSize),
    concurrency: Math.max(1, input?.concurrency ?? base.concurrency),
    warmupSamples: Math.max(0, input?.warmupSamples ?? base.warmupSamples),
    targetLatencyMs: Math.max(1, input?.targetLatencyMs ?? base.targetLatencyMs),
    targetThroughputPerSec: Math.max(
      1,
      input?.targetThroughputPerSec ?? base.targetThroughputPerSec
    ),
    safetyMarginPct: Math.max(
      0,
      input?.safetyMarginPct ?? base.safetyMarginPct
    ),
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    auditRetention: Math.max(1, input?.auditRetention ?? base.auditRetention),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
    maxBenchmarks: Math.max(1, input?.maxBenchmarks ?? base.maxBenchmarks),
  };
}
