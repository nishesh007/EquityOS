/**
 * Audit logger for reliability events.
 */

import type { CircuitState } from "./CircuitBreaker";
import type { ResilienceScoreBreakdown } from "./ReliabilityMonitor";

export type ReliabilityAuditEvent =
  | "HealthChecked"
  | "Failure"
  | "Recovery"
  | "Retry"
  | "CircuitStateChanged"
  | "Timeout"
  | "Degradation"
  | "SnapshotCreated";

export interface ReliabilityAuditEntry {
  timestamp: string;
  event: ReliabilityAuditEvent;
  targetId?: string;
  circuitState?: CircuitState;
  resilienceScore?: number;
  scoreBreakdown?: ResilienceScoreBreakdown;
  message?: string;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class ReliabilityAuditLogger {
  private readonly entries: ReliabilityAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: ReliabilityAuditEntry): ReliabilityAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): ReliabilityAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
