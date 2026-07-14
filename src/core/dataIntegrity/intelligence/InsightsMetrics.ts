/**
 * Operational metrics for the intelligence engine.
 */

export interface InsightsOperationalMetrics {
  insightsGenerated: number;
  patternsDetected: number;
  correlationsFound: number;
  recommendationsGenerated: number;
  averageConfidence: number;
  insightScore: number;
  snapshotCount: number;
  averageRuntime: number;
  lastRunAt: string | null;
}

export class InsightsMetricsTracker {
  private insightsGenerated = 0;
  private patternsDetected = 0;
  private correlationsFound = 0;
  private recommendationsGenerated = 0;
  private confidenceSum = 0;
  private confidenceCount = 0;
  private insightScore = 0;
  private snapshotCount = 0;
  private runtimeSum = 0;
  private lastRunAt: string | null = null;

  recordRun(input: {
    runtimeMs: number;
    patterns: number;
    correlations: number;
    recommendations: number;
    insightScore: number;
    averageConfidence: number;
  }): void {
    this.insightsGenerated += 1;
    this.patternsDetected += input.patterns;
    this.correlationsFound += input.correlations;
    this.recommendationsGenerated += input.recommendations;
    this.insightScore = input.insightScore;
    this.runtimeSum += input.runtimeMs;
    this.confidenceSum += input.averageConfidence;
    this.confidenceCount += 1;
    this.lastRunAt = new Date().toISOString();
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): InsightsOperationalMetrics {
    return {
      insightsGenerated: this.insightsGenerated,
      patternsDetected: this.patternsDetected,
      correlationsFound: this.correlationsFound,
      recommendationsGenerated: this.recommendationsGenerated,
      averageConfidence:
        this.confidenceCount === 0
          ? 0
          : round2(this.confidenceSum / this.confidenceCount),
      insightScore: this.insightScore,
      snapshotCount: this.snapshotCount,
      averageRuntime:
        this.insightsGenerated === 0
          ? 0
          : round2(this.runtimeSum / this.insightsGenerated),
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.insightsGenerated = 0;
    this.patternsDetected = 0;
    this.correlationsFound = 0;
    this.recommendationsGenerated = 0;
    this.confidenceSum = 0;
    this.confidenceCount = 0;
    this.insightScore = 0;
    this.snapshotCount = 0;
    this.runtimeSum = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
