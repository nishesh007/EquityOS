/**
 * Quality snapshots with comparison and regression detection.
 */

import type { QualityScoreBreakdown } from "./QualityScoreEngine";

export type QualitySnapshotKind = "quality" | "baseline" | "regression";

export interface QualitySnapshotPayload {
  kind: QualitySnapshotKind;
  symbol: string;
  score: number;
  breakdown: QualityScoreBreakdown;
  signalCount: number;
  criticalCount: number;
  classification: string;
  configurationVersion: string;
}

export interface QualitySnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: QualitySnapshotPayload;
}

export interface QualitySnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  signalCountDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
  trend: "improving" | "stable" | "degrading";
}

export function createQualitySnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `eqsnap:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareQualitySnapshots(
  baseline: QualitySnapshot,
  compare: QualitySnapshot,
  regressionScoreDrop = 10
): QualitySnapshotComparison {
  const scoreDelta = round2(compare.payload.score - baseline.payload.score);
  const signalCountDelta =
    compare.payload.signalCount - baseline.payload.signalCount;

  const regressionReasons: string[] = [];
  if (scoreDelta <= -regressionScoreDrop) {
    regressionReasons.push(
      `Quality score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (
    compare.payload.criticalCount > baseline.payload.criticalCount &&
    scoreDelta < 0
  ) {
    regressionReasons.push("Critical red flags increased while score declined.");
  }
  if (
    compare.payload.breakdown.cashFlowQuality + 10 <
      baseline.payload.breakdown.cashFlowQuality &&
    scoreDelta < 0
  ) {
    regressionReasons.push("Cash flow quality deteriorated.");
  }

  let trend: QualitySnapshotComparison["trend"] = "stable";
  if (scoreDelta >= 5) trend = "improving";
  else if (scoreDelta <= -5 || regressionReasons.length > 0) trend = "degrading";

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    signalCountDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
    trend,
  };
}

export class QualitySnapshotStore {
  private readonly snapshots: QualitySnapshot[] = [];
  private retention: number;
  private seq = 0;

  constructor(retention = 100) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  create(
    payload: QualitySnapshotPayload,
    label?: string
  ): QualitySnapshot {
    this.seq += 1;
    const timestamp = new Date().toISOString();
    const snapshot: QualitySnapshot = {
      snapshotId: createQualitySnapshotId(timestamp),
      timestamp,
      label,
      version: this.seq,
      payload: {
        ...payload,
        breakdown: { ...payload.breakdown },
      },
    };
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.retention) {
      this.snapshots.splice(0, this.snapshots.length - this.retention);
    }
    return {
      ...snapshot,
      payload: {
        ...snapshot.payload,
        breakdown: { ...snapshot.payload.breakdown },
      },
    };
  }

  list(limit?: number): QualitySnapshot[] {
    const items =
      limit === undefined ? this.snapshots : this.snapshots.slice(-limit);
    return items.map((s) => ({
      ...s,
      payload: { ...s.payload, breakdown: { ...s.payload.breakdown } },
    }));
  }

  latest(): QualitySnapshot | null {
    const s = this.snapshots[this.snapshots.length - 1];
    return s
      ? {
          ...s,
          payload: { ...s.payload, breakdown: { ...s.payload.breakdown } },
        }
      : null;
  }

  clear(): void {
    this.snapshots.length = 0;
    this.seq = 0;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
