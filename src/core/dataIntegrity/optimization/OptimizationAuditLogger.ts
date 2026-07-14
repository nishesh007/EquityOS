/**
 * Audit logger for optimization runs.
 */

import type { OptimizationMode } from "./OptimizationConfiguration";
import type { OptimizationScoreBreakdown } from "./OptimizationPlanner";

export interface OptimizationAuditEntry {
  timestamp: string;
  event: "OptimizationRun" | "SnapshotCreated" | "RecommendationGenerated";
  mode?: OptimizationMode;
  optimizationScore: number;
  scoreBreakdown?: OptimizationScoreBreakdown;
  recommendationCount: number;
  runtimeMs: number;
  warnings: string[];
  errors: string[];
  configurationVersion: string;
  engineVersion: string;
}

export class OptimizationAuditLogger {
  private readonly entries: OptimizationAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: OptimizationAuditEntry): OptimizationAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): OptimizationAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
