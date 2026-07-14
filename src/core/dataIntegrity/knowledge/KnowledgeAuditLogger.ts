/**
 * Audit logger for knowledge graph operations.
 */

import type { KnowledgeScoreBreakdown } from "./KnowledgeGraph";

export type KnowledgeAuditEvent =
  | "GraphBuild"
  | "Query"
  | "ImpactAnalysis"
  | "DependencyAnalysis"
  | "SnapshotCreated";

export interface KnowledgeAuditEntry {
  timestamp: string;
  event: KnowledgeAuditEvent;
  knowledgeScore?: number;
  scoreBreakdown?: KnowledgeScoreBreakdown;
  nodeCount?: number;
  edgeCount?: number;
  queryKind?: string;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class KnowledgeAuditLogger {
  private readonly entries: KnowledgeAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: KnowledgeAuditEntry): KnowledgeAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): KnowledgeAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
