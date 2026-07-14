/**
 * Security snapshots with compare and regression detection.
 */

import type { SecurityHealthScore } from "./SecurityMetrics";

export type SecuritySnapshotKind =
  | "security"
  | "permission"
  | "role"
  | "policy";

export interface SecuritySnapshotPayload {
  kind: SecuritySnapshotKind;
  score: SecurityHealthScore;
  roleCount: number;
  permissionCount: number;
  policyCount: number;
  resourceCount: number;
  deniedRate: number;
  configurationVersion: string;
  roleIds?: string[];
  permissionIds?: string[];
  policyIds?: string[];
}

export interface SecuritySnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: SecuritySnapshotPayload;
}

export interface SecuritySnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  roleCountDelta: number;
  policyCountDelta: number;
  deniedRateDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
}

export function createSecuritySnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `secsnap:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareSecuritySnapshots(
  baseline: SecuritySnapshot,
  compare: SecuritySnapshot
): SecuritySnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const roleCountDelta =
    compare.payload.roleCount - baseline.payload.roleCount;
  const policyCountDelta =
    compare.payload.policyCount - baseline.payload.policyCount;
  const deniedRateDelta = round2(
    compare.payload.deniedRate - baseline.payload.deniedRate
  );

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Security health score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (deniedRateDelta >= 0.15) {
    regressionReasons.push(
      `Denied request rate rose by ${Math.round(deniedRateDelta * 100)}%.`
    );
  }
  if (policyCountDelta < 0 && scoreDelta < 0) {
    regressionReasons.push(
      "Policy count decreased while security score declined."
    );
  }
  if (
    compare.payload.permissionCount < baseline.payload.permissionCount &&
    scoreDelta < 0
  ) {
    regressionReasons.push(
      "Permission inventory shrank while security score declined."
    );
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    roleCountDelta,
    policyCountDelta,
    deniedRateDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
  };
}

export function buildSecuritySnapshotPayload(input: {
  kind?: SecuritySnapshotKind;
  score: SecurityHealthScore;
  roleCount: number;
  permissionCount: number;
  policyCount: number;
  resourceCount: number;
  deniedRate: number;
  configurationVersion: string;
  roleIds?: string[];
  permissionIds?: string[];
  policyIds?: string[];
}): SecuritySnapshotPayload {
  return {
    kind: input.kind ?? "security",
    score: { ...input.score },
    roleCount: input.roleCount,
    permissionCount: input.permissionCount,
    policyCount: input.policyCount,
    resourceCount: input.resourceCount,
    deniedRate: input.deniedRate,
    configurationVersion: input.configurationVersion,
    roleIds: input.roleIds ? [...input.roleIds] : undefined,
    permissionIds: input.permissionIds ? [...input.permissionIds] : undefined,
    policyIds: input.policyIds ? [...input.policyIds] : undefined,
  };
}

export class SecuritySnapshotStore {
  private readonly snapshots = new Map<string, SecuritySnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(payload: SecuritySnapshotPayload, label?: string): SecuritySnapshot {
    this.versionSeq += 1;
    const snapshot: SecuritySnapshot = {
      snapshotId: createSecuritySnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: {
        ...payload,
        score: { ...payload.score },
        roleIds: payload.roleIds ? [...payload.roleIds] : undefined,
        permissionIds: payload.permissionIds
          ? [...payload.permissionIds]
          : undefined,
        policyIds: payload.policyIds ? [...payload.policyIds] : undefined,
      },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): SecuritySnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): SecuritySnapshot[] {
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

function cloneSnapshot(snapshot: SecuritySnapshot): SecuritySnapshot {
  return {
    ...snapshot,
    payload: {
      ...snapshot.payload,
      score: { ...snapshot.payload.score },
      roleIds: snapshot.payload.roleIds
        ? [...snapshot.payload.roleIds]
        : undefined,
      permissionIds: snapshot.payload.permissionIds
        ? [...snapshot.payload.permissionIds]
        : undefined,
      policyIds: snapshot.payload.policyIds
        ? [...snapshot.payload.policyIds]
        : undefined,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
