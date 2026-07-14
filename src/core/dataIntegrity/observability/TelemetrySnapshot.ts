/**
 * Telemetry snapshots with compare and regression detection.
 */

import type { ObservabilityScoreBreakdown } from "./TelemetryAggregator";
import type { MetricsSnapshot } from "./MetricsCollector";

export interface TelemetrySnapshotPayload {
  score: ObservabilityScoreBreakdown;
  metrics: MetricsSnapshot | null;
  recordCount: number;
  traceCount: number;
  eventCount: number;
  droppedEvents: number;
  configurationVersion: string;
}

export interface TelemetrySnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: TelemetrySnapshotPayload;
}

export interface TelemetrySnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  latencyDeltaMs: number;
  errorRateDelta: number;
  recordCountDelta: number;
  traceCountDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
}

export function createTelemetrySnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `obs:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareTelemetrySnapshots(
  baseline: TelemetrySnapshot,
  compare: TelemetrySnapshot
): TelemetrySnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const latencyDeltaMs = round2(
    (compare.payload.metrics?.latencyMs ?? 0) -
      (baseline.payload.metrics?.latencyMs ?? 0)
  );
  const errorRateDelta = round2(
    (compare.payload.metrics?.errorRate ?? 0) -
      (baseline.payload.metrics?.errorRate ?? 0)
  );

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Observability score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (errorRateDelta >= 10) {
    regressionReasons.push(
      `Error rate increased by ${errorRateDelta} percentage points.`
    );
  }
  if (latencyDeltaMs >= 100) {
    regressionReasons.push(`Latency increased by ${latencyDeltaMs}ms.`);
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    latencyDeltaMs,
    errorRateDelta,
    recordCountDelta:
      compare.payload.recordCount - baseline.payload.recordCount,
    traceCountDelta: compare.payload.traceCount - baseline.payload.traceCount,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
  };
}

export class TelemetrySnapshotStore {
  private readonly snapshots = new Map<string, TelemetrySnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(
    payload: TelemetrySnapshotPayload,
    label?: string
  ): TelemetrySnapshot {
    this.versionSeq += 1;
    const snapshot: TelemetrySnapshot = {
      snapshotId: createTelemetrySnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: {
        ...payload,
        score: { ...payload.score },
        metrics: payload.metrics ? { ...payload.metrics } : null,
      },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): TelemetrySnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): TelemetrySnapshot[] {
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

function cloneSnapshot(snapshot: TelemetrySnapshot): TelemetrySnapshot {
  return {
    ...snapshot,
    payload: {
      ...snapshot.payload,
      score: { ...snapshot.payload.score },
      metrics: snapshot.payload.metrics
        ? { ...snapshot.payload.metrics }
        : null,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
