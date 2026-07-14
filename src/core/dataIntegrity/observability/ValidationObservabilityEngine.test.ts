/**
 * Institutional Validation Observability Engine — unit tests (Prompt 9F.20).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationObservabilityEngine,
  registerValidationObservabilityEngine,
  resetValidationObservabilityEngine,
  getRegisteredTelemetrySources,
  resetTelemetrySourceRegistrationState,
  DEFAULT_TELEMETRY_CONFIGURATION,
  collectTelemetry,
  collectMetrics,
  collectTrace,
  collectEvent,
  exportTelemetry,
  getObservabilityMetrics,
  createTelemetrySnapshot,
  type TelemetrySample,
} from "./index";

function sampleSamples(): TelemetrySample[] {
  return [
    {
      sourceId: "orchestrator",
      module: "orchestrator",
      timestamp: new Date().toISOString(),
      validationRequests: 100,
      pipelineExecutions: 95,
      executionTimeMs: 120,
      latencyMs: 110,
      failures: 5,
      warnings: 3,
      retries: 2,
      timeouts: 1,
      cacheHits: 40,
      cacheMisses: 10,
      successRate: 95,
      availability: 99,
      healthScore: 90,
      trustScore: 88,
      integrityScore: 92,
      throughput: 50,
    },
    {
      sourceId: "ruleEngine",
      module: "ruleEngine",
      timestamp: new Date().toISOString(),
      ruleExecutions: 200,
      executionTimeMs: 45,
      failures: 8,
      cacheHits: 80,
      cacheMisses: 20,
      successRate: 96,
      healthScore: 91,
    },
    {
      sourceId: "analytics",
      module: "analytics",
      timestamp: new Date().toISOString(),
      validationRequests: 10,
      executionTimeMs: 30,
      healthScore: 85,
      trustScore: 86,
    },
  ];
}

describe("Observability registration", () => {
  beforeEach(() => {
    resetValidationObservabilityEngine();
    resetTelemetrySourceRegistrationState();
  });

  afterEach(() => {
    resetValidationObservabilityEngine();
    resetTelemetrySourceRegistrationState();
  });

  it("registers observability engine idempotently", () => {
    const first = registerValidationObservabilityEngine({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(10);
    expect(getRegisteredTelemetrySources().length).toBeGreaterThanOrEqual(10);

    const second = registerValidationObservabilityEngine();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Telemetry, metrics, traces, events", () => {
  let engine: ValidationObservabilityEngine;

  beforeEach(() => {
    resetValidationObservabilityEngine();
    engine = new ValidationObservabilityEngine({ samplingRate: 1 });
  });

  it("collects telemetry and computes observability score", () => {
    const result = engine.collectTelemetry({
      samples: sampleSamples(),
      includeLiveCollectors: false,
      spans: [
        { name: "pipeline", kind: "pipeline", durationMs: 100 },
        {
          name: "rule-a",
          kind: "rule",
          durationMs: 40,
          parentName: "pipeline",
        },
        {
          name: "rule-b",
          kind: "rule",
          durationMs: 60,
          parentName: "pipeline",
        },
      ],
      events: [
        { eventType: "ValidationStarted", module: "orchestrator" },
        { eventType: "RuleExecuted", module: "ruleEngine" },
        { eventType: "ValidationCompleted", module: "orchestrator" },
      ],
    });

    expect(result.observationalOnly).toBe(true);
    expect(result.records.length).toBe(3);
    expect(result.metrics.successRate).toBeGreaterThan(0);
    expect(result.traces.length).toBe(1);
    expect(result.traces[0]!.criticalPath.length).toBeGreaterThan(0);
    expect(result.events.length).toBe(3);
    expect(result.observabilityScore).toBeGreaterThan(0);
    expect(result.engineVersion).toBe(
      DEFAULT_TELEMETRY_CONFIGURATION.engineVersion
    );
  });

  it("collects metrics, traces, and events independently", () => {
    const metrics = engine.collectMetrics({
      samples: sampleSamples(),
      includeLiveCollectors: false,
    });
    expect(metrics.throughput).toBeGreaterThan(0);
    expect(metrics.latencyMs).toBeGreaterThan(0);

    const trace = engine.collectTrace({
      spans: [
        { name: "root", kind: "pipeline", durationMs: 50 },
        { name: "child", kind: "rule", durationMs: 20, parentName: "root" },
      ],
      parentTraceId: "parent-1",
    });
    expect(trace.traceId).toContain("trace:");
    expect(trace.parentTraceId).toBe("parent-1");
    expect(trace.executionTree.length).toBe(2);
    expect(trace.ruleTimeline.length).toBe(1);

    const event = engine.collectEvent({
      eventType: "OptimizationSuggested",
      module: "optimization",
      severity: "INFO",
    });
    expect(event?.eventId).toContain("oevt:");
  });

  it("builds export models for JSON/CSV/OTel/Prometheus", () => {
    engine.collectTelemetry({
      samples: sampleSamples(),
      includeLiveCollectors: false,
      spans: [{ name: "p", kind: "pipeline", durationMs: 10 }],
      events: [{ eventType: "ReportGenerated", module: "reporting" }],
    });

    const json = engine.exportTelemetry("JSON");
    expect(json.format).toBe("JSON");

    const csv = engine.exportTelemetry("CSV");
    expect(csv.format).toBe("CSV");
    if (csv.format === "CSV") {
      expect(csv.headers.length).toBeGreaterThan(0);
      expect(csv.rows.length).toBeGreaterThan(0);
    }

    const otel = engine.exportTelemetry("OPENTELEMETRY");
    expect(otel.format).toBe("OPENTELEMETRY");
    if (otel.format === "OPENTELEMETRY") {
      expect(otel.resource.serviceName).toBe("equityos-validation");
      expect(otel.spans.length).toBeGreaterThan(0);
    }

    const prom = engine.exportTelemetry("PROMETHEUS");
    expect(prom.format).toBe("PROMETHEUS");
    if (prom.format === "PROMETHEUS") {
      expect(prom.lines.some((l) => l.includes("equityos_observability_score"))).toBe(
        true
      );
    }
  });
});

describe("Storage, snapshots, metrics", () => {
  let engine: ValidationObservabilityEngine;

  beforeEach(() => {
    resetValidationObservabilityEngine();
    engine = new ValidationObservabilityEngine({ samplingRate: 1 });
  });

  it("creates snapshots and detects regressions", () => {
    engine.collectTelemetry({
      samples: sampleSamples(),
      includeLiveCollectors: false,
    });
    const snap1 = engine.createTelemetrySnapshot("baseline");

    engine.collectTelemetry({
      samples: [
        {
          sourceId: "orchestrator",
          module: "orchestrator",
          timestamp: new Date().toISOString(),
          validationRequests: 10,
          failures: 8,
          executionTimeMs: 500,
          latencyMs: 480,
          errorRate: 80,
          successRate: 20,
          healthScore: 20,
          availability: 40,
        },
      ],
      includeLiveCollectors: false,
    });
    const snap2 = engine.createTelemetrySnapshot("degraded");

    const comparison = engine.compareTelemetrySnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(comparison).not.toBeNull();
    expect(comparison!.regressionDetected).toBe(true);
    expect(engine.listSnapshots().length).toBe(2);
  });

  it("tracks operational metrics and audit log", () => {
    engine.collectTelemetry({
      samples: sampleSamples(),
      includeLiveCollectors: false,
    });
    engine.exportTelemetry("JSON");
    const metrics = engine.getObservabilityMetrics();
    expect(metrics.telemetryEvents).toBeGreaterThan(0);
    expect(metrics.exportCount).toBeGreaterThan(0);
    expect(engine.getAuditLog().length).toBeGreaterThan(0);
  });
});

describe("Public API", () => {
  beforeEach(() => {
    resetValidationObservabilityEngine();
    resetTelemetrySourceRegistrationState();
  });

  afterEach(() => {
    resetValidationObservabilityEngine();
    resetTelemetrySourceRegistrationState();
  });

  it("exposes observability helpers", () => {
    const engine = new ValidationObservabilityEngine();
    registerValidationObservabilityEngine({ engine, force: true });

    const samples = sampleSamples();
    expect(
      collectTelemetry({ samples, includeLiveCollectors: false })
        .observationalOnly
    ).toBe(true);
    expect(
      collectMetrics({ samples, includeLiveCollectors: false }).sampleCount
    ).toBeGreaterThan(0);
    expect(collectTrace({ spans: [{ name: "x", durationMs: 5 }] }).depth).toBe(
      1
    );
    expect(
      collectEvent({ eventType: "DashboardUpdated", module: "dashboard" })
        ?.eventType
    ).toBe("DashboardUpdated");
    expect(exportTelemetry("JSON").format).toBe("JSON");
    expect(getObservabilityMetrics().observabilityScore).toBeGreaterThanOrEqual(
      0
    );
    expect(createTelemetrySnapshot("api").snapshotId).toContain("obs:");
    expect(DEFAULT_TELEMETRY_CONFIGURATION.engineVersion).toBe("9F.20.0");
  });
});
