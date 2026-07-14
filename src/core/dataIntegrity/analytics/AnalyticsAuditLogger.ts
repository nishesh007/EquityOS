/**
 * Audit logger for analytics runs.
 */

export interface AnalyticsAuditEntry {
  timestamp: string;
  analyticsRunId: string;
  executionTimeMs: number;
  healthScore: number;
  predictionSummary: string;
  warnings: string[];
  errors: string[];
  engineVersion: string;
  observationCount: number;
}

export class AnalyticsAuditLogger {
  private readonly entries: AnalyticsAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: AnalyticsAuditEntry): AnalyticsAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): AnalyticsAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
