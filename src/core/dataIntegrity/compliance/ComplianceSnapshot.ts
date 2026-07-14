/**
 * Compliance snapshots with compare and regression detection.
 */

import type { ComplianceScoreBreakdown } from "./ComplianceScoreEngine";

export interface ComplianceSnapshotPayload {
  score: ComplianceScoreBreakdown;
  violationCount: number;
  criticalViolationCount: number;
  policyCoveragePercent: number;
  auditCoveragePercent: number;
  monitoringCoveragePercent: number;
  ruleBookVersion: string;
  policyVersion: string;
  configurationVersion: string;
  profileId: string;
}

export interface ComplianceSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: ComplianceSnapshotPayload;
}

export interface ComplianceSnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  violationCountDelta: number;
  criticalViolationCountDelta: number;
  policyCoverageDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
}

export function createComplianceSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `comp:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareComplianceSnapshots(
  baseline: ComplianceSnapshot,
  compare: ComplianceSnapshot
): ComplianceSnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const violationCountDelta =
    compare.payload.violationCount - baseline.payload.violationCount;
  const criticalViolationCountDelta =
    compare.payload.criticalViolationCount -
    baseline.payload.criticalViolationCount;
  const policyCoverageDelta = round2(
    compare.payload.policyCoveragePercent -
      baseline.payload.policyCoveragePercent
  );

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Compliance score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (criticalViolationCountDelta > 0) {
    regressionReasons.push(
      `Critical violations increased by ${criticalViolationCountDelta}.`
    );
  }
  if (violationCountDelta >= 5 && scoreDelta < 0) {
    regressionReasons.push(
      "Violations increased while compliance score declined."
    );
  }
  if (policyCoverageDelta <= -15) {
    regressionReasons.push(
      `Policy coverage dropped by ${Math.abs(policyCoverageDelta)}.`
    );
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    violationCountDelta,
    criticalViolationCountDelta,
    policyCoverageDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
  };
}

export function buildComplianceSnapshotPayload(input: {
  score: ComplianceScoreBreakdown;
  violationCount: number;
  criticalViolationCount: number;
  policyCoveragePercent: number;
  auditCoveragePercent: number;
  monitoringCoveragePercent: number;
  ruleBookVersion: string;
  policyVersion: string;
  configurationVersion: string;
  profileId: string;
}): ComplianceSnapshotPayload {
  return {
    score: { ...input.score },
    violationCount: input.violationCount,
    criticalViolationCount: input.criticalViolationCount,
    policyCoveragePercent: input.policyCoveragePercent,
    auditCoveragePercent: input.auditCoveragePercent,
    monitoringCoveragePercent: input.monitoringCoveragePercent,
    ruleBookVersion: input.ruleBookVersion,
    policyVersion: input.policyVersion,
    configurationVersion: input.configurationVersion,
    profileId: input.profileId,
  };
}

export class ComplianceSnapshotStore {
  private readonly snapshots = new Map<string, ComplianceSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(
    payload: ComplianceSnapshotPayload,
    label?: string
  ): ComplianceSnapshot {
    this.versionSeq += 1;
    const snapshot: ComplianceSnapshot = {
      snapshotId: createComplianceSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: { ...payload, score: { ...payload.score } },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): ComplianceSnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): ComplianceSnapshot[] {
    return [...this.snapshots.values()]
      .sort((a, b) => a.version - b.version)
      .map(cloneSnapshot);
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

function cloneSnapshot(snapshot: ComplianceSnapshot): ComplianceSnapshot {
  return {
    ...snapshot,
    payload: {
      ...snapshot.payload,
      score: { ...snapshot.payload.score },
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
