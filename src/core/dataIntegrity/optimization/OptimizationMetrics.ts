/**
 * Operational metrics for the optimization engine.
 */

export interface OptimizationOperationalMetrics {
  optimizationRuns: number;
  optimizationScore: number;
  averageRuntime: number;
  lastRuntime: number;
  averageCacheHit: number | null;
  memorySavings: number;
  pipelineImprovements: number;
  recommendationCount: number;
  snapshotCount: number;
  lastRunAt: string | null;
}

export class OptimizationMetricsTracker {
  private optimizationRuns = 0;
  private optimizationScore = 0;
  private runtimeSum = 0;
  private lastRuntime = 0;
  private cacheHitSum = 0;
  private cacheHitSamples = 0;
  private memorySavings = 0;
  private pipelineImprovements = 0;
  private recommendationCount = 0;
  private snapshotCount = 0;
  private lastRunAt: string | null = null;

  recordRun(input: {
    runtimeMs: number;
    optimizationScore: number;
    cacheHitRate?: number | null;
    recommendationCount: number;
    pipelineImprovements?: number;
    memorySavingsEstimate?: number;
  }): void {
    this.optimizationRuns += 1;
    this.runtimeSum += input.runtimeMs;
    this.lastRuntime = input.runtimeMs;
    this.optimizationScore = input.optimizationScore;
    this.recommendationCount += input.recommendationCount;
    if (input.pipelineImprovements != null) {
      this.pipelineImprovements += input.pipelineImprovements;
    }
    if (input.memorySavingsEstimate != null) {
      this.memorySavings += input.memorySavingsEstimate;
    }
    if (input.cacheHitRate != null) {
      this.cacheHitSum += input.cacheHitRate;
      this.cacheHitSamples += 1;
    }
    this.lastRunAt = new Date().toISOString();
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): OptimizationOperationalMetrics {
    return {
      optimizationRuns: this.optimizationRuns,
      optimizationScore: this.optimizationScore,
      averageRuntime:
        this.optimizationRuns === 0
          ? 0
          : round2(this.runtimeSum / this.optimizationRuns),
      lastRuntime: this.lastRuntime,
      averageCacheHit:
        this.cacheHitSamples === 0
          ? null
          : round2(this.cacheHitSum / this.cacheHitSamples),
      memorySavings: this.memorySavings,
      pipelineImprovements: this.pipelineImprovements,
      recommendationCount: this.recommendationCount,
      snapshotCount: this.snapshotCount,
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.optimizationRuns = 0;
    this.optimizationScore = 0;
    this.runtimeSum = 0;
    this.lastRuntime = 0;
    this.cacheHitSum = 0;
    this.cacheHitSamples = 0;
    this.memorySavings = 0;
    this.pipelineImprovements = 0;
    this.recommendationCount = 0;
    this.snapshotCount = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
