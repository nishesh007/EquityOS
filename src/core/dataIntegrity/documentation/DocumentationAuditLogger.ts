/**
 * Audit logger for documentation / DX operations.
 */

import type { DocumentationHealthScore } from "./DocumentationMetrics";

export type DocumentationAuditEvent =
  | "DocsGenerated"
  | "ApiDocsGenerated"
  | "ArchitectureDocsGenerated"
  | "ModuleDocsGenerated"
  | "RuleDocsGenerated"
  | "GuideGenerated"
  | "SnapshotCreated"
  | "DocumentationScoreComputed"
  | "Warning"
  | "Error";

export interface DocumentationAuditEntry {
  timestamp: string;
  event: DocumentationAuditEvent;
  documentId?: string;
  documentationHealthScore?: number;
  scoreBreakdown?: DocumentationHealthScore;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class DocumentationAuditLogger {
  private readonly entries: DocumentationAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: DocumentationAuditEntry): DocumentationAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): DocumentationAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  completenessScore(): number {
    if (this.entries.length === 0) return 40;
    const kinds = new Set(this.entries.map((e) => e.event));
    const expected: DocumentationAuditEvent[] = [
      "ApiDocsGenerated",
      "ArchitectureDocsGenerated",
      "ModuleDocsGenerated",
      "GuideGenerated",
      "SnapshotCreated",
    ];
    const hit = expected.filter((k) => kinds.has(k)).length;
    return clamp(Math.round((hit / expected.length) * 100), 0, 100);
  }

  reset(): void {
    this.entries.length = 0;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
