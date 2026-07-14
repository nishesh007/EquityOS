/**
 * Advanced Rule Engine — audit logger.
 * Stores rule execution history for institutional traceability.
 */

import type { DatasetType } from "../IntegrityTypes";
import type { RuleAuditEntry, RuleExecutionResult } from "./RuleTypes";

export class RuleAuditLogger {
  private readonly entries: RuleAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 10_000) {
    this.maxEntries = maxEntries;
  }

  record(
    result: RuleExecutionResult,
    meta: { datasetType: DatasetType; dataSource: string }
  ): void {
    this.entries.push({
      ruleId: result.ruleId,
      ruleName: result.ruleName,
      status: result.status,
      executionTime: result.executionTime,
      result: result.status,
      error: result.error,
      datasetType: meta.datasetType,
      dataSource: meta.dataSource,
      scoreImpact: result.scoreImpact,
      timestamp: new Date().toISOString(),
      version: result.version,
    });

    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }

  getAuditHistory(limit?: number): RuleAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-Math.max(0, limit));
  }

  getByRule(ruleId: string): RuleAuditEntry[] {
    return this.entries.filter((e) => e.ruleId === ruleId);
  }

  clear(): void {
    this.entries.length = 0;
  }

  size(): number {
    return this.entries.length;
  }
}
