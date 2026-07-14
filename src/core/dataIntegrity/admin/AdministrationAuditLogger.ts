/**
 * Governance audit logger for administration actions.
 */

import type { ApprovalStatus } from "./AdministrationConfiguration";

export type AdministrationAuditEvent =
  | "PolicyCreated"
  | "PolicyUpdated"
  | "PolicyDeleted"
  | "PolicyEnabled"
  | "PolicyDisabled"
  | "PolicyCloned"
  | "PolicyRolledBack"
  | "OverrideApplied"
  | "OverrideCleared"
  | "ProfileSwitched"
  | "ConfigurationChanged"
  | "RuleGoverned"
  | "ModuleGoverned"
  | "SnapshotCreated"
  | "SnapshotRolledBack"
  | "ApprovalDecision";

export interface AdministrationAuditEntry {
  timestamp: string;
  event: AdministrationAuditEvent;
  actor?: string;
  targetId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
  approvalStatus?: ApprovalStatus;
  version?: number;
  executionTimeMs: number;
  engineVersion: string;
  warnings: string[];
  errors: string[];
}

export class AdministrationAuditLogger {
  private readonly entries: AdministrationAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: AdministrationAuditEntry): AdministrationAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): AdministrationAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
