/**
 * Operational metrics for the Earnings Quality Engine.
 */

export interface QualityOperationalMetrics {
  analyses: number;
  issuesDetected: number;
  snapshots: number;
  averageScore: number;
  averageRuntimeMs: number;
  errors: number;
  lastAnalysisAt: string | null;
}

export class QualityMetricsTracker {
  private analyses = 0;
  private issuesDetected = 0;
  private snapshots = 0;
  private scoreSum = 0;
  private scoreCount = 0;
  private runtimeSum = 0;
  private runtimeCount = 0;
  private errors = 0;
  private lastAnalysisAt: string | null = null;

  recordAnalysis(input: {
    score: number;
    issueCount: number;
    runtimeMs: number;
  }): void {
    this.analyses += 1;
    this.issuesDetected += input.issueCount;
    this.scoreSum += input.score;
    this.scoreCount += 1;
    this.runtimeSum += input.runtimeMs;
    this.runtimeCount += 1;
    this.lastAnalysisAt = new Date().toISOString();
  }

  recordSnapshot(): void {
    this.snapshots += 1;
  }

  recordError(): void {
    this.errors += 1;
  }

  getMetrics(): QualityOperationalMetrics {
    return {
      analyses: this.analyses,
      issuesDetected: this.issuesDetected,
      snapshots: this.snapshots,
      averageScore:
        this.scoreCount === 0 ? 0 : round2(this.scoreSum / this.scoreCount),
      averageRuntimeMs:
        this.runtimeCount === 0
          ? 0
          : round2(this.runtimeSum / this.runtimeCount),
      errors: this.errors,
      lastAnalysisAt: this.lastAnalysisAt,
    };
  }

  reset(): void {
    this.analyses = 0;
    this.issuesDetected = 0;
    this.snapshots = 0;
    this.scoreSum = 0;
    this.scoreCount = 0;
    this.runtimeSum = 0;
    this.runtimeCount = 0;
    this.errors = 0;
    this.lastAnalysisAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
