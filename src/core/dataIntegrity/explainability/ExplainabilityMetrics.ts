/**
 * Operational metrics for the explainability engine.
 */

export interface ExplainabilityHealthScore {
  traceCompleteness: number;
  ruleCoverage: number;
  confidenceCoverage: number;
  explanationQuality: number;
  dependencyVisibility: number;
  auditCompleteness: number;
  overall: number;
}

export interface ExplainabilityOperationalMetrics {
  generatedExplanations: number;
  decisionTraces: number;
  ruleCoverage: number;
  confidenceCoverage: number;
  averageExplanationTime: number;
  explainabilityHealthScore: number;
  snapshotCount: number;
  lastRunAt: string | null;
}

export class ExplainabilityMetricsTracker {
  private generatedExplanations = 0;
  private decisionTraces = 0;
  private ruleCoverage = 0;
  private confidenceCoverage = 0;
  private explainabilityHealthScore = 0;
  private explanationTimeSum = 0;
  private explanationCount = 0;
  private snapshotCount = 0;
  private lastRunAt: string | null = null;

  recordTrace(input: {
    ruleCoverage: number;
    confidenceCoverage: number;
    healthScore: number;
  }): void {
    this.decisionTraces += 1;
    this.ruleCoverage = input.ruleCoverage;
    this.confidenceCoverage = input.confidenceCoverage;
    this.explainabilityHealthScore = input.healthScore;
    this.lastRunAt = new Date().toISOString();
  }

  recordExplanation(input: {
    runtimeMs: number;
    healthScore?: number;
  }): void {
    this.generatedExplanations += 1;
    this.explanationTimeSum += input.runtimeMs;
    this.explanationCount += 1;
    if (input.healthScore !== undefined) {
      this.explainabilityHealthScore = input.healthScore;
    }
    this.lastRunAt = new Date().toISOString();
  }

  setHealthScore(score: number): void {
    this.explainabilityHealthScore = score;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): ExplainabilityOperationalMetrics {
    return {
      generatedExplanations: this.generatedExplanations,
      decisionTraces: this.decisionTraces,
      ruleCoverage: this.ruleCoverage,
      confidenceCoverage: this.confidenceCoverage,
      averageExplanationTime:
        this.explanationCount === 0
          ? 0
          : round2(this.explanationTimeSum / this.explanationCount),
      explainabilityHealthScore: this.explainabilityHealthScore,
      snapshotCount: this.snapshotCount,
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.generatedExplanations = 0;
    this.decisionTraces = 0;
    this.ruleCoverage = 0;
    this.confidenceCoverage = 0;
    this.explainabilityHealthScore = 0;
    this.explanationTimeSum = 0;
    this.explanationCount = 0;
    this.snapshotCount = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
