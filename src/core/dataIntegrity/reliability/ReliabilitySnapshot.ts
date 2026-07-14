/**
 * Reliability snapshots with compare and regression detection.
 */

import type { ReliabilityConfiguration } from "./ReliabilityConfiguration";
import type { ResilienceScoreBreakdown } from "./ReliabilityMonitor";
import type { ProbeHealthStatus } from "./ReliabilityRegistry";

export interface ReliabilitySnapshotPayload {
  resilienceScore: ResilienceScoreBreakdown;
  availabilityPct: number;
  recoveryRate: number;
  timeoutCount: number;
  retryCount: number;
  circuitTrips: number;
  overallStatus: ProbeHealthStatus;
  openCircuits: string[];
  configurationVersion: string;
}

export interface ReliabilitySnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: ReliabilitySnapshotPayload;
}

export interface ReliabilitySnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  availabilityDelta: number;
  recoveryRateDelta: number;
  timeoutCountDelta: number;
  circuitTripsDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
}

export function createReliabilitySnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `rel:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareReliabilitySnapshots(
  baseline: ReliabilitySnapshot,
  compare: ReliabilitySnapshot,
  config: ReliabilityConfiguration
): ReliabilitySnapshotComparison {
  const scoreDelta = round2(
    compare.payload.resilienceScore.overall -
      baseline.payload.resilienceScore.overall
  );
  const availabilityDelta = round2(
    compare.payload.availabilityPct - baseline.payload.availabilityPct
  );
  const recoveryRateDelta = round2(
    compare.payload.recoveryRate - baseline.payload.recoveryRate
  );
  const timeoutCountDelta =
    compare.payload.timeoutCount - baseline.payload.timeoutCount;
  const circuitTripsDelta =
    compare.payload.circuitTrips - baseline.payload.circuitTrips;

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Resilience score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (availabilityDelta <= -5) {
    regressionReasons.push(
      `Availability dropped by ${Math.abs(availabilityDelta)}%.`
    );
  }
  if (circuitTripsDelta > 0 && compare.payload.circuitTrips > baseline.payload.circuitTrips) {
    regressionReasons.push(`Circuit trips increased by ${circuitTripsDelta}.`);
  }
  void config;

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    availabilityDelta,
    recoveryRateDelta,
    timeoutCountDelta,
    circuitTripsDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
  };
}

export class ReliabilitySnapshotStore {
  private readonly snapshots = new Map<string, ReliabilitySnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(
    payload: ReliabilitySnapshotPayload,
    label?: string
  ): ReliabilitySnapshot {
    this.versionSeq += 1;
    const snapshot: ReliabilitySnapshot = {
      snapshotId: createReliabilitySnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: {
        ...payload,
        resilienceScore: { ...payload.resilienceScore },
        openCircuits: [...payload.openCircuits],
      },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): ReliabilitySnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): ReliabilitySnapshot[] {
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

function cloneSnapshot(snapshot: ReliabilitySnapshot): ReliabilitySnapshot {
  return {
    ...snapshot,
    payload: {
      ...snapshot.payload,
      resilienceScore: { ...snapshot.payload.resilienceScore },
      openCircuits: [...snapshot.payload.openCircuits],
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
