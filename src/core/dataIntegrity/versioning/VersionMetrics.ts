/**
 * Operational metrics for the versioning engine.
 */

export interface VersionOperationalMetrics {
  versions: number;
  migrations: number;
  compatibilityChecks: number;
  rollbackPlans: number;
  schemaChanges: number;
  versionHealthScore: number;
  averageValidationTime: number;
  snapshotCount: number;
  lastRunAt: string | null;
}

export class VersionMetricsTracker {
  private versions = 0;
  private migrations = 0;
  private compatibilityChecks = 0;
  private rollbackPlans = 0;
  private schemaChanges = 0;
  private versionHealthScore = 0;
  private validationTimeSum = 0;
  private validationCount = 0;
  private snapshotCount = 0;
  private lastRunAt: string | null = null;

  setVersionCount(n: number): void {
    this.versions = n;
  }

  recordMigration(input: {
    schemaChanges: number;
    rollbackPlans: number;
    healthScore: number;
    validationTimeMs: number;
  }): void {
    this.migrations += 1;
    this.schemaChanges += input.schemaChanges;
    this.rollbackPlans += input.rollbackPlans;
    this.versionHealthScore = input.healthScore;
    this.validationTimeSum += input.validationTimeMs;
    this.validationCount += 1;
    this.lastRunAt = new Date().toISOString();
  }

  recordCompatibilityCheck(): void {
    this.compatibilityChecks += 1;
    this.lastRunAt = new Date().toISOString();
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): VersionOperationalMetrics {
    return {
      versions: this.versions,
      migrations: this.migrations,
      compatibilityChecks: this.compatibilityChecks,
      rollbackPlans: this.rollbackPlans,
      schemaChanges: this.schemaChanges,
      versionHealthScore: this.versionHealthScore,
      averageValidationTime:
        this.validationCount === 0
          ? 0
          : round2(this.validationTimeSum / this.validationCount),
      snapshotCount: this.snapshotCount,
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.versions = 0;
    this.migrations = 0;
    this.compatibilityChecks = 0;
    this.rollbackPlans = 0;
    this.schemaChanges = 0;
    this.versionHealthScore = 0;
    this.validationTimeSum = 0;
    this.validationCount = 0;
    this.snapshotCount = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
