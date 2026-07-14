/**
 * Point-in-time Validation Dashboard snapshots with compare support.
 */

import type { DashboardSummary } from "./DashboardSummary";
import type { DashboardTrendAnalysis } from "./DashboardTrendAnalyzer";
import type { ValidationDistribution } from "./DashboardAggregator";
import type { TopFailuresReport } from "./DashboardAggregator";

export interface DashboardSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  summary: DashboardSummary;
  distribution: ValidationDistribution;
  topFailures: TopFailuresReport;
  trend: DashboardTrendAnalysis | null;
  engineVersion: string;
}

export interface DashboardSnapshotComparison {
  baselineId: string;
  compareId: string;
  healthDelta: number;
  integrityDelta: number;
  trustDelta: number;
  validationCountDelta: number;
  failedValidationsDelta: number;
  moduleHealthDeltas: Record<string, number>;
}

export function createDashboardSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `dashboard:${timestamp}`;
}

export function compareDashboardSnapshots(
  baseline: DashboardSnapshot,
  compare: DashboardSnapshot
): DashboardSnapshotComparison {
  const moduleHealthDeltas: Record<string, number> = {};
  const baselineModules = new Map(
    baseline.summary.modules.map((m) => [m.moduleId, m.averageScore])
  );
  for (const mod of compare.summary.modules) {
    const prev = baselineModules.get(mod.moduleId) ?? 0;
    moduleHealthDeltas[mod.moduleId] = round2(mod.averageScore - prev);
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    healthDelta: round2(
      compare.summary.health.overallHealthScore -
        baseline.summary.health.overallHealthScore
    ),
    integrityDelta: round2(
      compare.summary.summary.averageIntegrityScore -
        baseline.summary.summary.averageIntegrityScore
    ),
    trustDelta: round2(
      compare.summary.summary.averageTrustScore -
        baseline.summary.summary.averageTrustScore
    ),
    validationCountDelta:
      compare.summary.summary.totalValidations -
      baseline.summary.summary.totalValidations,
    failedValidationsDelta:
      compare.summary.summary.failedValidations -
      baseline.summary.summary.failedValidations,
    moduleHealthDeltas,
  };
}

export class DashboardSnapshotStore {
  private readonly snapshots = new Map<string, DashboardSnapshot>();
  private retention: number;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(snapshot: DashboardSnapshot): DashboardSnapshot {
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return snapshot;
  }

  load(snapshotId: string): DashboardSnapshot | null {
    return this.snapshots.get(snapshotId) ?? null;
  }

  list(): DashboardSnapshot[] {
    return [...this.snapshots.values()].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );
  }

  clear(): void {
    this.snapshots.clear();
  }

  get size(): number {
    return this.snapshots.size;
  }

  private enforceRetention(): void {
    const all = this.list();
    if (all.length <= this.retention) return;
    const overflow = all.length - this.retention;
    for (let i = 0; i < overflow; i++) {
      this.snapshots.delete(all[i]!.snapshotId);
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
