/**
 * Insight snapshots with compare and regression detection.
 */

import type { InsightScoreBreakdown } from "./InsightScoring";
import type { InsightsPack } from "./InsightsAggregator";

export interface InsightSnapshotPayload {
  score: InsightScoreBreakdown;
  patternCount: number;
  correlationCount: number;
  riskCount: number;
  opportunityCount: number;
  recommendationCount: number;
  averageRecommendationConfidence: number;
  configurationVersion: string;
}

export interface InsightSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: InsightSnapshotPayload;
}

export interface InsightSnapshotComparison {
  baselineId: string;
  compareId: string;
  scoreDelta: number;
  patternCountDelta: number;
  riskCountDelta: number;
  recommendationCountDelta: number;
  confidenceDelta: number;
  regressionDetected: boolean;
  regressionReasons: string[];
}

export function createInsightSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `intel:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareInsightSnapshots(
  baseline: InsightSnapshot,
  compare: InsightSnapshot
): InsightSnapshotComparison {
  const scoreDelta = round2(
    compare.payload.score.overall - baseline.payload.score.overall
  );
  const confidenceDelta = round2(
    compare.payload.averageRecommendationConfidence -
      baseline.payload.averageRecommendationConfidence
  );
  const regressionReasons: string[] = [];
  if (scoreDelta <= -10) {
    regressionReasons.push(
      `Insight score dropped by ${Math.abs(scoreDelta)}.`
    );
  }
  if (confidenceDelta <= -0.15) {
    regressionReasons.push(
      `Recommendation confidence dropped by ${Math.abs(confidenceDelta)}.`
    );
  }
  if (
    compare.payload.riskCount - baseline.payload.riskCount >= 5 &&
    scoreDelta < 0
  ) {
    regressionReasons.push("Risk insights increased while score declined.");
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    scoreDelta,
    patternCountDelta:
      compare.payload.patternCount - baseline.payload.patternCount,
    riskCountDelta: compare.payload.riskCount - baseline.payload.riskCount,
    recommendationCountDelta:
      compare.payload.recommendationCount -
      baseline.payload.recommendationCount,
    confidenceDelta,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
  };
}

export function buildSnapshotPayload(
  pack: InsightsPack,
  configurationVersion: string
): InsightSnapshotPayload {
  const confidences = pack.recommendations.map((r) => r.confidence);
  return {
    score: { ...pack.score },
    patternCount: pack.patterns.length,
    correlationCount: pack.correlations.length,
    riskCount: pack.risks.length,
    opportunityCount: pack.opportunities.length,
    recommendationCount: pack.recommendations.length,
    averageRecommendationConfidence:
      confidences.length === 0
        ? 0
        : round2(confidences.reduce((a, b) => a + b, 0) / confidences.length),
    configurationVersion,
  };
}

export class InsightSnapshotStore {
  private readonly snapshots = new Map<string, InsightSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(
    payload: InsightSnapshotPayload,
    label?: string
  ): InsightSnapshot {
    this.versionSeq += 1;
    const snapshot: InsightSnapshot = {
      snapshotId: createInsightSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: { ...payload, score: { ...payload.score } },
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return cloneSnapshot(snapshot);
  }

  load(snapshotId: string): InsightSnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s ? cloneSnapshot(s) : null;
  }

  list(): InsightSnapshot[] {
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

function cloneSnapshot(snapshot: InsightSnapshot): InsightSnapshot {
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
