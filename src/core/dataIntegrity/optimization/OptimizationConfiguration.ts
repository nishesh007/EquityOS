/**
 * Institutional Validation Optimization — configuration.
 * Modes, sampling, cache/parallel limits, and score weights live here; no magic numbers elsewhere.
 */

export type OptimizationStrictMode = "strict" | "relaxed";

export type OptimizationMode =
  | "quick"
  | "deep"
  | "pipeline"
  | "cache"
  | "dependency"
  | "performance"
  | "full"
  | "custom";

export type RecommendationMode = "advisory" | "suggest" | "silent";

export interface OptimizationScoreWeights {
  pipelineEfficiency: number;
  cacheEfficiency: number;
  executionSpeed: number;
  memoryEfficiency: number;
  dependencyHealth: number;
  automationOpportunities: number;
}

export interface OptimizationConfiguration {
  mode: OptimizationStrictMode;
  engineVersion: string;
  optimizationMode: OptimizationMode;
  samplingRate: number;
  cacheHitTargetPct: number;
  cacheMaxEntries: number;
  cacheDefaultTtlMs: number;
  parallelMaxConcurrency: number;
  slowRuleThresholdMs: number;
  slowPipelineThresholdMs: number;
  slowModuleThresholdMs: number;
  highMemoryThresholdBytes: number;
  retryFrequencyThreshold: number;
  queueCongestionThreshold: number;
  regressionScoreDropThreshold: number;
  regressionRuntimeIncreasePct: number;
  snapshotRetention: number;
  maxAuditEntries: number;
  maxRecommendations: number;
  recommendationMode: RecommendationMode;
  scoreWeights: OptimizationScoreWeights;
}

export const DEFAULT_OPTIMIZATION_CONFIGURATION: OptimizationConfiguration = {
  mode: "strict",
  engineVersion: "9F.18.0",
  optimizationMode: "full",
  samplingRate: 1,
  cacheHitTargetPct: 80,
  cacheMaxEntries: 10_000,
  cacheDefaultTtlMs: 60_000,
  parallelMaxConcurrency: 8,
  slowRuleThresholdMs: 100,
  slowPipelineThresholdMs: 500,
  slowModuleThresholdMs: 300,
  highMemoryThresholdBytes: 50 * 1024 * 1024,
  retryFrequencyThreshold: 5,
  queueCongestionThreshold: 100,
  regressionScoreDropThreshold: 10,
  regressionRuntimeIncreasePct: 50,
  snapshotRetention: 100,
  maxAuditEntries: 500,
  maxRecommendations: 50,
  recommendationMode: "advisory",
  scoreWeights: {
    pipelineEfficiency: 0.25,
    cacheEfficiency: 0.2,
    executionSpeed: 0.2,
    memoryEfficiency: 0.15,
    dependencyHealth: 0.1,
    automationOpportunities: 0.1,
  },
};

export type OptimizationConfigurationInput = Partial<
  Omit<OptimizationConfiguration, "scoreWeights">
> & {
  scoreWeights?: Partial<OptimizationScoreWeights>;
};

export function resolveOptimizationConfiguration(
  input?: OptimizationConfigurationInput
): OptimizationConfiguration {
  const base = DEFAULT_OPTIMIZATION_CONFIGURATION;
  return {
    ...base,
    ...input,
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    samplingRate: clamp(input?.samplingRate ?? base.samplingRate, 0, 1),
    cacheHitTargetPct: clamp(
      input?.cacheHitTargetPct ?? base.cacheHitTargetPct,
      0,
      100
    ),
    parallelMaxConcurrency: Math.max(
      1,
      input?.parallelMaxConcurrency ?? base.parallelMaxConcurrency
    ),
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
    maxRecommendations: Math.max(
      1,
      input?.maxRecommendations ?? base.maxRecommendations
    ),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
