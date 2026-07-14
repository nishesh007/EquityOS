/**
 * Optimization snapshots with compare and regression detection.
 */

import type { OptimizationConfiguration } from "./OptimizationConfiguration";
import type { OptimizationScoreBreakdown } from "./OptimizationPlanner";

export interface OptimizationSnapshotPayload {
  score: OptimizationScoreBreakdown;
  averageRuntimeMs: number;
  cacheHitRate: number | null;
  recommendationCount: number;
  pipelineEfficiency: number;
  cacheEfficiency: number;
  dependencyHealth: number;
  memoryEfficiency: number;
  configurationVersion: string;
  mode: string;
}

export interface OptimizationSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: OptimizationSnapshotPayload;
}

export interface OptimizationSnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  runtimeDeltaMs: number;
  cacheHitDelta: number | null;
  recommendationCountDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
  performanceChanged: boolean;
}

export function createOptimizationSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `opt:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareOptimizationSnapshots(
  baseline: OptimizationSnapshot,
  compare: OptimizationSnapshot,
  config: OptimizationConfiguration
): OptimizationSnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const runtimeDeltaMs = round2(
    compare.payload.averageRuntimeMs - baseline.payload.averageRuntimeMs
  );
  const cacheHitDelta =
    baseline.payload.cacheHitRate == null ||
    compare.payload.cacheHitRate == null
      ? null
      : round2(compare.payload.cacheHitRate - baseline.payload.cacheHitRate);

  const regressionReasons: string[] = [];
  if (scoreDelta <= -config.regressionScoreDropThreshold) {
    regressionReasons.push(
      `Optimization score dropped by ${Math.abs(scoreDelta)} (threshold ${config.regressionScoreDropThreshold}).`
    );
  }
  const baselineRuntime = Math.max(1, baseline.payload.averageRuntimeMs);
  const runtimeIncreasePct = (runtimeDeltaMs / baselineRuntime) * 100;
  if (runtimeIncreasePct >= config.regressionRuntimeIncreasePct) {
    regressionReasons.push(
      `Average runtime increased by ${round2(runtimeIncreasePct)}% (threshold ${config.regressionRuntimeIncreasePct}%).`
    );
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    runtimeDeltaMs,
    cacheHitDelta,
    recommendationCountDelta:
      compare.payload.recommendationCount -
      baseline.payload.recommendationCount,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
    performanceChanged:
      Math.abs(runtimeDeltaMs) > 0 ||
      (cacheHitDelta != null && Math.abs(cacheHitDelta) > 0),
  };
}

export class OptimizationSnapshotStore {
  private readonly snapshots = new Map<string, OptimizationSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(
    payload: OptimizationSnapshotPayload,
    label?: string
  ): OptimizationSnapshot {
    this.versionSeq += 1;
    const snapshot: OptimizationSnapshot = {
      snapshotId: createOptimizationSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: { ...payload, score: { ...payload.score } },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return {
      ...snapshot,
      payload: { ...snapshot.payload, score: { ...snapshot.payload.score } },
    };
  }

  load(snapshotId: string): OptimizationSnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s
      ? { ...s, payload: { ...s.payload, score: { ...s.payload.score } } }
      : null;
  }

  list(): OptimizationSnapshot[] {
    return [...this.snapshots.values()]
      .sort((a, b) => a.version - b.version)
      .map((s) => ({
        ...s,
        payload: { ...s.payload, score: { ...s.payload.score } },
      }));
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
