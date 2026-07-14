/**
 * Simulation snapshots with compare, regression detection, and trend analysis.
 */

import type { SimulationHealthScore } from "./SimulationMetrics";

export type SimulationSnapshotKind =
  | "scenario"
  | "simulation"
  | "replay";

export interface SimulationSnapshotPayload {
  kind: SimulationSnapshotKind;
  score: SimulationHealthScore;
  scenarioCount: number;
  stressCount: number;
  monteCarloCount: number;
  failureRate: number;
  averageValidationScore: number;
  configurationVersion: string;
}

export interface SimulationSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: SimulationSnapshotPayload;
}

export interface SimulationSnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  failureRateDelta: number;
  validationScoreDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
  trend: "improving" | "stable" | "degrading";
}

export function createSimulationSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `simsnap:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareSimulationSnapshots(
  baseline: SimulationSnapshot,
  compare: SimulationSnapshot
): SimulationSnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const failureRateDelta = round2(
    compare.payload.failureRate - baseline.payload.failureRate
  );
  const validationScoreDelta = round2(
    compare.payload.averageValidationScore -
      baseline.payload.averageValidationScore
  );

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Simulation health score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (failureRateDelta >= 0.15) {
    regressionReasons.push(
      `Failure rate rose by ${Math.round(failureRateDelta * 100)}%.`
    );
  }
  if (validationScoreDelta <= -10) {
    regressionReasons.push(
      `Average validation score dropped by ${Math.abs(validationScoreDelta)}.`
    );
  }

  let trend: SimulationSnapshotComparison["trend"] = "stable";
  if (scoreDelta >= 5 || (failureRateDelta < 0 && validationScoreDelta > 0)) {
    trend = "improving";
  } else if (scoreDelta <= -5 || regressionReasons.length > 0) {
    trend = "degrading";
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    failureRateDelta,
    validationScoreDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
    trend,
  };
}

export function buildSimulationSnapshotPayload(input: {
  kind?: SimulationSnapshotKind;
  score: SimulationHealthScore;
  scenarioCount: number;
  stressCount: number;
  monteCarloCount: number;
  failureRate: number;
  averageValidationScore: number;
  configurationVersion: string;
}): SimulationSnapshotPayload {
  return {
    kind: input.kind ?? "simulation",
    score: { ...input.score },
    scenarioCount: input.scenarioCount,
    stressCount: input.stressCount,
    monteCarloCount: input.monteCarloCount,
    failureRate: input.failureRate,
    averageValidationScore: input.averageValidationScore,
    configurationVersion: input.configurationVersion,
  };
}

export class SimulationSnapshotStore {
  private readonly snapshots = new Map<string, SimulationSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(payload: SimulationSnapshotPayload, label?: string): SimulationSnapshot {
    this.versionSeq += 1;
    const snapshot: SimulationSnapshot = {
      snapshotId: createSimulationSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: { ...payload, score: { ...payload.score } },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): SimulationSnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): SimulationSnapshot[] {
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

function cloneSnapshot(snapshot: SimulationSnapshot): SimulationSnapshot {
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
