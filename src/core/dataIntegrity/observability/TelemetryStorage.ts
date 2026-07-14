/**
 * Telemetry storage — rolling buffer, retention, snapshot archive hooks.
 */

import type { TelemetryConfiguration } from "./TelemetryConfiguration";
import type { TelemetryRecord } from "./TelemetryCollector";
import type { MetricsSnapshot } from "./MetricsCollector";
import type { DistributedTrace } from "./TraceCollector";
import type { ObservabilityEvent } from "./EventCollector";

export interface TelemetryStorageEntry {
  entryId: string;
  storedAt: string;
  records: TelemetryRecord[];
  metrics: MetricsSnapshot | null;
  traces: DistributedTrace[];
  events: ObservabilityEvent[];
  compressed: boolean;
}

export class TelemetryStorage {
  private readonly buffer: TelemetryStorageEntry[] = [];
  private dropped = 0;
  private ok = true;

  constructor(private config: TelemetryConfiguration) {}

  setConfiguration(config: TelemetryConfiguration): void {
    this.config = config;
  }

  store(input: {
    records: TelemetryRecord[];
    metrics: MetricsSnapshot | null;
    traces: DistributedTrace[];
    events: ObservabilityEvent[];
  }): {
    entry: TelemetryStorageEntry | null;
    dropped: number;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      this.enforceRetention();
      while (this.buffer.length >= this.config.bufferSize) {
        this.buffer.shift();
        this.dropped += 1;
      }

      const entry: TelemetryStorageEntry = {
        entryId: `store:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
        storedAt: new Date().toISOString(),
        records: input.records.map((r) => ({ ...r })),
        metrics: input.metrics ? { ...input.metrics } : null,
        traces: input.traces.map((t) => ({
          ...t,
          childTraceIds: [...t.childTraceIds],
          criticalPath: [...t.criticalPath],
          executionTree: t.executionTree.map((s) => ({
            ...s,
            attributes: { ...s.attributes },
          })),
          pipelineTimeline: t.pipelineTimeline.map((s) => ({
            ...s,
            attributes: { ...s.attributes },
          })),
          ruleTimeline: t.ruleTimeline.map((s) => ({
            ...s,
            attributes: { ...s.attributes },
          })),
        })),
        events: input.events.map((e) => ({
          ...e,
          payload: { ...e.payload },
        })),
        compressed: this.config.compressionEnabled,
      };

      // Compression hook — future adapters may replace payload representation.
      if (this.config.compressionEnabled) {
        warnings.push("Compression hook enabled (in-memory marker only).");
      }

      this.buffer.push(entry);
      this.ok = true;
      return { entry, dropped: 0, warnings, errors };
    } catch (err) {
      this.ok = false;
      this.dropped += 1;
      errors.push(`Storage failed: ${String(err)}`);
      return { entry: null, dropped: 1, warnings, errors };
    }
  }

  list(limit?: number): TelemetryStorageEntry[] {
    if (limit === undefined) return this.buffer.map(cloneEntry);
    return this.buffer.slice(-limit).map(cloneEntry);
  }

  getDroppedCount(): number {
    return this.dropped;
  }

  isHealthy(): boolean {
    return this.ok;
  }

  size(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer.length = 0;
    this.dropped = 0;
    this.ok = true;
  }

  private enforceRetention(): void {
    const cutoff = Date.now() - this.config.retentionPeriodMs;
    while (
      this.buffer.length > 0 &&
      new Date(this.buffer[0]!.storedAt).getTime() < cutoff
    ) {
      this.buffer.shift();
    }
  }
}

function cloneEntry(entry: TelemetryStorageEntry): TelemetryStorageEntry {
  return JSON.parse(JSON.stringify(entry)) as TelemetryStorageEntry;
}
