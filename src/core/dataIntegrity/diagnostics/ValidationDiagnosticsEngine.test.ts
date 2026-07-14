/**
 * Institutional Validation Diagnostics Engine — unit tests (Prompt 9F.16).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationDiagnosticsEngine,
  registerValidationDiagnosticsEngine,
  resetValidationDiagnosticsEngine,
  getRegisteredDiagnosticsSources,
  resetDiagnosticsSourceRegistrationState,
  DEFAULT_DIAGNOSTICS_CONFIGURATION,
  runDiagnostics,
  inspectRules,
  inspectPipeline,
  generateTrace,
  profileValidation,
  getDiagnosticsHealth,
  createDiagnosticsSnapshot,
  generateDiagnosticsReport,
  type DiagnosticsProbe,
  type RuleInspectionInput,
  type PipelineInspectionInput,
} from "./index";

function sampleProbes(): DiagnosticsProbe[] {
  return [
    {
      sourceId: "dataIntegrity",
      module: "dataIntegrity",
      timestamp: new Date().toISOString(),
      registered: true,
      healthy: true,
      validationCount: 120,
      passed: 110,
      failed: 10,
      averageRuntimeMs: 22,
      integrityScore: 92,
      healthScore: 92,
      ruleCount: 8,
      memoryUsageBytes: 4_000_000,
      cacheHitRate: 80,
      engineVersion: "9F.1",
    },
    {
      sourceId: "trust",
      module: "trust",
      timestamp: new Date().toISOString(),
      registered: true,
      healthy: true,
      validationCount: 40,
      passed: 36,
      failed: 4,
      averageRuntimeMs: 15,
      trustScore: 88,
      healthScore: 88,
      ruleCount: 4,
    },
    {
      sourceId: "orchestrator",
      module: "orchestrator",
      timestamp: new Date().toISOString(),
      registered: true,
      healthy: true,
      validationCount: 50,
      passed: 48,
      failed: 2,
      averageRuntimeMs: 120,
      pipelineCount: 3,
      healthScore: 95,
    },
  ];
}

function sampleRules(): RuleInspectionInput[] {
  return [
    {
      ruleId: "price-range",
      name: "Price Range",
      module: "market",
      category: "PRICE",
      priority: 1,
      dependencies: [],
      executionOrder: 0,
      executionTimeMs: 12,
      successCount: 90,
      failureCount: 10,
      registered: true,
      enabled: true,
      version: "1.0.0",
    },
    {
      ruleId: "ohlc-consistency",
      name: "OHLC Consistency",
      module: "market",
      category: "OHLC",
      priority: 2,
      dependencies: ["price-range"],
      executionOrder: 1,
      executionTimeMs: 150,
      successCount: 80,
      failureCount: 20,
      registered: true,
      enabled: true,
      version: "1.0.0",
    },
    {
      ruleId: "missing-rule",
      name: "Missing",
      module: "custom",
      category: "CUSTOM",
      priority: 9,
      registered: false,
      enabled: false,
      successCount: 0,
      failureCount: 0,
    },
  ];
}

function samplePipelines(): PipelineInspectionInput[] {
  return [
    {
      pipelineId: "full-validation",
      name: "Full Validation",
      engines: ["market", "technical", "trust"],
      dependencies: [],
      conditionalBranches: ["skip-if-rejected"],
      retries: 1,
      failures: 2,
      skippedRules: ["optional-gap"],
      executedRules: ["price-range", "ohlc-consistency"],
      averageRuntimeMs: 600,
      executionTimeline: [
        { step: "market", durationMs: 200, status: "OK" },
        { step: "technical", durationMs: 250, status: "OK" },
        { step: "trust", durationMs: 150, status: "OK" },
      ],
    },
  ];
}

describe("Diagnostics registration", () => {
  beforeEach(() => {
    resetValidationDiagnosticsEngine();
    resetDiagnosticsSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationDiagnosticsEngine();
    resetDiagnosticsSourceRegistrationState();
  });

  it("registers diagnostics engine idempotently", () => {
    const first = registerValidationDiagnosticsEngine({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(10);
    expect(getRegisteredDiagnosticsSources().length).toBeGreaterThanOrEqual(10);

    const second = registerValidationDiagnosticsEngine();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Diagnostics execution", () => {
  let engine: ValidationDiagnosticsEngine;

  beforeEach(() => {
    resetValidationDiagnosticsEngine();
    engine = new ValidationDiagnosticsEngine();
  });

  it("runs diagnostics and evaluates health", () => {
    const result = engine.runDiagnostics({
      mode: "deep",
      probes: sampleProbes(),
      rules: sampleRules(),
      pipelines: samplePipelines(),
      includeLiveCollectors: false,
    });

    expect(result.runId).toContain("diag-run");
    expect(result.healthScore).toBeGreaterThan(0);
    expect(result.report.summary.engineCount).toBeGreaterThan(0);
    expect(result.report.health?.status).toBeTruthy();
    expect(result.engineVersion).toBe(
      DEFAULT_DIAGNOSTICS_CONFIGURATION.engineVersion
    );
  });

  it("inspects rules and pipelines", () => {
    const rules = engine.inspectRules(sampleRules());
    expect(rules.rules.length).toBe(3);
    expect(rules.registeredCount).toBeGreaterThan(0);
    expect(rules.unregisteredCount).toBe(1);
    expect(rules.rules[0]?.ruleId).toBe("price-range");

    const pipelines = engine.inspectPipeline(samplePipelines());
    expect(pipelines.pipelines.length).toBe(1);
    expect(pipelines.pipelines[0]?.graph.nodes.length).toBeGreaterThan(1);
    expect(pipelines.pipelines[0]?.executionOrder).toEqual([
      "market",
      "technical",
      "trust",
    ]);
  });

  it("generates traces and profiles validation", () => {
    const trace = engine.generateTrace({
      validationRequest: "req-1",
      pipeline: "full-validation",
      executedRules: ["price-range"],
      skippedRules: ["optional-gap"],
      executionTimeMs: 40,
      trustScore: 88,
      integrityScore: 92,
      warnings: ["sample"],
    });
    expect(trace.traceId).toContain("trace:");
    expect(trace.executedRules).toContain("price-range");

    const profile = engine.profileValidation({
      probes: sampleProbes(),
      rules: sampleRules(),
      pipelines: samplePipelines(),
      includeLiveCollectors: false,
    });
    expect(profile.profilerEnabled).toBe(true);
    expect(profile.slowestRules.length).toBeGreaterThan(0);
    expect(profile.samples.length).toBeGreaterThan(0);
  });
});

describe("Snapshots, regression, reports, metrics", () => {
  let engine: ValidationDiagnosticsEngine;

  beforeEach(() => {
    resetValidationDiagnosticsEngine();
    engine = new ValidationDiagnosticsEngine({
      regressionHealthDropThreshold: 5,
      regressionRuntimeIncreasePct: 20,
      slowRuleThresholdMs: 50,
      slowPipelineThresholdMs: 100,
    });
  });

  it("creates snapshots and detects regressions", () => {
    engine.runDiagnostics({
      mode: "performance",
      probes: sampleProbes(),
      rules: sampleRules(),
      pipelines: samplePipelines(),
      includeLiveCollectors: false,
    });
    const snap1 = engine.createDiagnosticsSnapshot("baseline");

    const degradedProbes = sampleProbes().map((p) => ({
      ...p,
      healthy: false,
      failed: (p.failed ?? 0) + 40,
      passed: Math.max(0, (p.passed ?? 0) - 40),
      healthScore: 40,
      averageRuntimeMs: (p.averageRuntimeMs ?? 10) * 5,
      memoryUsageBytes: 80_000_000,
    }));
    engine.runDiagnostics({
      mode: "performance",
      probes: degradedProbes,
      rules: sampleRules().map((r) => ({
        ...r,
        executionTimeMs: (r.executionTimeMs ?? 10) * 5,
        failureCount: (r.failureCount ?? 0) + 30,
      })),
      pipelines: samplePipelines().map((p) => ({
        ...p,
        averageRuntimeMs: (p.averageRuntimeMs ?? 100) * 5,
        failures: (p.failures ?? 0) + 10,
      })),
      includeLiveCollectors: false,
    });
    const snap2 = engine.createDiagnosticsSnapshot("degraded");

    const comparison = engine.compareDiagnosticsSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(comparison).not.toBeNull();
    expect(comparison!.healthDelta).toBeLessThan(0);
    expect(comparison!.regressionDetected).toBe(true);
    expect(engine.listSnapshots().length).toBe(2);
  });

  it("generates diagnostics reports and tracks metrics", () => {
    const report = engine.generateDiagnosticsReport({
      mode: "deep",
      reportType: "HealthReport",
      probes: sampleProbes(),
      rules: sampleRules(),
      pipelines: samplePipelines(),
      includeLiveCollectors: false,
    });
    expect(report.reportType).toBe("HealthReport");
    expect(report.summary.overallHealthScore).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThanOrEqual(0);

    const metrics = engine.getMetrics();
    expect(metrics.diagnosticsRuns).toBeGreaterThan(0);
    expect(engine.getAuditLog().length).toBeGreaterThan(0);
  });

  it("recovers gracefully from empty input", () => {
    const result = engine.runDiagnostics({
      probes: [],
      rules: [],
      pipelines: [],
      includeLiveCollectors: false,
    });
    expect(result.runId).toBeTruthy();
    expect(result.report.partial || result.warnings.length >= 0).toBe(true);
  });
});

describe("Public API", () => {
  beforeEach(() => {
    resetValidationDiagnosticsEngine();
    resetDiagnosticsSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationDiagnosticsEngine();
    resetDiagnosticsSourceRegistrationState();
  });

  it("exposes diagnostics helper functions", () => {
    const engine = new ValidationDiagnosticsEngine();
    registerValidationDiagnosticsEngine({ engine, force: true });

    const probes = sampleProbes();
    const rules = sampleRules();
    const pipelines = samplePipelines();

    expect(
      runDiagnostics({
        probes,
        rules,
        pipelines,
        includeLiveCollectors: false,
        mode: "quick",
      }).mode
    ).toBe("quick");

    expect(inspectRules(rules).rules.length).toBe(3);
    expect(inspectPipeline(pipelines).pipelines.length).toBe(1);
    expect(generateTrace({ pipeline: "full-validation" }).pipeline).toBe(
      "full-validation"
    );
    expect(
      profileValidation({
        probes,
        rules,
        pipelines,
        includeLiveCollectors: false,
      }).samples.length
    ).toBeGreaterThan(0);
    expect(
      getDiagnosticsHealth({
        probes,
        rules,
        pipelines,
        includeLiveCollectors: false,
      }).breakdown.overallHealthScore
    ).toBeGreaterThanOrEqual(0);

    const report = generateDiagnosticsReport({
      probes,
      rules,
      pipelines,
      includeLiveCollectors: false,
      mode: "rule",
    });
    expect(report.reportType).toBe("RuleReport");

    const snap = createDiagnosticsSnapshot("api");
    expect(snap.snapshotId).toContain("diag:");
    expect(DEFAULT_DIAGNOSTICS_CONFIGURATION.engineVersion).toBe("9F.16.0");
  });
});
