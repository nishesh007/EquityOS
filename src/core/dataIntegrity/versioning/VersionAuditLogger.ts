/**
 * Audit logger for versioning / migration operations.
 */

import type { VersionHealthScore } from "./MigrationEngine";

export type VersionAuditEvent =
  | "VersionRegistered"
  | "MigrationPlanned"
  | "MigrationValidated"
  | "CompatibilityChecked"
  | "RollbackPlanned"
  | "SnapshotCreated";

export interface VersionAuditEntry {
  timestamp: string;
  event: VersionAuditEvent;
  versionHealthScore?: number;
  scoreBreakdown?: VersionHealthScore;
  fromVersion?: string;
  toVersion?: string;
  planId?: string;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class VersionAuditLogger {
  private readonly entries: VersionAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: VersionAuditEntry): VersionAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): VersionAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
