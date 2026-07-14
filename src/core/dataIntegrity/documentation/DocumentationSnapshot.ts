/**
 * Documentation snapshots with compare, regression detection, and trend analysis.
 */

import type { DocumentationHealthScore } from "./DocumentationMetrics";

export type DocumentationSnapshotKind =
  | "documentation"
  | "api"
  | "architecture"
  | "guide";

export interface DocumentationSnapshotPayload {
  kind: DocumentationSnapshotKind;
  score: DocumentationHealthScore;
  documentCount: number;
  apiCount: number;
  moduleCount: number;
  guideCount: number;
  coveragePct: number;
  configurationVersion: string;
}

export interface DocumentationSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: DocumentationSnapshotPayload;
}

export interface DocumentationSnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  documentCountDelta: number;
  coverageDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
  trend: "improving" | "stable" | "degrading";
}

export function createDocumentationSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `docsnap:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareDocumentationSnapshots(
  baseline: DocumentationSnapshot,
  compare: DocumentationSnapshot
): DocumentationSnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const documentCountDelta =
    compare.payload.documentCount - baseline.payload.documentCount;
  const coverageDelta = round2(
    compare.payload.coveragePct - baseline.payload.coveragePct
  );

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Documentation health score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (coverageDelta <= -15) {
    regressionReasons.push(
      `Documentation coverage dropped by ${Math.abs(coverageDelta)}.`
    );
  }
  if (documentCountDelta < 0 && scoreDelta < 0) {
    regressionReasons.push(
      "Document inventory shrank while documentation score declined."
    );
  }

  let trend: DocumentationSnapshotComparison["trend"] = "stable";
  if (scoreDelta >= 5 || (coverageDelta > 0 && documentCountDelta >= 0)) {
    trend = "improving";
  } else if (scoreDelta <= -5 || regressionReasons.length > 0) {
    trend = "degrading";
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    documentCountDelta,
    coverageDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
    trend,
  };
}

export function buildDocumentationSnapshotPayload(input: {
  kind?: DocumentationSnapshotKind;
  score: DocumentationHealthScore;
  documentCount: number;
  apiCount: number;
  moduleCount: number;
  guideCount: number;
  coveragePct: number;
  configurationVersion: string;
}): DocumentationSnapshotPayload {
  return {
    kind: input.kind ?? "documentation",
    score: { ...input.score },
    documentCount: input.documentCount,
    apiCount: input.apiCount,
    moduleCount: input.moduleCount,
    guideCount: input.guideCount,
    coveragePct: input.coveragePct,
    configurationVersion: input.configurationVersion,
  };
}

export class DocumentationSnapshotStore {
  private readonly snapshots = new Map<string, DocumentationSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(
    payload: DocumentationSnapshotPayload,
    label?: string
  ): DocumentationSnapshot {
    this.versionSeq += 1;
    const snapshot: DocumentationSnapshot = {
      snapshotId: createDocumentationSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: { ...payload, score: { ...payload.score } },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): DocumentationSnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): DocumentationSnapshot[] {
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

function cloneSnapshot(
  snapshot: DocumentationSnapshot
): DocumentationSnapshot {
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
