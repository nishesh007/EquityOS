/**
 * Audit logger for report generation.
 */

import type { ReportType } from "./ReportConfiguration";
import type { ReportFilters } from "./ReportFilters";

export interface ReportAuditEntry {
  timestamp: string;
  event: "ReportGenerated" | "SnapshotCreated" | "ExportModelBuilt";
  reportId?: string;
  reportType?: ReportType;
  filters?: ReportFilters;
  warnings: string[];
  errors: string[];
  executionTimeMs: number;
  engineVersion: string;
}

export class ReportAuditLogger {
  private readonly entries: ReportAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: ReportAuditEntry): ReportAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): ReportAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
