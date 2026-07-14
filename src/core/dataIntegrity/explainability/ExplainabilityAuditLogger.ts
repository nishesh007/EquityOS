/**
 * Audit logger for explainability / decision trace operations.
 */

import type { ExplainabilityHealthScore } from "./ExplainabilityMetrics";

export type ExplainabilityAuditEvent =
  | "DecisionTraced"
  | "ExplanationGenerated"
  | "ConfidenceBreakdown"
  | "RuleContributionAnalyzed"
  | "SnapshotCreated"
  | "ExplainabilityScoreComputed"
  | "Warning"
  | "Error";

export interface ExplainabilityAuditEntry {
  timestamp: string;
  event: ExplainabilityAuditEvent;
  traceId?: string;
  decisionId?: string;
  explainabilityHealthScore?: number;
  scoreBreakdown?: ExplainabilityHealthScore;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class ExplainabilityAuditLogger {
  private readonly entries: ExplainabilityAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: ExplainabilityAuditEntry): ExplainabilityAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): ExplainabilityAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  completenessScore(): number {
    if (this.entries.length === 0) return 40;
    const kinds = new Set(this.entries.map((e) => e.event));
    const expected: ExplainabilityAuditEvent[] = [
      "DecisionTraced",
      "ExplanationGenerated",
      "ConfidenceBreakdown",
      "RuleContributionAnalyzed",
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
