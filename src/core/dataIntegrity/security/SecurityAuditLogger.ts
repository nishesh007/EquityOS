/**
 * Audit logger for security / access control operations.
 */

import type { SecurityHealthScore } from "./SecurityMetrics";

export type SecurityAuditEvent =
  | "AccessAttempt"
  | "AccessGranted"
  | "AccessDenied"
  | "PermissionChanged"
  | "PolicyChanged"
  | "RoleChanged"
  | "SnapshotCreated"
  | "SecurityScoreComputed"
  | "Warning"
  | "Error";

export interface SecurityAuditEntry {
  timestamp: string;
  event: SecurityAuditEvent;
  subjectId?: string;
  action?: string;
  resourceId?: string;
  module?: string;
  decision?: "allow" | "deny";
  securityHealthScore?: number;
  scoreBreakdown?: SecurityHealthScore;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class SecurityAuditLogger {
  private readonly entries: SecurityAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: SecurityAuditEntry): SecurityAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): SecurityAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  completenessScore(): number {
    if (this.entries.length === 0) return 40;
    const kinds = new Set(this.entries.map((e) => e.event));
    const expected: SecurityAuditEvent[] = [
      "AccessAttempt",
      "AccessGranted",
      "AccessDenied",
      "PolicyChanged",
      "PermissionChanged",
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
