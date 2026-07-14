/**
 * Audit logger for dashboard refresh operations.
 */

export interface DashboardAuditEntry {
  timestamp: string;
  event: "DashboardRefresh" | "SnapshotCreate" | "SnapshotLoad" | "HealthCheck";
  executionTimeMs: number;
  moduleCount: number;
  validationCount: number;
  healthScore: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
  cacheHit?: boolean;
}

export class DashboardAuditLogger {
  private readonly entries: DashboardAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: DashboardAuditEntry): DashboardAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): DashboardAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
