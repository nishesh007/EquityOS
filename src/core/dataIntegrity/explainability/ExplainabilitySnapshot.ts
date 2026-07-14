/**
 * Explainability snapshots with compare, regression detection, and trend analysis.
 */

import type { ExplainabilityHealthScore } from "./ExplainabilityMetrics";

export type ExplainabilitySnapshotKind =
  | "decision"
  | "trace"
  | "confidence";

export interface ExplainabilitySnapshotPayload {
  kind: ExplainabilitySnapshotKind;
  score: ExplainabilityHealthScore;
  traceCount: number;
  explanationCount: number;
  ruleCoverage: number;
  confidenceCoverage: number;
  overallConfidence: number;
  dependencyCount: number;
  configurationVersion: string;
}

export interface ExplainabilitySnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: ExplainabilitySnapshotPayload;
}

export interface ExplainabilitySnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  ruleCoverageDelta: number;
  confidenceCoverageDelta: number;
  overallConfidenceDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
  trend: "improving" | "stable" | "degrading";
}

export function createExplainabilitySnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `explsnap:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareExplainabilitySnapshots(
  baseline: ExplainabilitySnapshot,
  compare: ExplainabilitySnapshot
): ExplainabilitySnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const ruleCoverageDelta = round2(
    compare.payload.ruleCoverage - baseline.payload.ruleCoverage
  );
  const confidenceCoverageDelta = round2(
    compare.payload.confidenceCoverage - baseline.payload.confidenceCoverage
  );
  const overallConfidenceDelta = round2(
    compare.payload.overallConfidence - baseline.payload.overallConfidence
  );

  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Explainability health score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (ruleCoverageDelta <= -15) {
    regressionReasons.push(
      `Rule coverage dropped by ${Math.abs(ruleCoverageDelta)}.`
    );
  }
  if (confidenceCoverageDelta <= -15) {
    regressionReasons.push(
      `Confidence coverage dropped by ${Math.abs(confidenceCoverageDelta)}.`
    );
  }
  // overallConfidence is stored on a 0–1 scale.
  if (overallConfidenceDelta <= -0.1) {
    regressionReasons.push(
      `Overall confidence dropped by ${Math.abs(overallConfidenceDelta)}.`
    );
  }
  if (
    compare.payload.explanationCount < baseline.payload.explanationCount &&
    scoreDelta < 0
  ) {
    regressionReasons.push(
      "Explanation count declined while explainability score declined."
    );
  }

  let trend: ExplainabilitySnapshotComparison["trend"] = "stable";
  if (scoreDelta >= 5 || (ruleCoverageDelta > 0 && confidenceCoverageDelta > 0)) {
    trend = "improving";
  } else if (scoreDelta <= -5 || regressionReasons.length > 0) {
    trend = "degrading";
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    ruleCoverageDelta,
    confidenceCoverageDelta,
    overallConfidenceDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
    trend,
  };
}

export function buildExplainabilitySnapshotPayload(input: {
  kind?: ExplainabilitySnapshotKind;
  score: ExplainabilityHealthScore;
  traceCount: number;
  explanationCount: number;
  ruleCoverage: number;
  confidenceCoverage: number;
  overallConfidence: number;
  dependencyCount: number;
  configurationVersion: string;
}): ExplainabilitySnapshotPayload {
  return {
    kind: input.kind ?? "decision",
    score: { ...input.score },
    traceCount: input.traceCount,
    explanationCount: input.explanationCount,
    ruleCoverage: input.ruleCoverage,
    confidenceCoverage: input.confidenceCoverage,
    overallConfidence: input.overallConfidence,
    dependencyCount: input.dependencyCount,
    configurationVersion: input.configurationVersion,
  };
}

export class ExplainabilitySnapshotStore {
  private readonly snapshots = new Map<string, ExplainabilitySnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(
    payload: ExplainabilitySnapshotPayload,
    label?: string
  ): ExplainabilitySnapshot {
    this.versionSeq += 1;
    const snapshot: ExplainabilitySnapshot = {
      snapshotId: createExplainabilitySnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: { ...payload, score: { ...payload.score } },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): ExplainabilitySnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): ExplainabilitySnapshot[] {
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
  snapshot: ExplainabilitySnapshot
): ExplainabilitySnapshot {
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
