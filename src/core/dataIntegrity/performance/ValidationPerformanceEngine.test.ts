/**
 * Institutional Validation Performance Engine — unit tests (Prompt 9F.26).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationPerformanceEngine,
  registerPerformance,
  resetValidationPerformanceEngine,
  listPerformanceSources,
  resetPerformanceRegistry,
  DEFAULT_PERFORMANCE_CONFIGURATION,
  runBenchmark,
  analyzeLatency,
  analyzeCapacity,
  createPerformanceSnapshot,
  getPerformanceMetrics,
} from "./index";

describe("Performance registration", () => {
  beforeEach(() => {
    resetValidationPerformanceEngine();
    resetPerformanceRegistry();
  });

  afterEach(() => {
    resetValidationPerformanceEngine();
    resetPerformanceRegistry();
  });

  it("registers performance engine idempotently", () => {
    const first = registerPerformance({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(10);
    expect(listPerformanceSources().length).toBeGreaterThanOrEqual(10);

    const second = registerPerformance();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Benchmarks, latency, throughput", () => {
  let engine: ValidationPerformanceEngine;

  beforeEach(() => {
    resetValidationPerformanceEngine();
    resetPerformanceRegistry();
    engine = new ValidationPerformanceEngine({
      sampleSize: 20,
      concurrency: 4,
      targetLatencyMs: 100,
      targetThroughputPerSec: 50,
    });
    registerPerformance({ engine, force: true });
  });

  afterEach(() => {
    resetValidationPerformanceEngine();
    resetPerformanceRegistry();
  });

  it("runs warm/cold/batch/pipeline benchmarks", () => {
    expect(DEFAULT_PERFORMANCE_CONFIGURATION.engineVersion).toBe("9F.26.0");

    const warm = engine.runBenchmark({ mode: "warm_start", sampleSize: 20 });
    expect(warm.samplesMs.length).toBe(20);
    expect(warm.latency.averageMs).toBeGreaterThan(0);
    expect(warm.latency.p50Ms).toBeGreaterThan(0);
    expect(warm.latency.p95Ms).toBeGreaterThan(0);
    expect(warm.throughput.validationsPerSec).toBeGreaterThan(0);
    expect(warm.healthScore.overall).toBeGreaterThanOrEqual(0);
    expect(warm.healthScore.overall).toBeLessThanOrEqual(100);

    const cold = engine.runBenchmark({ mode: "cold_start", sampleSize: 10 });
    expect(cold.mode).toBe("cold_start");
    expect(cold.samplesMs[0]).toBeGreaterThan(0);

    const batch = runBenchmark({ mode: "batch", sampleSize: 12 });
    expect(batch.throughput.batchPerSec).toBeGreaterThan(0);

    const pipeline = engine.runBenchmark({ mode: "pipeline", sampleSize: 12 });
    expect(pipeline.throughput.pipelinePerSec).toBeGreaterThan(0);
  });

  it("analyzes latency percentiles from samples", () => {
    const profile = analyzeLatency({
      samplesMs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      targetLatencyMs: 80,
    });
    expect(profile.sampleCount).toBe(10);
    expect(profile.minMs).toBe(10);
    expect(profile.maxMs).toBe(100);
    expect(profile.p50Ms).toBeGreaterThanOrEqual(40);
    expect(profile.p99Ms).toBeGreaterThanOrEqual(profile.p95Ms);
  });
});

describe("Capacity planning", () => {
  beforeEach(() => {
    resetValidationPerformanceEngine();
    resetPerformanceRegistry();
    registerPerformance({ force: true });
  });

  afterEach(() => {
    resetValidationPerformanceEngine();
    resetPerformanceRegistry();
  });

  it("estimates capacity and scaling needs", () => {
    const plan = analyzeCapacity({
      throughputPerSec: 80,
      cpuUsagePct: 60,
      memoryUsagePct: 55,
      concurrency: 4,
      historicalThroughput: [50, 60, 70, 80],
    });
    expect(plan.currentCapacity).toBe(80);
    expect(plan.maximumSustainableLoad).toBeGreaterThan(plan.currentCapacity);
    expect(plan.recommendedCapacity).toBeGreaterThan(0);
    expect(plan.safetyMarginPct).toBeGreaterThanOrEqual(0);
    expect(plan.growthTrendPct).toBeGreaterThan(0);
  });
});

describe("Snapshots, metrics, audit, regression", () => {
  let engine: ValidationPerformanceEngine;

  beforeEach(() => {
    resetValidationPerformanceEngine();
    resetPerformanceRegistry();
    engine = new ValidationPerformanceEngine({
      sampleSize: 15,
      concurrency: 2,
      targetLatencyMs: 80,
      targetThroughputPerSec: 40,
    });
    registerPerformance({ engine, force: true });
  });

  afterEach(() => {
    resetValidationPerformanceEngine();
    resetPerformanceRegistry();
  });

  it("creates snapshots, tracks metrics/audit, detects regressions", () => {
    engine.runBenchmark({
      mode: "warm_start",
      sampleSize: 15,
      injectedSamplesMs: Array.from({ length: 15 }, () => 40),
    });
    const snap1 = createPerformanceSnapshot("baseline", "performance");
    expect(snap1.payload.score.overall).toBeGreaterThanOrEqual(0);

    engine.runBenchmark({
      mode: "regression",
      sampleSize: 15,
      concurrency: 12,
      injectedSamplesMs: Array.from({ length: 15 }, () => 220),
    });
    const snap2 = engine.createPerformanceSnapshot("degraded", "benchmark");
    const cmp = engine.comparePerformanceSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(cmp).not.toBeNull();
    expect(cmp!.regressionDetected).toBe(true);
    expect(["improving", "stable", "degrading"]).toContain(cmp!.trend);

    const capacitySnap = engine.createPerformanceSnapshot("cap", "capacity");
    expect(capacitySnap.payload.kind).toBe("capacity");

    const metrics = getPerformanceMetrics();
    expect(metrics.benchmarks).toBeGreaterThanOrEqual(2);
    expect(metrics.latencyMs).toBeGreaterThan(0);
    expect(metrics.performanceHealthScore).toBeGreaterThanOrEqual(0);

    const audit = engine.getAuditLog();
    expect(audit.some((e) => e.event === "BenchmarkRun")).toBe(true);
    expect(audit.some((e) => e.event === "LatencyAnalyzed")).toBe(true);
    expect(audit.some((e) => e.event === "CapacityPlanned")).toBe(true);
    expect(audit.some((e) => e.event === "SnapshotCreated")).toBe(true);
  });
});

describe("Graceful failure isolation", () => {
  beforeEach(() => {
    resetValidationPerformanceEngine();
    resetPerformanceRegistry();
  });

  afterEach(() => {
    resetValidationPerformanceEngine();
    resetPerformanceRegistry();
  });

  it("never throws from public APIs on empty inputs", () => {
    registerPerformance({ force: true });
    const latency = analyzeLatency({ samplesMs: [] });
    expect(latency.sampleCount).toBe(0);

    const capacity = analyzeCapacity({ throughputPerSec: 0 });
    expect(capacity.currentCapacity).toBe(0);

    const result = runBenchmark({ sampleSize: 1, injectedSamplesMs: [1] });
    expect(result.benchmarkId).toBeTruthy();
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
