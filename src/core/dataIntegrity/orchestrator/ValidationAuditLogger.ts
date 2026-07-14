/**
 * Audit logger for orchestrated validation requests.
 */

import type { ValidationEngineId } from "./ValidationConfiguration";
import type { ValidationStatus } from "./ValidationResponse";
import type { WorkflowState } from "./ValidationWorkflow";

export interface OrchestratorAuditEntry {
  requestId: string;
  timestamp: string;
  pipeline?: string;
  modulesExecuted: ValidationEngineId[];
  scores: Record<string, number | undefined>;
  warnings: string[];
  errors: string[];
  executionTimeMs: number;
  engineVersions: Record<string, string>;
  validationStatus: ValidationStatus;
  workflowState: WorkflowState;
  engineVersion: string;
}

export class ValidationAuditLogger {
  private readonly entries: OrchestratorAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: OrchestratorAuditEntry): OrchestratorAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(requestId?: string): OrchestratorAuditEntry[] {
    if (!requestId) return [...this.entries];
    return this.entries.filter((e) => e.requestId === requestId);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
