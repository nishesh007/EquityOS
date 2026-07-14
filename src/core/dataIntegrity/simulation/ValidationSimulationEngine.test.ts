/**
 * Institutional Validation Simulation Engine — unit tests (Prompt 9F.28).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationSimulationEngine,
  registerSimulation,
  resetValidationSimulationEngine,
  listSimulationSources,
  resetSimulationRegistry,
  DEFAULT_SIMULATION_CONFIGURATION,
  runScenario,
  runStressTest,
  runMonteCarlo,
  compareScenarios,
  createSimulationSnapshot,
  getSimulationMetrics,
  ScenarioBuilder,
} from "./index";

describe("Simulation registration", () => {
  beforeEach(() => {
    resetValidationSimulationEngine();
    resetSimulationRegistry();
  });

  afterEach(() => {
    resetValidationSimulationEngine();
    resetSimulationRegistry();
  });

  it("registers simulation engine idempotently", () => {
    const first = registerSimulation({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(10);
    expect(listSimulationSources().length).toBeGreaterThanOrEqual(10);

    const second = registerSimulation();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Scenario builder and runner", () => {
  let engine: ValidationSimulationEngine;

  beforeEach(() => {
    resetValidationSimulationEngine();
    resetSimulationRegistry();
    engine = new ValidationSimulationEngine({
      randomSeed: 7,
      sandboxOnly: true,
      institutionalMode: true,
    });
    registerSimulation({ engine, force: true });
  });

  afterEach(() => {
    resetValidationSimulationEngine();
    resetSimulationRegistry();
  });

  it("builds and runs market/config scenarios in sandbox", () => {
    expect(DEFAULT_SIMULATION_CONFIGURATION.engineVersion).toBe("9F.28.0");
    const builder = new ScenarioBuilder();
    const crash = builder.buildPreset("market_crash");
    expect(crash.marketShock).toBeLessThan(0);

    const result = engine.runScenario({ scenario: crash });
    expect(result.sandboxed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(0);
    expect(result.validationScore).toBeLessThanOrEqual(100);
    expect(result.moduleResults.length).toBeGreaterThan(0);

    const bull = runScenario({ type: "bull_market" });
    expect(bull.scenarioType).toBe("bull_market");
  });
});

describe("Stress testing and Monte Carlo", () => {
  beforeEach(() => {
    resetValidationSimulationEngine();
    resetSimulationRegistry();
    registerSimulation({
      force: true,
      config: { iterationCount: 20, randomSeed: 11 },
    });
  });

  afterEach(() => {
    resetValidationSimulationEngine();
    resetSimulationRegistry();
  });

  it("runs stress profiles and monte carlo distributions", () => {
    const stress = runStressTest({
      profiles: ["extreme_inputs", "high_concurrency", "configuration_drift"],
      concurrency: 10,
      datasetSize: 200,
    });
    expect(stress.profiles.length).toBe(3);
    expect(stress.runs.length).toBe(3);
    expect(stress.coverageScore).toBeGreaterThan(0);
    expect(stress.peakFailureRate).toBeGreaterThanOrEqual(0);

    const mc = runMonteCarlo({
      type: "high_volatility",
      iterations: 25,
      seed: 99,
    });
    expect(mc.iterations).toBe(25);
    expect(mc.outcomes.length).toBe(25);
    expect(mc.confidenceInterval95.low).toBeLessThanOrEqual(
      mc.confidenceInterval95.high
    );
    expect(
      mc.outcomeDistribution.pass +
        mc.outcomeDistribution.warn +
        mc.outcomeDistribution.fail
    ).toBe(25);
  });
});

describe("Comparison, snapshots, metrics, audit", () => {
  let engine: ValidationSimulationEngine;

  beforeEach(() => {
    resetValidationSimulationEngine();
    resetSimulationRegistry();
    engine = new ValidationSimulationEngine({ randomSeed: 3 });
    registerSimulation({ engine, force: true });
  });

  afterEach(() => {
    resetValidationSimulationEngine();
    resetSimulationRegistry();
  });

  it("compares scenarios, snapshots, metrics, and detects regressions", () => {
    const left = engine.runScenario({ type: "bull_market" });
    const right = engine.runScenario({ type: "market_crash" });
    const cmp = compareScenarios(left, right);
    expect(cmp.regressionDetected).toBe(true);
    expect(cmp.qualityScore).toBeGreaterThanOrEqual(0);

    const snap1 = createSimulationSnapshot("baseline", "scenario");
    expect(snap1.payload.kind).toBe("scenario");

    engine.runStressTest({
      profiles: ["extreme_inputs", "resource_pressure"],
    });
    engine.runScenario({
      type: "market_crash",
      mode: "historical_replay",
    });

    const snap2 = engine.createSimulationSnapshot("stressed", "simulation");
    const snapCmp = engine.compareSimulationSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(snapCmp).not.toBeNull();
    expect(["improving", "stable", "degrading"]).toContain(snapCmp!.trend);

    const replaySnap = engine.createSimulationSnapshot("replay", "replay");
    expect(replaySnap.payload.kind).toBe("replay");

    const metrics = getSimulationMetrics();
    expect(metrics.scenarioRuns).toBeGreaterThanOrEqual(2);
    expect(metrics.stressTests).toBeGreaterThanOrEqual(1);
    expect(metrics.simulationHealthScore).toBeGreaterThanOrEqual(0);

    const audit = engine.getAuditLog();
    expect(audit.some((e) => e.event === "ScenarioRun")).toBe(true);
    expect(audit.some((e) => e.event === "StressTest")).toBe(true);
    expect(audit.some((e) => e.event === "ScenarioCompared")).toBe(true);
    expect(audit.some((e) => e.event === "SnapshotCreated")).toBe(true);
  });
});

describe("Graceful failure isolation", () => {
  beforeEach(() => {
    resetValidationSimulationEngine();
    resetSimulationRegistry();
  });

  afterEach(() => {
    resetValidationSimulationEngine();
    resetSimulationRegistry();
  });

  it("never throws from public APIs", () => {
    registerSimulation({ force: true });
    const result = runScenario({ type: "custom" });
    expect(result.sandboxed).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
