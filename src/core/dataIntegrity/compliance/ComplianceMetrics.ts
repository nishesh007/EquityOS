/**
 * Operational metrics for the compliance engine.
 */

export interface ComplianceOperationalMetrics {
  complianceRuns: number;
  violations: number;
  criticalViolations: number;
  policyCoverage: number;
  auditCoverage: number;
  complianceScore: number;
  snapshotCount: number;
  averageRuntime: number;
  lastRunAt: string | null;
}

export class ComplianceMetricsTracker {
  private complianceRuns = 0;
  private violations = 0;
  private criticalViolations = 0;
  private policyCoverage = 0;
  private auditCoverage = 0;
  private complianceScore = 0;
  private snapshotCount = 0;
  private runtimeSum = 0;
  private lastRunAt: string | null = null;

  recordRun(input: {
    runtimeMs: number;
    violations: number;
    criticalViolations: number;
    policyCoverage: number;
    auditCoverage: number;
    complianceScore: number;
  }): void {
    this.complianceRuns += 1;
    this.violations += input.violations;
    this.criticalViolations += input.criticalViolations;
    this.policyCoverage = input.policyCoverage;
    this.auditCoverage = input.auditCoverage;
    this.complianceScore = input.complianceScore;
    this.runtimeSum += input.runtimeMs;
    this.lastRunAt = new Date().toISOString();
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): ComplianceOperationalMetrics {
    return {
      complianceRuns: this.complianceRuns,
      violations: this.violations,
      criticalViolations: this.criticalViolations,
      policyCoverage: this.policyCoverage,
      auditCoverage: this.auditCoverage,
      complianceScore: this.complianceScore,
      snapshotCount: this.snapshotCount,
      averageRuntime:
        this.complianceRuns === 0
          ? 0
          : round2(this.runtimeSum / this.complianceRuns),
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.complianceRuns = 0;
    this.violations = 0;
    this.criticalViolations = 0;
    this.policyCoverage = 0;
    this.auditCoverage = 0;
    this.complianceScore = 0;
    this.snapshotCount = 0;
    this.runtimeSum = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
