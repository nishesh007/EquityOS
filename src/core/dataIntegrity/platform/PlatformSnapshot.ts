/**
 * Platform snapshots with compare and regression detection.
 */

import type { PlatformHealthReport } from "./PlatformHealth";
import type { PlatformCertificationStatus } from "./PlatformCertification";

export type PlatformSnapshotKind = "platform" | "certification" | "health";

export interface PlatformSnapshotPayload {
  kind: PlatformSnapshotKind;
  health: PlatformHealthReport;
  certificationStatus: PlatformCertificationStatus | "uninitialized";
  enginesRegistered: number;
  enginesRequired: number;
  configurationVersion: string;
}

export interface PlatformSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: PlatformSnapshotPayload;
}

export interface PlatformSnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  riskDelta: number;
  coverageDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
  trend: "improving" | "stable" | "degrading";
}

export function createPlatformSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `platsnap:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function comparePlatformSnapshots(
  baseline: PlatformSnapshot,
  compare: PlatformSnapshot
): PlatformSnapshotComparison {
  const scoreDelta = round2(
    compare.payload.health.overallHealthScore -
      baseline.payload.health.overallHealthScore
  );
  const riskDelta = round2(
    compare.payload.health.overallRisk - baseline.payload.health.overallRisk
  );
  const coverageDelta = round2(
    compare.payload.health.overallCoverage -
      baseline.payload.health.overallCoverage
  );

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Platform health score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (riskDelta >= 15) {
    regressionReasons.push(`Platform risk rose by ${riskDelta}.`);
  }
  if (coverageDelta <= -10) {
    regressionReasons.push(
      `Engine coverage dropped by ${Math.abs(coverageDelta)}.`
    );
  }

  let trend: PlatformSnapshotComparison["trend"] = "stable";
  if (scoreDelta >= 5 || (riskDelta < 0 && coverageDelta >= 0)) {
    trend = "improving";
  } else if (scoreDelta <= -5 || regressionReasons.length > 0) {
    trend = "degrading";
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    riskDelta,
    coverageDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
    trend,
  };
}

export function buildPlatformSnapshotPayload(input: {
  kind?: PlatformSnapshotKind;
  health: PlatformHealthReport;
  certificationStatus: PlatformCertificationStatus | "uninitialized";
  enginesRegistered: number;
  enginesRequired: number;
  configurationVersion: string;
}): PlatformSnapshotPayload {
  return {
    kind: input.kind ?? "platform",
    health: { ...input.health },
    certificationStatus: input.certificationStatus,
    enginesRegistered: input.enginesRegistered,
    enginesRequired: input.enginesRequired,
    configurationVersion: input.configurationVersion,
  };
}

export class PlatformSnapshotStore {
  private readonly snapshots = new Map<string, PlatformSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(payload: PlatformSnapshotPayload, label?: string): PlatformSnapshot {
    this.versionSeq += 1;
    const snapshot: PlatformSnapshot = {
      snapshotId: createPlatformSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: { ...payload, health: { ...payload.health } },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): PlatformSnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): PlatformSnapshot[] {
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

function cloneSnapshot(snapshot: PlatformSnapshot): PlatformSnapshot {
  return {
    ...snapshot,
    payload: {
      ...snapshot.payload,
      health: { ...snapshot.payload.health },
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
