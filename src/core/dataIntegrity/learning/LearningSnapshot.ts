/**
 * Learning snapshots with compare, regression detection, and trend analysis.
 */

import type { LearningHealthScore } from "./LearningMetrics";

export type LearningSnapshotKind =
  | "learning"
  | "feedback"
  | "trend";

export interface LearningSnapshotPayload {
  kind: LearningSnapshotKind;
  score: LearningHealthScore;
  patternCount: number;
  feedbackCount: number;
  improvementCount: number;
  backlogSize: number;
  averageImpact: number;
  configurationVersion: string;
}

export interface LearningSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: LearningSnapshotPayload;
}

export interface LearningSnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  patternCountDelta: number;
  feedbackCountDelta: number;
  improvementCountDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
  trend: "improving" | "stable" | "degrading";
}

export function createLearningSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `learnsnap:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareLearningSnapshots(
  baseline: LearningSnapshot,
  compare: LearningSnapshot
): LearningSnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const patternCountDelta =
    compare.payload.patternCount - baseline.payload.patternCount;
  const feedbackCountDelta =
    compare.payload.feedbackCount - baseline.payload.feedbackCount;
  const improvementCountDelta =
    compare.payload.improvementCount - baseline.payload.improvementCount;

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Learning health score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (patternCountDelta < 0 && scoreDelta < 0) {
    regressionReasons.push(
      "Pattern detection declined while learning score declined."
    );
  }
  if (improvementCountDelta < 0 && scoreDelta < 0) {
    regressionReasons.push(
      "Improvement backlog shrank while learning score declined."
    );
  }
  if (
    compare.payload.averageImpact + 0.15 < baseline.payload.averageImpact &&
    scoreDelta < 0
  ) {
    regressionReasons.push("Average improvement impact declined.");
  }

  let trend: LearningSnapshotComparison["trend"] = "stable";
  if (scoreDelta >= 5 || (patternCountDelta > 0 && improvementCountDelta > 0)) {
    trend = "improving";
  } else if (scoreDelta <= -5 || regressionReasons.length > 0) {
    trend = "degrading";
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    patternCountDelta,
    feedbackCountDelta,
    improvementCountDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
    trend,
  };
}

export function buildLearningSnapshotPayload(input: {
  kind?: LearningSnapshotKind;
  score: LearningHealthScore;
  patternCount: number;
  feedbackCount: number;
  improvementCount: number;
  backlogSize: number;
  averageImpact: number;
  configurationVersion: string;
}): LearningSnapshotPayload {
  return {
    kind: input.kind ?? "learning",
    score: { ...input.score },
    patternCount: input.patternCount,
    feedbackCount: input.feedbackCount,
    improvementCount: input.improvementCount,
    backlogSize: input.backlogSize,
    averageImpact: input.averageImpact,
    configurationVersion: input.configurationVersion,
  };
}

export class LearningSnapshotStore {
  private readonly snapshots = new Map<string, LearningSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(payload: LearningSnapshotPayload, label?: string): LearningSnapshot {
    this.versionSeq += 1;
    const snapshot: LearningSnapshot = {
      snapshotId: createLearningSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: { ...payload, score: { ...payload.score } },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): LearningSnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): LearningSnapshot[] {
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

function cloneSnapshot(snapshot: LearningSnapshot): LearningSnapshot {
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
