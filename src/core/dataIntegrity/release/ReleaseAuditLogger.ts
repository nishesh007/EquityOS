/**
 * Audit logger for release certification operations.
 */

import type { ReleaseHealthScore } from "./ReleaseMetrics";

export type ReleaseAuditEvent =
  | "CertificationRun"
  | "ReadinessEvaluated"
  | "DeploymentReviewed"
  | "RiskAssessed"
  | "ChecklistCompleted"
  | "SnapshotCreated"
  | "ReleaseScoreComputed"
  | "Warning"
  | "Error";

export interface ReleaseAuditEntry {
  timestamp: string;
  event: ReleaseAuditEvent;
  certificationId?: string;
  releaseScore?: number;
  scoreBreakdown?: ReleaseHealthScore;
  status?: string;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class ReleaseAuditLogger {
  private readonly entries: ReleaseAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: ReleaseAuditEntry): ReleaseAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): ReleaseAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
