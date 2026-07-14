/**
 * Operational metrics for the learning engine.
 */

export interface LearningHealthScore {
  patternCoverage: number;
  feedbackCoverage: number;
  trendDetection: number;
  recommendationQuality: number;
  regressionLearning: number;
  auditCompleteness: number;
  overall: number;
}

export interface LearningOperationalMetrics {
  learningRuns: number;
  patternsFound: number;
  feedbackRecords: number;
  generatedImprovements: number;
  learningHealthScore: number;
  averageRuntimeMs: number;
  snapshotCount: number;
  lastRunAt: string | null;
}

export class LearningMetricsTracker {
  private learningRuns = 0;
  private patternsFound = 0;
  private feedbackRecords = 0;
  private generatedImprovements = 0;
  private learningHealthScore = 0;
  private runtimeSum = 0;
  private runtimeCount = 0;
  private snapshotCount = 0;
  private lastRunAt: string | null = null;

  recordLearningRun(input: {
    patternsFound: number;
    improvements: number;
    runtimeMs: number;
    healthScore?: number;
  }): void {
    this.learningRuns += 1;
    this.patternsFound = input.patternsFound;
    this.generatedImprovements = input.improvements;
    this.runtimeSum += input.runtimeMs;
    this.runtimeCount += 1;
    if (input.healthScore !== undefined) {
      this.learningHealthScore = input.healthScore;
    }
    this.lastRunAt = new Date().toISOString();
  }

  setFeedbackCount(n: number): void {
    this.feedbackRecords = n;
  }

  setHealthScore(score: number): void {
    this.learningHealthScore = score;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): LearningOperationalMetrics {
    return {
      learningRuns: this.learningRuns,
      patternsFound: this.patternsFound,
      feedbackRecords: this.feedbackRecords,
      generatedImprovements: this.generatedImprovements,
      learningHealthScore: this.learningHealthScore,
      averageRuntimeMs:
        this.runtimeCount === 0
          ? 0
          : round2(this.runtimeSum / this.runtimeCount),
      snapshotCount: this.snapshotCount,
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.learningRuns = 0;
    this.patternsFound = 0;
    this.feedbackRecords = 0;
    this.generatedImprovements = 0;
    this.learningHealthScore = 0;
    this.runtimeSum = 0;
    this.runtimeCount = 0;
    this.snapshotCount = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
