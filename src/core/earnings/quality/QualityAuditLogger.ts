/**
 * Audit logger for advisory earnings quality evaluations.
 */

export type QualityAuditEvent =
  | "QualityAnalysis"
  | "CashFlowEvaluated"
  | "AccrualsEvaluated"
  | "WorkingCapitalEvaluated"
  | "CapitalAllocationEvaluated"
  | "RedFlagsDetected"
  | "ScoreComputed"
  | "SnapshotCreated"
  | "Warning"
  | "Error";

export interface QualityAuditEntry {
  timestamp: string;
  event: QualityAuditEvent;
  symbol?: string;
  qualityScore?: number;
  issueCount?: number;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
  advisoryOnly: true;
}

export class QualityAuditLogger {
  private readonly entries: QualityAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: QualityAuditEntry): QualityAuditEntry {
    const normalized: QualityAuditEntry = {
      ...entry,
      advisoryOnly: true,
      warnings: [...entry.warnings],
      errors: [...entry.errors],
    };
    this.entries.push(normalized);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return normalized;
  }

  getLog(limit?: number): QualityAuditEntry[] {
    if (limit === undefined) return this.entries.map(cloneEntry);
    return this.entries.slice(-limit).map(cloneEntry);
  }

  reset(): void {
    this.entries.length = 0;
  }
}

function cloneEntry(entry: QualityAuditEntry): QualityAuditEntry {
  return {
    ...entry,
    advisoryOnly: true,
    warnings: [...entry.warnings],
    errors: [...entry.errors],
  };
}
