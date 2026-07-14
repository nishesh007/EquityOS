/**
 * Operational metrics for the analytics engine itself.
 */

export interface AnalyticsOperationalMetrics {
  analyticsRuns: number;
  predictionAccuracy: number;
  averageRuntime: number;
  snapshotCount: number;
  trendCount: number;
  ruleCount: number;
  healthScore: number;
  lastRunAt: string | null;
}

export class AnalyticsMetricsTracker {
  private analyticsRuns = 0;
  private runtimeSum = 0;
  private snapshotCount = 0;
  private trendCount = 0;
  private ruleCount = 0;
  private healthScore = 0;
  private predictionHits = 0;
  private predictionTotal = 0;
  private lastRunAt: string | null = null;

  recordRun(input: {
    runtimeMs: number;
    healthScore: number;
    trendCount: number;
    ruleCount: number;
  }): void {
    this.analyticsRuns += 1;
    this.runtimeSum += input.runtimeMs;
    this.healthScore = input.healthScore;
    this.trendCount = input.trendCount;
    this.ruleCount = input.ruleCount;
    this.lastRunAt = new Date().toISOString();
  }

  recordPredictionOutcome(correct: boolean): void {
    this.predictionTotal += 1;
    if (correct) this.predictionHits += 1;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): AnalyticsOperationalMetrics {
    return {
      analyticsRuns: this.analyticsRuns,
      predictionAccuracy:
        this.predictionTotal === 0
          ? 0
          : round2((this.predictionHits / this.predictionTotal) * 100),
      averageRuntime:
        this.analyticsRuns === 0
          ? 0
          : round2(this.runtimeSum / this.analyticsRuns),
      snapshotCount: this.snapshotCount,
      trendCount: this.trendCount,
      ruleCount: this.ruleCount,
      healthScore: this.healthScore,
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.analyticsRuns = 0;
    this.runtimeSum = 0;
    this.snapshotCount = 0;
    this.trendCount = 0;
    this.ruleCount = 0;
    this.healthScore = 0;
    this.predictionHits = 0;
    this.predictionTotal = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
