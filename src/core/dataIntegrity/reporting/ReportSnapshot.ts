/**
 * Report snapshots with compare and version history.
 */

import type { InstitutionalReport } from "./ReportBuilder";

export interface ReportSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  report: InstitutionalReport;
}

export interface ReportSnapshotComparison {
  baselineId: string;
  compareId: string;
  healthDelta: number;
  trustDelta: number;
  integrityDelta: number;
  validationScoreDelta: number;
  moduleCountDelta: number;
}

export function createReportSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `report:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareReportSnapshots(
  baseline: ReportSnapshot,
  compare: ReportSnapshot
): ReportSnapshotComparison {
  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    healthDelta: round2(
      compare.report.summary.overallHealth - baseline.report.summary.overallHealth
    ),
    trustDelta: round2(
      compare.report.summary.trustScore - baseline.report.summary.trustScore
    ),
    integrityDelta: round2(
      compare.report.summary.integrityScore -
        baseline.report.summary.integrityScore
    ),
    validationScoreDelta: round2(
      compare.report.summary.overallValidationScore -
        baseline.report.summary.overallValidationScore
    ),
    moduleCountDelta:
      compare.report.moduleScores.length - baseline.report.moduleScores.length,
  };
}

export class ReportSnapshotStore {
  private readonly snapshots = new Map<string, ReportSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(
    report: InstitutionalReport,
    label?: string
  ): ReportSnapshot {
    this.versionSeq += 1;
    const snapshot: ReportSnapshot = {
      snapshotId: createReportSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      report,
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return snapshot;
  }

  load(snapshotId: string): ReportSnapshot | null {
    return this.snapshots.get(snapshotId) ?? null;
  }

  list(): ReportSnapshot[] {
    return [...this.snapshots.values()].sort(
      (a, b) => a.version - b.version
    );
  }

  clear(): void {
    this.snapshots.clear();
    this.versionSeq = 0;
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
