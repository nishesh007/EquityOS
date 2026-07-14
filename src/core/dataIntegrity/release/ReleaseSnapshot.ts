/**
 * Release snapshots with compare, regression detection, and trend analysis.
 */

import type { ReleaseHealthScore } from "./ReleaseMetrics";

export type ReleaseSnapshotKind =
  | "release"
  | "certification"
  | "deployment";

export interface ReleaseSnapshotPayload {
  kind: ReleaseSnapshotKind;
  score: ReleaseHealthScore;
  certificationStatus: string;
  deploymentRisk: number;
  rollbackReadiness: number;
  checklistCompletion: number;
  criticalRiskCount: number;
  configurationVersion: string;
}

export interface ReleaseSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: ReleaseSnapshotPayload;
}

export interface ReleaseSnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  deploymentRiskDelta: number;
  rollbackReadinessDelta: number;
  checklistCompletionDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
  trend: "improving" | "stable" | "degrading";
}

export function createReleaseSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `relsnap:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareReleaseSnapshots(
  baseline: ReleaseSnapshot,
  compare: ReleaseSnapshot
): ReleaseSnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const deploymentRiskDelta = round2(
    compare.payload.deploymentRisk - baseline.payload.deploymentRisk
  );
  const rollbackReadinessDelta = round2(
    compare.payload.rollbackReadiness - baseline.payload.rollbackReadiness
  );
  const checklistCompletionDelta = round2(
    compare.payload.checklistCompletion - baseline.payload.checklistCompletion
  );

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Production readiness score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (deploymentRiskDelta >= 15) {
    regressionReasons.push(
      `Deployment risk rose by ${deploymentRiskDelta}.`
    );
  }
  if (rollbackReadinessDelta <= -15) {
    regressionReasons.push(
      `Rollback readiness dropped by ${Math.abs(rollbackReadinessDelta)}.`
    );
  }
  if (checklistCompletionDelta <= -10) {
    regressionReasons.push(
      `Checklist completion dropped by ${Math.abs(checklistCompletionDelta)}.`
    );
  }

  let trend: ReleaseSnapshotComparison["trend"] = "stable";
  if (
    scoreDelta >= 5 ||
    (deploymentRiskDelta < 0 && rollbackReadinessDelta > 0)
  ) {
    trend = "improving";
  } else if (scoreDelta <= -5 || regressionReasons.length > 0) {
    trend = "degrading";
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    deploymentRiskDelta,
    rollbackReadinessDelta,
    checklistCompletionDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
    trend,
  };
}

export function buildReleaseSnapshotPayload(input: {
  kind?: ReleaseSnapshotKind;
  score: ReleaseHealthScore;
  certificationStatus: string;
  deploymentRisk: number;
  rollbackReadiness: number;
  checklistCompletion: number;
  criticalRiskCount: number;
  configurationVersion: string;
}): ReleaseSnapshotPayload {
  return {
    kind: input.kind ?? "release",
    score: { ...input.score },
    certificationStatus: input.certificationStatus,
    deploymentRisk: input.deploymentRisk,
    rollbackReadiness: input.rollbackReadiness,
    checklistCompletion: input.checklistCompletion,
    criticalRiskCount: input.criticalRiskCount,
    configurationVersion: input.configurationVersion,
  };
}

export class ReleaseSnapshotStore {
  private readonly snapshots = new Map<string, ReleaseSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(payload: ReleaseSnapshotPayload, label?: string): ReleaseSnapshot {
    this.versionSeq += 1;
    const snapshot: ReleaseSnapshot = {
      snapshotId: createReleaseSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: { ...payload, score: { ...payload.score } },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): ReleaseSnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): ReleaseSnapshot[] {
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

function cloneSnapshot(snapshot: ReleaseSnapshot): ReleaseSnapshot {
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
