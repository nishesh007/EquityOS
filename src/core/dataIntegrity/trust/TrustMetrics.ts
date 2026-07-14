/**
 * Rolling Institutional Trust Score metrics.
 */

export interface TrustMetricsSnapshot {
  averageTrustScore: number;
  highestTrustScore: number;
  lowestTrustScore: number;
  averageTrend: number;
  trustDistribution: Record<string, number>;
  rejectedObjects: number;
  validationRuntime: number;
  averageValidationRuntime: number;
  totalCalculations: number;
}

export interface TrustErrorReport {
  module: string;
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  trustImpact: number;
  previousScore: number | null;
  currentScore: number;
  suggestedAction: string;
}

export class TrustMetricsTracker {
  private totalCalculations = 0;
  private scoreSum = 0;
  private highestTrustScore = 0;
  private lowestTrustScore = 100;
  private trendSum = 0;
  private trendCount = 0;
  private rejectedObjects = 0;
  private validationRuntime = 0;
  private trustDistribution: Record<string, number> = {};

  record(input: {
    score: number;
    classification: string;
    rejected: boolean;
    trendDelta: number | null;
    runtimeMs: number;
  }): void {
    this.totalCalculations += 1;
    this.scoreSum += input.score;
    this.highestTrustScore = Math.max(this.highestTrustScore, input.score);
    this.lowestTrustScore =
      this.totalCalculations === 1
        ? input.score
        : Math.min(this.lowestTrustScore, input.score);
    if (input.trendDelta !== null && Number.isFinite(input.trendDelta)) {
      this.trendSum += input.trendDelta;
      this.trendCount += 1;
    }
    if (input.rejected) this.rejectedObjects += 1;
    this.validationRuntime += input.runtimeMs;
    this.trustDistribution[input.classification] =
      (this.trustDistribution[input.classification] ?? 0) + 1;
  }

  getMetrics(): TrustMetricsSnapshot {
    const total = this.totalCalculations;
    return {
      averageTrustScore: total === 0 ? 0 : round2(this.scoreSum / total),
      highestTrustScore: total === 0 ? 0 : this.highestTrustScore,
      lowestTrustScore: total === 0 ? 0 : this.lowestTrustScore,
      averageTrend:
        this.trendCount === 0 ? 0 : round2(this.trendSum / this.trendCount),
      trustDistribution: { ...this.trustDistribution },
      rejectedObjects: this.rejectedObjects,
      validationRuntime: round2(this.validationRuntime),
      averageValidationRuntime:
        total === 0 ? 0 : round2(this.validationRuntime / total),
      totalCalculations: total,
    };
  }

  reset(): void {
    this.totalCalculations = 0;
    this.scoreSum = 0;
    this.highestTrustScore = 0;
    this.lowestTrustScore = 100;
    this.trendSum = 0;
    this.trendCount = 0;
    this.rejectedObjects = 0;
    this.validationRuntime = 0;
    this.trustDistribution = {};
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
