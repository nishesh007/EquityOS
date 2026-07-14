/**
 * Audit logger for performance / capacity operations.
 */

import type { PerformanceHealthScore } from "./PerformanceMetrics";

export type PerformanceAuditEvent =
  | "BenchmarkRun"
  | "LatencyAnalyzed"
  | "ThroughputAnalyzed"
  | "CapacityPlanned"
  | "ResourceAnalyzed"
  | "ScalabilityAnalyzed"
  | "SnapshotCreated"
  | "PerformanceScoreComputed"
  | "Warning"
  | "Error";

export interface PerformanceAuditEntry {
  timestamp: string;
  event: PerformanceAuditEvent;
  benchmarkId?: string;
  mode?: string;
  performanceHealthScore?: number;
  scoreBreakdown?: PerformanceHealthScore;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class PerformanceAuditLogger {
  private readonly entries: PerformanceAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: PerformanceAuditEntry): PerformanceAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): PerformanceAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
