/**
 * Institutional Validation Optimization Engine — unit tests (Prompt 9F.18).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationOptimizationEngine,
  registerValidationOptimizationEngine,
  resetValidationOptimizationEngine,
  getRegisteredOptimizationSources,
  resetOptimizationSourceRegistrationState,
  DEFAULT_OPTIMIZATION_CONFIGURATION,
  runOptimization,
  analyzePerformance,
  optimizePipeline,
  optimizeCache,
  analyzeDependencies,
  getOptimizationMetrics,
  createOptimizationSnapshot,
  type OptimizationProbe,
} from "./index";

function sampleProbes(): OptimizationProbe[] {
  return [
    {
      sourceId: "orchestrator",
      module: "orchestrator",
      timestamp: new Date().toISOString(),
      pipelineId: "full-validation",
      runtimeMs: 650,
      parallelSlots: 2,
      retryCount: 1,
      queueDepth: 20,
      batchSize: 1,
    },
    {
      sourceId: "ruleEngine",
      module: "ruleEngine",
      timestamp: new Date().toISOString(),
      pipelineId: "full-validation",
      ruleId: "price-range",
      runtimeMs: 120,
      dependencies: [],
      cacheHitRate: 55,
      cacheTtlMs: 30_000,
      cacheSize: 100,
      executionOrder: 0,
    },
    {
      sourceId: "ruleEngine",
      module: "ruleEngine",
      timestamp: new Date().toISOString(),
      pipelineId: "full-validation",
      ruleId: "ohlc",
      runtimeMs: 180,
      dependencies: ["price-range", "missing-dep"],
      cacheHitRate: 40,
      cacheTtlMs: 30_000,
      memoryBytes: 60_000_000,
      retryCount: 6,
      executionOrder: 1,
    },
    {
      sourceId: "ruleEngine",
      module: "ruleEngine",
      timestamp: new Date().toISOString(),
      pipelineId: "full-validation",
      ruleId: "ohlc-dup",
      runtimeMs: 175,
      dependencies: ["price-range", "missing-dep"],
      executionOrder: 2,
    },
    {
      sourceId: "ruleEngine",
      module: "ruleEngine",
      timestamp: new Date().toISOString(),
      pipelineId: "idle-pipeline",
      ruleId: "idle-rule",
      runtimeMs: 0,
      successRate: 0,
      dependencies: ["ghost"],
    },
    {
      sourceId: "dashboard",
      module: "dashboard",
      timestamp: new Date().toISOString(),
      runtimeMs: 40,
      cacheHitRate: 50,
      queueDepth: 150,
    },
  ];
}

describe("Optimization registration", () => {
  beforeEach(() => {
    resetValidationOptimizationEngine();
    resetOptimizationSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationOptimizationEngine();
    resetOptimizationSourceRegistrationState();
  });

  it("registers optimization engine idempotently", () => {
    const first = registerValidationOptimizationEngine({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(8);
    expect(getRegisteredOptimizationSources().length).toBeGreaterThanOrEqual(8);

    const second = registerValidationOptimizationEngine();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Optimization analysis", () => {
  let engine: ValidationOptimizationEngine;

  beforeEach(() => {
    resetValidationOptimizationEngine();
    engine = new ValidationOptimizationEngine({
      slowRuleThresholdMs: 100,
      slowPipelineThresholdMs: 500,
      retryFrequencyThreshold: 5,
      queueCongestionThreshold: 100,
      highMemoryThresholdBytes: 50 * 1024 * 1024,
      cacheHitTargetPct: 80,
    });
  });

  it("runs full optimization and scores results", () => {
    const result = engine.runOptimization({
      mode: "full",
      probes: sampleProbes(),
      includeLiveCollectors: false,
    });
    expect(result.advisoryOnly).toBe(true);
    expect(result.optimizationScore).toBeGreaterThanOrEqual(0);
    expect(result.optimizationScore).toBeLessThanOrEqual(100);
    expect(result.plan.score.pipelineEfficiency).toBeGreaterThanOrEqual(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.engineVersion).toBe(
      DEFAULT_OPTIMIZATION_CONFIGURATION.engineVersion
    );
  });

  it("optimizes pipelines and cache", () => {
    const pipeline = engine.optimizePipeline({
      probes: sampleProbes(),
      includeLiveCollectors: false,
    });
    expect(pipeline.suggestedOrder.length).toBeGreaterThan(0);
    expect(pipeline.parallelCandidates.length).toBeGreaterThanOrEqual(0);

    const cache = engine.optimizeCache({
      probes: sampleProbes(),
      includeLiveCollectors: false,
    });
    expect(cache.averageHitRate).not.toBeNull();
    expect(cache.recommendations.length).toBeGreaterThan(0);
    expect(cache.suggestedTtlMs).toBeGreaterThan(0);
  });

  it("analyzes dependencies and performance", () => {
    const deps = engine.analyzeDependencies({
      probes: sampleProbes(),
      includeLiveCollectors: false,
    });
    expect(deps.unusedDependencies.length).toBeGreaterThan(0);
    expect(deps.redundantRules.length).toBeGreaterThan(0);
    expect(deps.idlePipelines).toContain("idle-pipeline");
    expect(deps.dependencyHealth).toBeLessThan(100);

    // circular dependency fixture
    const circular = engine.analyzeDependencies({
      probes: [
        {
          sourceId: "ruleEngine",
          module: "ruleEngine",
          timestamp: new Date().toISOString(),
          ruleId: "a",
          dependencies: ["b"],
          runtimeMs: 10,
        },
        {
          sourceId: "ruleEngine",
          module: "ruleEngine",
          timestamp: new Date().toISOString(),
          ruleId: "b",
          dependencies: ["a"],
          runtimeMs: 10,
        },
      ],
      includeLiveCollectors: false,
    });
    expect(circular.circularDependencies.length).toBeGreaterThan(0);

    const perf = engine.analyzePerformance({
      probes: sampleProbes(),
      includeLiveCollectors: false,
    });
    expect(perf.slowRules.length).toBeGreaterThan(0);
    expect(perf.highMemoryConsumers.length).toBeGreaterThan(0);
    expect(perf.frequentRetries.length).toBeGreaterThan(0);
    expect(perf.queueCongestion.length).toBeGreaterThan(0);
  });
});

describe("Snapshots, metrics, regression", () => {
  let engine: ValidationOptimizationEngine;

  beforeEach(() => {
    resetValidationOptimizationEngine();
    engine = new ValidationOptimizationEngine({
      regressionScoreDropThreshold: 5,
      regressionRuntimeIncreasePct: 20,
      slowPipelineThresholdMs: 100,
      slowRuleThresholdMs: 50,
    });
  });

  it("creates snapshots and detects regressions", () => {
    engine.runOptimization({
      probes: [
        {
          sourceId: "orchestrator",
          module: "orchestrator",
          timestamp: new Date().toISOString(),
          pipelineId: "p1",
          runtimeMs: 50,
          cacheHitRate: 90,
        },
      ],
      includeLiveCollectors: false,
    });
    const snap1 = engine.createOptimizationSnapshot("baseline");

    engine.runOptimization({
      probes: [
        {
          sourceId: "orchestrator",
          module: "orchestrator",
          timestamp: new Date().toISOString(),
          pipelineId: "p1",
          runtimeMs: 800,
          cacheHitRate: 20,
          memoryBytes: 80_000_000,
          retryCount: 10,
          queueDepth: 200,
        },
      ],
      includeLiveCollectors: false,
    });
    const snap2 = engine.createOptimizationSnapshot("degraded");

    const comparison = engine.compareOptimizationSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(comparison).not.toBeNull();
    expect(comparison!.scoreDelta).toBeLessThan(0);
    expect(comparison!.regressionDetected).toBe(true);
    expect(engine.listSnapshots().length).toBe(2);
  });

  it("tracks metrics and audit log", () => {
    engine.runOptimization({
      probes: sampleProbes(),
      includeLiveCollectors: false,
    });
    const metrics = engine.getOptimizationMetrics();
    expect(metrics.optimizationRuns).toBeGreaterThan(0);
    expect(metrics.recommendationCount).toBeGreaterThan(0);
    expect(engine.getAuditLog().length).toBeGreaterThan(0);
  });
});

describe("Public API", () => {
  beforeEach(() => {
    resetValidationOptimizationEngine();
    resetOptimizationSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationOptimizationEngine();
    resetOptimizationSourceRegistrationState();
  });

  it("exposes optimization helpers", () => {
    const engine = new ValidationOptimizationEngine();
    registerValidationOptimizationEngine({ engine, force: true });

    const probes = sampleProbes();
    expect(
      runOptimization({
        probes,
        includeLiveCollectors: false,
        mode: "full",
      }).advisoryOnly
    ).toBe(true);
    expect(
      analyzePerformance({ probes, includeLiveCollectors: false }).slowRules
        .length
    ).toBeGreaterThan(0);
    expect(
      optimizePipeline({ probes, includeLiveCollectors: false }).suggestedOrder
        .length
    ).toBeGreaterThan(0);
    expect(
      optimizeCache({ probes, includeLiveCollectors: false }).cacheEfficiency
    ).toBeGreaterThanOrEqual(0);
    expect(
      analyzeDependencies({ probes, includeLiveCollectors: false })
        .dependencyHealth
    ).toBeGreaterThanOrEqual(0);
    expect(getOptimizationMetrics().optimizationRuns).toBeGreaterThan(0);
    expect(createOptimizationSnapshot("api").snapshotId).toContain("opt:");
    expect(DEFAULT_OPTIMIZATION_CONFIGURATION.engineVersion).toBe("9F.18.0");
  });
});
