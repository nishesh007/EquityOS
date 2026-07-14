/**
 * Audit logger for compliance / governance operations.
 */

import type { ComplianceScoreBreakdown } from "./ComplianceScoreEngine";

export type ComplianceAuditEvent =
  | "ComplianceRun"
  | "ViolationsDetected"
  | "PoliciesEvaluated"
  | "ReportGenerated"
  | "SnapshotCreated";

export interface ComplianceAuditEntry {
  timestamp: string;
  event: ComplianceAuditEvent;
  complianceScore?: number;
  scoreBreakdown?: ComplianceScoreBreakdown;
  violationCount?: number;
  criticalViolationCount?: number;
  policyVersion?: string;
  configurationVersion?: string;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class ComplianceAuditLogger {
  private readonly entries: ComplianceAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: ComplianceAuditEntry): ComplianceAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): ComplianceAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
