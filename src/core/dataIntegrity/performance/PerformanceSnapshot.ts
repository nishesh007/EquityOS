/**
 * Performance snapshots with compare, regression detection, and trend analysis.
 */

import type { PerformanceHealthScore } from "./PerformanceMetrics";

export type PerformanceSnapshotKind =
  | "performance"
  | "benchmark"
  | "capacity";

export interface PerformanceSnapshotPayload {
  kind: PerformanceSnapshotKind;
  score: PerformanceHealthScore;
  latencyMs: number;
  throughputPerSec: number;
  capacity: number;
  cpuUsagePct: number;
  memoryUsagePct: number;
  scalabilityScore: number;
  configurationVersion: string;
}

export interface PerformanceSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: PerformanceSnapshotPayload;
}

export interface PerformanceSnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  latencyDelta: number;
  throughputDelta: number;
  capacityDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
  trend: "improving" | "stable" | "degrading";
}

export function createPerformanceSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `perfsnap:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function comparePerformanceSnapshots(
  baseline: PerformanceSnapshot,
  compare: PerformanceSnapshot
): PerformanceSnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const latencyDelta = round2(
    compare.payload.latencyMs - baseline.payload.latencyMs
  );
  const throughputDelta = round2(
    compare.payload.throughputPerSec - baseline.payload.throughputPerSec
  );
  const capacityDelta = round2(
    compare.payload.capacity - baseline.payload.capacity
  );

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Performance health score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (latencyDelta >= 25 && latencyDelta / Math.max(1, baseline.payload.latencyMs) >= 0.2) {
    regressionReasons.push(
      `Latency increased by ${latencyDelta}ms.`
    );
  }
  if (throughputDelta <= -10) {
    regressionReasons.push(
      `Throughput dropped by ${Math.abs(throughputDelta)} ops/sec.`
    );
  }
  if (capacityDelta < 0 && scoreDelta < 0) {
    regressionReasons.push(
      "Capacity declined while performance score declined."
    );
  }

  let trend: PerformanceSnapshotComparison["trend"] = "stable";
  if (scoreDelta >= 5 || (latencyDelta < 0 && throughputDelta > 0)) {
    trend = "improving";
  } else if (scoreDelta <= -5 || regressionReasons.length > 0) {
    trend = "degrading";
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    latencyDelta,
    throughputDelta,
    capacityDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
    trend,
  };
}

export function buildPerformanceSnapshotPayload(input: {
  kind?: PerformanceSnapshotKind;
  score: PerformanceHealthScore;
  latencyMs: number;
  throughputPerSec: number;
  capacity: number;
  cpuUsagePct: number;
  memoryUsagePct: number;
  scalabilityScore: number;
  configurationVersion: string;
}): PerformanceSnapshotPayload {
  return {
    kind: input.kind ?? "performance",
    score: { ...input.score },
    latencyMs: input.latencyMs,
    throughputPerSec: input.throughputPerSec,
    capacity: input.capacity,
    cpuUsagePct: input.cpuUsagePct,
    memoryUsagePct: input.memoryUsagePct,
    scalabilityScore: input.scalabilityScore,
    configurationVersion: input.configurationVersion,
  };
}

export class PerformanceSnapshotStore {
  private readonly snapshots = new Map<string, PerformanceSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(
    payload: PerformanceSnapshotPayload,
    label?: string
  ): PerformanceSnapshot {
    this.versionSeq += 1;
    const snapshot: PerformanceSnapshot = {
      snapshotId: createPerformanceSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: { ...payload, score: { ...payload.score } },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): PerformanceSnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): PerformanceSnapshot[] {
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

function cloneSnapshot(snapshot: PerformanceSnapshot): PerformanceSnapshot {
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
