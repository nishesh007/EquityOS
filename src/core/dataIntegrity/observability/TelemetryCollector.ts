/**
 * Telemetry collector — validation requests, executions, runtime signals.
 */

import type { TelemetryConfiguration } from "./TelemetryConfiguration";
import type { TelemetrySample } from "./TelemetryRegistry";

export interface TelemetryRecord {
  recordId: string;
  sourceId: string;
  module: string;
  timestamp: string;
  validationRequests: number;
  pipelineExecutions: number;
  ruleExecutions: number;
  executionTimeMs: number;
  memoryBytes: number;
  cpuUsagePct: number | null;
  cacheHits: number;
  cacheMisses: number;
  retries: number;
  timeouts: number;
  failures: number;
  warnings: number;
  events: number;
  sampled: boolean;
}

export class TelemetryCollector {
  private collected = 0;
  private dropped = 0;

  constructor(private config: TelemetryConfiguration) {}

  setConfiguration(config: TelemetryConfiguration): void {
    this.config = config;
  }

  collect(samples: TelemetrySample[]): {
    records: TelemetryRecord[];
    dropped: number;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const records: TelemetryRecord[] = [];
    let dropped = 0;

    try {
      for (const sample of samples) {
        const sampled = Math.random() <= this.config.samplingRate;
        if (!sampled) {
          dropped += 1;
          this.dropped += 1;
          continue;
        }
        records.push({
          recordId: `tel:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
          sourceId: String(sample.sourceId),
          module: sample.module,
          timestamp: sample.timestamp || new Date().toISOString(),
          validationRequests: sample.validationRequests ?? 0,
          pipelineExecutions: sample.pipelineExecutions ?? 0,
          ruleExecutions: sample.ruleExecutions ?? 0,
          executionTimeMs: sample.executionTimeMs ?? sample.latencyMs ?? 0,
          memoryBytes: sample.memoryBytes ?? 0,
          cpuUsagePct: sample.cpuUsagePct ?? null,
          cacheHits: sample.cacheHits ?? 0,
          cacheMisses: sample.cacheMisses ?? 0,
          retries: sample.retries ?? 0,
          timeouts: sample.timeouts ?? 0,
          failures: sample.failures ?? 0,
          warnings: sample.warnings ?? 0,
          events: sample.events ?? 0,
          sampled: true,
        });
        this.collected += 1;
      }
      if (dropped > 0) {
        warnings.push(`${dropped} telemetry sample(s) dropped by sampling.`);
      }
    } catch (err) {
      errors.push(`Telemetry collection failed: ${String(err)}`);
    }

    return { records, dropped, warnings, errors };
  }

  getCollectedCount(): number {
    return this.collected;
  }

  getDroppedCount(): number {
    return this.dropped;
  }

  resetCounters(): void {
    this.collected = 0;
    this.dropped = 0;
  }
}
