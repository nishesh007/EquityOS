/**
 * Audit logger for learning / continuous improvement operations.
 */

import type { LearningHealthScore } from "./LearningMetrics";

export type LearningAuditEvent =
  | "LearningRun"
  | "FeedbackCollected"
  | "PatternsDetected"
  | "ImprovementsGenerated"
  | "TrendAnalyzed"
  | "RegressionLearned"
  | "SnapshotCreated"
  | "LearningScoreComputed"
  | "Warning"
  | "Error";

export interface LearningAuditEntry {
  timestamp: string;
  event: LearningAuditEvent;
  runId?: string;
  learningHealthScore?: number;
  scoreBreakdown?: LearningHealthScore;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class LearningAuditLogger {
  private readonly entries: LearningAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: LearningAuditEntry): LearningAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): LearningAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  completenessScore(): number {
    if (this.entries.length === 0) return 40;
    const kinds = new Set(this.entries.map((e) => e.event));
    const expected: LearningAuditEvent[] = [
      "LearningRun",
      "FeedbackCollected",
      "PatternsDetected",
      "ImprovementsGenerated",
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
