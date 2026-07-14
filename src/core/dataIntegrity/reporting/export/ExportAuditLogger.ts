/**
 * Export audit logger (Prompt 9F.R1).
 */

import type { ExportableFormat, ExportUserRole } from "./ExportConfiguration";

export interface ExportAuditEntry {
  exportTime: string;
  reportType: string;
  reportId?: string;
  userRole: ExportUserRole | string;
  userId?: string;
  exportFormat: ExportableFormat | string;
  executionTimeMs: number;
  success: boolean;
  failure?: boolean;
  errorMessage?: string;
  previewOnly?: boolean;
  engineVersion: string;
}

export class ExportAuditLogger {
  private readonly entries: ExportAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = Math.max(1, n);
  }

  append(entry: ExportAuditEntry): ExportAuditEntry {
    const normalized: ExportAuditEntry = {
      ...entry,
      failure: entry.failure ?? !entry.success,
    };
    this.entries.push(normalized);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return normalized;
  }

  getLog(limit?: number): ExportAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
