/**
 * Telemetry aggregator — coverage scores and observability score.
 */

import type { TelemetryConfiguration } from "./TelemetryConfiguration";
import type { TelemetryRecord } from "./TelemetryCollector";
import type { MetricsSnapshot } from "./MetricsCollector";
import type { DistributedTrace } from "./TraceCollector";
import type { ObservabilityEvent } from "./EventCollector";

export interface ObservabilityScoreBreakdown {
  telemetryCoverage: number;
  metricsCoverage: number;
  traceCoverage: number;
  eventCoverage: number;
  healthVisibility: number;
  storageReliability: number;
  overall: number;
}

export interface AggregatedTelemetry {
  score: ObservabilityScoreBreakdown;
  recordCount: number;
  metricSampleCount: number;
  traceCount: number;
  eventCount: number;
  sourceCoveragePct: number;
  aggregatedAt: string;
  warnings: string[];
  errors: string[];
}

export class TelemetryAggregator {
  constructor(private config: TelemetryConfiguration) {}

  setConfiguration(config: TelemetryConfiguration): void {
    this.config = config;
  }

  aggregate(input: {
    records: TelemetryRecord[];
    metrics: MetricsSnapshot | null;
    traces: DistributedTrace[];
    events: ObservabilityEvent[];
    registeredSourceCount: number;
    droppedEvents: number;
    storageOk: boolean;
  }): AggregatedTelemetry {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const sourceCoveragePct = clamp(
        (input.registeredSourceCount / this.config.expectedSourceCount) * 100,
        0,
        100
      );

      const telemetryCoverage = clamp(
        sourceCoveragePct * 0.6 +
          Math.min(40, input.records.length * 2),
        0,
        100
      );

      const metricsCoverage =
        input.metrics == null
          ? 0
          : clamp(
              40 +
                (input.metrics.sampleCount > 0 ? 40 : 0) +
                (input.metrics.healthScore > 0 ? 20 : 0),
              0,
              100
            );

      const traceCoverage =
        input.traces.length === 0
          ? 0
          : clamp(
              50 +
                Math.min(30, input.traces.length * 5) +
                Math.min(
                  20,
                  input.traces.reduce((s, t) => s + t.depth, 0)
                ),
              0,
              100
            );

      const knownEventTypes = new Set(input.events.map((e) => e.eventType));
      const eventCoverage = clamp(knownEventTypes.size * 8, 0, 100);

      const healthVisibility = clamp(
        input.metrics?.healthScore ??
          (input.records.length > 0 ? 70 : 0),
        0,
        100
      );

      const storageReliability = clamp(
        input.storageOk
          ? 100 - Math.min(40, input.droppedEvents * 2)
          : 40,
        0,
        100
      );

      if (input.droppedEvents > 0) {
        warnings.push(`${input.droppedEvents} dropped event(s) observed.`);
      }

      const w = this.config.scoreWeights;
      const weighted =
        telemetryCoverage * w.telemetryCoverage +
        metricsCoverage * w.metricsCoverage +
        traceCoverage * w.traceCoverage +
        eventCoverage * w.eventCoverage +
        healthVisibility * w.healthVisibility +
        storageReliability * w.storageReliability;
      const weightSum =
        w.telemetryCoverage +
        w.metricsCoverage +
        w.traceCoverage +
        w.eventCoverage +
        w.healthVisibility +
        w.storageReliability;
      const overall = round2(weightSum === 0 ? 0 : weighted / weightSum);

      return {
        score: {
          telemetryCoverage: round2(telemetryCoverage),
          metricsCoverage: round2(metricsCoverage),
          traceCoverage: round2(traceCoverage),
          eventCoverage: round2(eventCoverage),
          healthVisibility: round2(healthVisibility),
          storageReliability: round2(storageReliability),
          overall,
        },
        recordCount: input.records.length,
        metricSampleCount: input.metrics?.sampleCount ?? 0,
        traceCount: input.traces.length,
        eventCount: input.events.length,
        sourceCoveragePct: round2(sourceCoveragePct),
        aggregatedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Aggregation failed: ${String(err)}`);
      return {
        score: {
          telemetryCoverage: 0,
          metricsCoverage: 0,
          traceCoverage: 0,
          eventCoverage: 0,
          healthVisibility: 0,
          storageReliability: 0,
          overall: 0,
        },
        recordCount: 0,
        metricSampleCount: 0,
        traceCount: 0,
        eventCount: 0,
        sourceCoveragePct: 0,
        aggregatedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
