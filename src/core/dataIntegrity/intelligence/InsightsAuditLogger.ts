/**
 * Audit logger for intelligence / insights operations.
 */

import type { InsightScoreBreakdown } from "./InsightScoring";

export type InsightsAuditEvent =
  | "InsightsGenerated"
  | "PatternsDetected"
  | "CorrelationsFound"
  | "RecommendationsGenerated"
  | "SnapshotCreated";

export interface InsightsAuditEntry {
  timestamp: string;
  event: InsightsAuditEvent;
  insightScore?: number;
  scoreBreakdown?: InsightScoreBreakdown;
  patternCount?: number;
  correlationCount?: number;
  recommendationCount?: number;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class InsightsAuditLogger {
  private readonly entries: InsightsAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: InsightsAuditEntry): InsightsAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): InsightsAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
