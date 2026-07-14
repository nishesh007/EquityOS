/**
 * Telemetry export models — JSON / CSV / OpenTelemetry-ready / Prometheus-ready.
 * No external integrations; structured models only.
 */

import type { TelemetryExportFormat } from "./TelemetryConfiguration";
import type { TelemetryRecord } from "./TelemetryCollector";
import type { MetricsSnapshot } from "./MetricsCollector";
import type { DistributedTrace } from "./TraceCollector";
import type { ObservabilityEvent } from "./EventCollector";
import type { ObservabilityScoreBreakdown } from "./TelemetryAggregator";

export interface JsonTelemetryExport {
  format: "JSON";
  generatedAt: string;
  score: ObservabilityScoreBreakdown;
  records: TelemetryRecord[];
  metrics: MetricsSnapshot | null;
  traces: DistributedTrace[];
  events: ObservabilityEvent[];
}

export interface CsvTelemetryExport {
  format: "CSV";
  generatedAt: string;
  headers: string[];
  rows: string[][];
}

export interface OpenTelemetryExport {
  format: "OPENTELEMETRY";
  generatedAt: string;
  resource: { serviceName: string; engineVersion: string };
  spans: Array<{
    traceId: string;
    spanId: string;
    parentSpanId: string | null;
    name: string;
    startTimeUnixNano: number;
    endTimeUnixNano: number;
    status: string;
    attributes: Record<string, unknown>;
  }>;
  metrics: Array<{
    name: string;
    value: number;
    unit: string;
  }>;
}

export interface PrometheusExport {
  format: "PROMETHEUS";
  generatedAt: string;
  lines: string[];
}

export type TelemetryExportModel =
  | JsonTelemetryExport
  | CsvTelemetryExport
  | OpenTelemetryExport
  | PrometheusExport;

export class TelemetryExporter {
  export(input: {
    format: TelemetryExportFormat;
    score: ObservabilityScoreBreakdown;
    records: TelemetryRecord[];
    metrics: MetricsSnapshot | null;
    traces: DistributedTrace[];
    events: ObservabilityEvent[];
    engineVersion: string;
  }): TelemetryExportModel {
    const generatedAt = new Date().toISOString();
    switch (input.format) {
      case "CSV":
        return this.toCsv(input, generatedAt);
      case "OPENTELEMETRY":
        return this.toOtel(input, generatedAt);
      case "PROMETHEUS":
        return this.toPrometheus(input, generatedAt);
      case "JSON":
      default:
        return {
          format: "JSON",
          generatedAt,
          score: { ...input.score },
          records: input.records.map((r) => ({ ...r })),
          metrics: input.metrics ? { ...input.metrics } : null,
          traces: input.traces,
          events: input.events,
        };
    }
  }

  private toCsv(
    input: {
      records: TelemetryRecord[];
      metrics: MetricsSnapshot | null;
    },
    generatedAt: string
  ): CsvTelemetryExport {
    const headers = [
      "recordId",
      "module",
      "sourceId",
      "executionTimeMs",
      "failures",
      "warnings",
      "retries",
      "timeouts",
      "cacheHits",
      "cacheMisses",
    ];
    const rows = input.records.map((r) => [
      r.recordId,
      r.module,
      r.sourceId,
      String(r.executionTimeMs),
      String(r.failures),
      String(r.warnings),
      String(r.retries),
      String(r.timeouts),
      String(r.cacheHits),
      String(r.cacheMisses),
    ]);
    if (input.metrics) {
      rows.push([
        "metrics",
        "aggregate",
        "metrics",
        String(input.metrics.averageRuntimeMs),
        String(input.metrics.errorRate),
        String(input.metrics.warningRate),
        "0",
        "0",
        "0",
        "0",
      ]);
    }
    return { format: "CSV", generatedAt, headers, rows };
  }

  private toOtel(
    input: {
      traces: DistributedTrace[];
      metrics: MetricsSnapshot | null;
      engineVersion: string;
    },
    generatedAt: string
  ): OpenTelemetryExport {
    const baseNs = Date.now() * 1_000_000;
    const spans = input.traces.flatMap((trace) =>
      trace.executionTree.map((span) => ({
        traceId: trace.traceId,
        spanId: span.spanId,
        parentSpanId: span.parentSpanId,
        name: span.name,
        startTimeUnixNano: baseNs + span.startOffsetMs * 1_000_000,
        endTimeUnixNano:
          baseNs + (span.startOffsetMs + span.durationMs) * 1_000_000,
        status: span.status,
        attributes: { ...span.attributes, kind: span.kind },
      }))
    );
    const metrics = input.metrics
      ? [
          {
            name: "equityos_validation_latency_ms",
            value: input.metrics.latencyMs,
            unit: "ms",
          },
          {
            name: "equityos_validation_throughput",
            value: input.metrics.throughput,
            unit: "1",
          },
          {
            name: "equityos_validation_error_rate",
            value: input.metrics.errorRate,
            unit: "percent",
          },
          {
            name: "equityos_validation_health_score",
            value: input.metrics.healthScore,
            unit: "1",
          },
        ]
      : [];
    return {
      format: "OPENTELEMETRY",
      generatedAt,
      resource: {
        serviceName: "equityos-validation",
        engineVersion: input.engineVersion,
      },
      spans,
      metrics,
    };
  }

  private toPrometheus(
    input: {
      metrics: MetricsSnapshot | null;
      score: ObservabilityScoreBreakdown;
    },
    generatedAt: string
  ): PrometheusExport {
    const m = input.metrics;
    const lines = [
      `# HELP equityos_observability_score Observability score 0-100`,
      `# TYPE equityos_observability_score gauge`,
      `equityos_observability_score ${input.score.overall}`,
    ];
    if (m) {
      lines.push(
        `# HELP equityos_validation_latency_ms Average validation latency`,
        `# TYPE equityos_validation_latency_ms gauge`,
        `equityos_validation_latency_ms ${m.latencyMs}`,
        `# HELP equityos_validation_throughput Validation throughput`,
        `# TYPE equityos_validation_throughput gauge`,
        `equityos_validation_throughput ${m.throughput}`,
        `# HELP equityos_validation_error_rate Validation error rate percent`,
        `# TYPE equityos_validation_error_rate gauge`,
        `equityos_validation_error_rate ${m.errorRate}`,
        `# HELP equityos_validation_availability Availability percent`,
        `# TYPE equityos_validation_availability gauge`,
        `equityos_validation_availability ${m.availability}`
      );
    }
    lines.push(`# generated_at ${generatedAt}`);
    return { format: "PROMETHEUS", generatedAt, lines };
  }
}
