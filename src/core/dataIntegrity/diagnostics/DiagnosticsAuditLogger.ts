/**
 * Audit logger for diagnostics runs.
 */

import type { DiagnosticsMode } from "./DiagnosticsConfiguration";

export interface DiagnosticsAuditEntry {
  timestamp: string;
  event: "DiagnosticsRun" | "SnapshotCreated" | "TraceGenerated" | "ProfileGenerated";
  mode?: DiagnosticsMode;
  executionTimeMs: number;
  healthScore: number;
  warnings: string[];
  errors: string[];
  profilerSummary?: string;
  engineVersion: string;
}

export class DiagnosticsAuditLogger {
  private readonly entries: DiagnosticsAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: DiagnosticsAuditEntry): DiagnosticsAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): DiagnosticsAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
