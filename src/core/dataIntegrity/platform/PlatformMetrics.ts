/**
 * Platform metrics tracker.
 */

export interface PlatformOperationalMetrics {
  initialized: boolean;
  enginesRegistered: number;
  enginesRequired: number;
  certificationRuns: number;
  overallHealthScore: number;
  overallRisk: number;
  averageRuntimeMs: number;
  snapshotCount: number;
  lastRunAt: string | null;
}

export class PlatformMetricsTracker {
  private initialized = false;
  private enginesRegistered = 0;
  private enginesRequired = 0;
  private certificationRuns = 0;
  private overallHealthScore = 0;
  private overallRisk = 0;
  private runtimeSum = 0;
  private runtimeCount = 0;
  private snapshotCount = 0;
  private lastRunAt: string | null = null;

  setInitialized(value: boolean): void {
    this.initialized = value;
  }

  setEngineCounts(registered: number, required: number): void {
    this.enginesRegistered = registered;
    this.enginesRequired = required;
  }

  recordCertification(input: {
    healthScore: number;
    risk: number;
    runtimeMs: number;
  }): void {
    this.certificationRuns += 1;
    this.overallHealthScore = input.healthScore;
    this.overallRisk = input.risk;
    this.runtimeSum += input.runtimeMs;
    this.runtimeCount += 1;
    this.lastRunAt = new Date().toISOString();
  }

  setHealthScore(score: number): void {
    this.overallHealthScore = score;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): PlatformOperationalMetrics {
    return {
      initialized: this.initialized,
      enginesRegistered: this.enginesRegistered,
      enginesRequired: this.enginesRequired,
      certificationRuns: this.certificationRuns,
      overallHealthScore: this.overallHealthScore,
      overallRisk: this.overallRisk,
      averageRuntimeMs:
        this.runtimeCount === 0
          ? 0
          : round2(this.runtimeSum / this.runtimeCount),
      snapshotCount: this.snapshotCount,
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.initialized = false;
    this.enginesRegistered = 0;
    this.enginesRequired = 0;
    this.certificationRuns = 0;
    this.overallHealthScore = 0;
    this.overallRisk = 0;
    this.runtimeSum = 0;
    this.runtimeCount = 0;
    this.snapshotCount = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
