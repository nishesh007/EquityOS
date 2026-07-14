/**
 * Version snapshots with compare and regression detection.
 */

import type { VersionHealthScore } from "./MigrationEngine";

export interface VersionSnapshotPayload {
  score: VersionHealthScore;
  versionCount: number;
  migrationCount: number;
  schemaVersion: string;
  compatibilityScore: number;
  rollbackPlanCount: number;
  configurationVersion: string;
}

export interface VersionSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: VersionSnapshotPayload;
}

export interface VersionSnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  versionCountDelta: number;
  compatibilityDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
}

export function createVersionSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `vsnap:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareVersionSnapshots(
  baseline: VersionSnapshot,
  compare: VersionSnapshot
): VersionSnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const versionCountDelta =
    compare.payload.versionCount - baseline.payload.versionCount;
  const compatibilityDelta = round2(
    compare.payload.compatibilityScore - baseline.payload.compatibilityScore
  );

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Version health score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (compatibilityDelta <= -15) {
    regressionReasons.push(
      `Compatibility score dropped by ${Math.abs(compatibilityDelta)}.`
    );
  }
  if (
    compare.payload.schemaVersion !== baseline.payload.schemaVersion &&
    scoreDelta < 0
  ) {
    regressionReasons.push(
      "Schema version changed while health score declined."
    );
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    versionCountDelta,
    compatibilityDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
  };
}

export function buildVersionSnapshotPayload(input: {
  score: VersionHealthScore;
  versionCount: number;
  migrationCount: number;
  schemaVersion: string;
  compatibilityScore: number;
  rollbackPlanCount: number;
  configurationVersion: string;
}): VersionSnapshotPayload {
  return {
    score: { ...input.score },
    versionCount: input.versionCount,
    migrationCount: input.migrationCount,
    schemaVersion: input.schemaVersion,
    compatibilityScore: input.compatibilityScore,
    rollbackPlanCount: input.rollbackPlanCount,
    configurationVersion: input.configurationVersion,
  };
}

export class VersionSnapshotStore {
  private readonly snapshots = new Map<string, VersionSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(payload: VersionSnapshotPayload, label?: string): VersionSnapshot {
    this.versionSeq += 1;
    const snapshot: VersionSnapshot = {
      snapshotId: createVersionSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: { ...payload, score: { ...payload.score } },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): VersionSnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): VersionSnapshot[] {
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

function cloneSnapshot(snapshot: VersionSnapshot): VersionSnapshot {
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
