/**
 * Platform audit logger.
 */

import type { PlatformHealthReport } from "./PlatformHealth";

export type PlatformAuditEvent =
  | "PlatformInitialized"
  | "PlatformRegistered"
  | "CertificationRun"
  | "IntegrityVerified"
  | "SnapshotCreated"
  | "HealthComputed"
  | "Warning"
  | "Error";

export interface PlatformAuditEntry {
  timestamp: string;
  event: PlatformAuditEvent;
  status?: string;
  healthScore?: number;
  scoreBreakdown?: PlatformHealthReport;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class PlatformAuditLogger {
  private readonly entries: PlatformAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: PlatformAuditEntry): PlatformAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): PlatformAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
