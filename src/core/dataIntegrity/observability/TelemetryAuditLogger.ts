/**
 * Audit logger for telemetry / observability operations.
 */

import type { ObservabilityScoreBreakdown } from "./TelemetryAggregator";
import type { TelemetryExportFormat } from "./TelemetryConfiguration";

export type TelemetryAuditEvent =
  | "TelemetryRun"
  | "CollectorStatus"
  | "DroppedEvents"
  | "ExportRequested"
  | "SnapshotCreated";

export interface TelemetryAuditEntry {
  timestamp: string;
  event: TelemetryAuditEvent;
  collector?: string;
  droppedEvents?: number;
  exportFormat?: TelemetryExportFormat;
  observabilityScore?: number;
  scoreBreakdown?: ObservabilityScoreBreakdown;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class TelemetryAuditLogger {
  private readonly entries: TelemetryAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: TelemetryAuditEntry): TelemetryAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): TelemetryAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
