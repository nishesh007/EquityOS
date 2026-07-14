/**
 * Operational metrics for the release certification engine.
 */

export interface ReleaseHealthScore {
  health: number;
  testing: number;
  security: number;
  compliance: number;
  performance: number;
  reliability: number;
  operationalReadiness: number;
  overall: number;
}

export interface ReleaseOperationalMetrics {
  certificationRuns: number;
  releaseScore: number;
  deploymentRisks: number;
  rollbackReadiness: number;
  checklistCompletion: number;
  averageRuntimeMs: number;
  snapshotCount: number;
  lastRunAt: string | null;
}

export class ReleaseMetricsTracker {
  private certificationRuns = 0;
  private releaseScore = 0;
  private deploymentRisks = 0;
  private rollbackReadiness = 0;
  private checklistCompletion = 0;
  private runtimeSum = 0;
  private runtimeCount = 0;
  private snapshotCount = 0;
  private lastRunAt: string | null = null;

  recordCertification(input: {
    releaseScore: number;
    deploymentRisks: number;
    rollbackReadiness: number;
    checklistCompletion: number;
    runtimeMs: number;
  }): void {
    this.certificationRuns += 1;
    this.releaseScore = input.releaseScore;
    this.deploymentRisks = input.deploymentRisks;
    this.rollbackReadiness = input.rollbackReadiness;
    this.checklistCompletion = input.checklistCompletion;
    this.runtimeSum += input.runtimeMs;
    this.runtimeCount += 1;
    this.lastRunAt = new Date().toISOString();
  }

  setReleaseScore(score: number): void {
    this.releaseScore = score;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): ReleaseOperationalMetrics {
    return {
      certificationRuns: this.certificationRuns,
      releaseScore: this.releaseScore,
      deploymentRisks: this.deploymentRisks,
      rollbackReadiness: this.rollbackReadiness,
      checklistCompletion: this.checklistCompletion,
      averageRuntimeMs:
        this.runtimeCount === 0
          ? 0
          : round2(this.runtimeSum / this.runtimeCount),
      snapshotCount: this.snapshotCount,
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.certificationRuns = 0;
    this.releaseScore = 0;
    this.deploymentRisks = 0;
    this.rollbackReadiness = 0;
    this.checklistCompletion = 0;
    this.runtimeSum = 0;
    this.runtimeCount = 0;
    this.snapshotCount = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
