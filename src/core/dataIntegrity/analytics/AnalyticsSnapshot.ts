/**
 * Analytics snapshot model and comparison.
 */

import type { AnalyticsSummary } from "./AnalyticsAggregator";
import type { RuleEffectivenessReport } from "./AnalyticsRuleEffectiveness";
import type { FailureAnalyticsReport } from "./AnalyticsFailurePatterns";
import type { TrendAnalyticsReport } from "./AnalyticsTrendAnalyzer";
import type { DistributionAnalyticsReport } from "./AnalyticsDistribution";
import type { PredictionAnalyticsReport } from "./AnalyticsPredictionEngine";

export interface AnalyticsSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  summary: AnalyticsSummary;
  ruleEffectiveness: RuleEffectivenessReport;
  failureAnalytics: FailureAnalyticsReport;
  trends: TrendAnalyticsReport;
  distributions: DistributionAnalyticsReport;
  predictions: PredictionAnalyticsReport;
  healthScore: number;
  engineVersion: string;
}

export interface AnalyticsSnapshotComparison {
  baselineId: string;
  compareId: string;
  healthDelta: number;
  trustDelta: number;
  integrityDelta: number;
  failureRateDelta: number;
  validationCountDelta: number;
  regressionDetected: boolean;
}

export function createAnalyticsSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `analytics:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareAnalyticsSnapshots(
  baseline: AnalyticsSnapshot,
  compare: AnalyticsSnapshot,
  collapseDropThreshold: number
): AnalyticsSnapshotComparison {
  const healthDelta = round2(compare.healthScore - baseline.healthScore);
  const trustDelta = round2(
    compare.summary.averageTrustScore - baseline.summary.averageTrustScore
  );
  const integrityDelta = round2(
    compare.summary.averageIntegrityScore -
      baseline.summary.averageIntegrityScore
  );
  const failureRateDelta = round2(
    failureRate(compare.summary) - failureRate(baseline.summary)
  );

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    healthDelta,
    trustDelta,
    integrityDelta,
    failureRateDelta,
    validationCountDelta:
      compare.summary.totalValidations - baseline.summary.totalValidations,
    regressionDetected:
      healthDelta <= -collapseDropThreshold ||
      trustDelta <= -collapseDropThreshold ||
      integrityDelta <= -collapseDropThreshold,
  };
}

export class AnalyticsSnapshotStore {
  private readonly snapshots = new Map<string, AnalyticsSnapshot>();
  private retention: number;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(snapshot: AnalyticsSnapshot): AnalyticsSnapshot {
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return snapshot;
  }

  load(snapshotId: string): AnalyticsSnapshot | null {
    return this.snapshots.get(snapshotId) ?? null;
  }

  list(): AnalyticsSnapshot[] {
    return [...this.snapshots.values()].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );
  }

  clear(): void {
    this.snapshots.clear();
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

function failureRate(summary: AnalyticsSummary): number {
  if (summary.totalValidations === 0) return 0;
  return (summary.failed / summary.totalValidations) * 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
