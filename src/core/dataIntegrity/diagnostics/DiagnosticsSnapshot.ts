/**
 * Diagnostics snapshots with compare and regression detection.
 */

import type { DiagnosticsConfiguration } from "./DiagnosticsConfiguration";
import type { DiagnosticsHealthBreakdown } from "./DiagnosticsHealthChecker";
import type { ProfileResult } from "./DiagnosticsProfiler";

export interface DiagnosticsSnapshotPayload {
  health: DiagnosticsHealthBreakdown;
  profileSummary: {
    executionTimeMs: number;
    memoryUsageBytes: number;
    slowRuleCount: number;
    slowPipelineCount: number;
  };
  configuration: {
    profilerEnabled: boolean;
    tracingEnabled: boolean;
    samplingRate: number;
    environment: string;
    engineVersion: string;
  };
  ruleCount: number;
  pipelineCount: number;
  engineCount: number;
  mode: string;
}

export interface DiagnosticsSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: DiagnosticsSnapshotPayload;
}

export interface DiagnosticsSnapshotComparison {
  baselineId: string;
  compareId: string;
  healthDelta: number;
  runtimeDeltaMs: number;
  memoryDeltaBytes: number;
  ruleCountDelta: number;
  pipelineCountDelta: number;
  configurationChanged: boolean;
  regressionDetected: boolean;
  regressionReasons: string[];
  performanceChanged: boolean;
}

export function createDiagnosticsSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `diag:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareDiagnosticsSnapshots(
  baseline: DiagnosticsSnapshot,
  compare: DiagnosticsSnapshot,
  config: DiagnosticsConfiguration
): DiagnosticsSnapshotComparison {
  const healthDelta = round2(
    compare.payload.health.overallHealthScore -
      baseline.payload.health.overallHealthScore
  );
  const runtimeDeltaMs = round2(
    compare.payload.profileSummary.executionTimeMs -
      baseline.payload.profileSummary.executionTimeMs
  );
  const memoryDeltaBytes =
    compare.payload.profileSummary.memoryUsageBytes -
    baseline.payload.profileSummary.memoryUsageBytes;

  const configurationChanged =
    JSON.stringify(baseline.payload.configuration) !==
    JSON.stringify(compare.payload.configuration);

  const regressionReasons: string[] = [];
  if (healthDelta <= -config.regressionHealthDropThreshold) {
    regressionReasons.push(
      `Health dropped by ${Math.abs(healthDelta)} (threshold ${config.regressionHealthDropThreshold}).`
    );
  }
  const baselineRuntime = Math.max(
    1,
    baseline.payload.profileSummary.executionTimeMs
  );
  const runtimeIncreasePct = (runtimeDeltaMs / baselineRuntime) * 100;
  if (runtimeIncreasePct >= config.regressionRuntimeIncreasePct) {
    regressionReasons.push(
      `Runtime increased by ${round2(runtimeIncreasePct)}% (threshold ${config.regressionRuntimeIncreasePct}%).`
    );
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    healthDelta,
    runtimeDeltaMs,
    memoryDeltaBytes,
    ruleCountDelta:
      compare.payload.ruleCount - baseline.payload.ruleCount,
    pipelineCountDelta:
      compare.payload.pipelineCount - baseline.payload.pipelineCount,
    configurationChanged,
    regressionDetected: regressionReasons.length > 0,
    regressionReasons,
    performanceChanged:
      Math.abs(runtimeDeltaMs) > 0 || Math.abs(memoryDeltaBytes) > 0,
  };
}

export class DiagnosticsSnapshotStore {
  private readonly snapshots = new Map<string, DiagnosticsSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(
    payload: DiagnosticsSnapshotPayload,
    label?: string
  ): DiagnosticsSnapshot {
    this.versionSeq += 1;
    const snapshot: DiagnosticsSnapshot = {
      snapshotId: createDiagnosticsSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload,
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return snapshot;
  }

  load(snapshotId: string): DiagnosticsSnapshot | null {
    return this.snapshots.get(snapshotId) ?? null;
  }

  list(): DiagnosticsSnapshot[] {
    return [...this.snapshots.values()].sort(
      (a, b) => a.version - b.version
    );
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

export function buildSnapshotPayload(input: {
  health: DiagnosticsHealthBreakdown;
  profile: ProfileResult | null;
  configuration: DiagnosticsConfiguration;
  ruleCount: number;
  pipelineCount: number;
  engineCount: number;
  mode: string;
}): DiagnosticsSnapshotPayload {
  return {
    health: { ...input.health },
    profileSummary: {
      executionTimeMs: input.profile?.executionTimeMs ?? 0,
      memoryUsageBytes: input.profile?.memoryUsageBytes ?? 0,
      slowRuleCount: input.profile?.slowestRules.length ?? 0,
      slowPipelineCount: input.profile?.slowestPipelines.length ?? 0,
    },
    configuration: {
      profilerEnabled: input.configuration.profilerEnabled,
      tracingEnabled: input.configuration.tracingEnabled,
      samplingRate: input.configuration.samplingRate,
      environment: input.configuration.environment,
      engineVersion: input.configuration.engineVersion,
    },
    ruleCount: input.ruleCount,
    pipelineCount: input.pipelineCount,
    engineCount: input.engineCount,
    mode: input.mode,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
