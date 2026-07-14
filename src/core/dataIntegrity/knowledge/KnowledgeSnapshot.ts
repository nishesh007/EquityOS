/**
 * Knowledge snapshots with compare and regression detection.
 */

import type { KnowledgeScoreBreakdown } from "./KnowledgeGraph";

export interface KnowledgeSnapshotPayload {
  score: KnowledgeScoreBreakdown;
  nodeCount: number;
  edgeCount: number;
  relationshipCount: number;
  dependencyDepth: number;
  impactAnalyses: number;
  configurationVersion: string;
}

export interface KnowledgeSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: KnowledgeSnapshotPayload;
}

export interface KnowledgeSnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  nodeCountDelta: number;
  edgeCountDelta: number;
  dependencyDepthDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
}

export function createKnowledgeSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `know:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareKnowledgeSnapshots(
  baseline: KnowledgeSnapshot,
  compare: KnowledgeSnapshot
): KnowledgeSnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const nodeCountDelta =
    compare.payload.nodeCount - baseline.payload.nodeCount;
  const edgeCountDelta =
    compare.payload.edgeCount - baseline.payload.edgeCount;
  const dependencyDepthDelta =
    compare.payload.dependencyDepth - baseline.payload.dependencyDepth;

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Knowledge score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (edgeCountDelta <= -5 && scoreDelta < 0) {
    regressionReasons.push(
      "Relationship count declined while knowledge score dropped."
    );
  }
  if (nodeCountDelta < 0 && edgeCountDelta < 0) {
    regressionReasons.push("Graph lost both nodes and edges.");
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    nodeCountDelta,
    edgeCountDelta,
    dependencyDepthDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
  };
}

export function buildKnowledgeSnapshotPayload(input: {
  score: KnowledgeScoreBreakdown;
  nodeCount: number;
  edgeCount: number;
  relationshipCount: number;
  dependencyDepth: number;
  impactAnalyses: number;
  configurationVersion: string;
}): KnowledgeSnapshotPayload {
  return {
    score: { ...input.score },
    nodeCount: input.nodeCount,
    edgeCount: input.edgeCount,
    relationshipCount: input.relationshipCount,
    dependencyDepth: input.dependencyDepth,
    impactAnalyses: input.impactAnalyses,
    configurationVersion: input.configurationVersion,
  };
}

export class KnowledgeSnapshotStore {
  private readonly snapshots = new Map<string, KnowledgeSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(
    payload: KnowledgeSnapshotPayload,
    label?: string
  ): KnowledgeSnapshot {
    this.versionSeq += 1;
    const snapshot: KnowledgeSnapshot = {
      snapshotId: createKnowledgeSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: { ...payload, score: { ...payload.score } },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): KnowledgeSnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): KnowledgeSnapshot[] {
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

function cloneSnapshot(snapshot: KnowledgeSnapshot): KnowledgeSnapshot {
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
