/**
 * Institutional Validation Reliability Engine — unit tests (Prompt 9F.19).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationReliabilityEngine,
  registerValidationReliabilityEngine,
  resetValidationReliabilityEngine,
  getRegisteredReliabilitySources,
  resetReliabilitySourceRegistrationState,
  DEFAULT_RELIABILITY_CONFIGURATION,
  checkHealth,
  runRecovery,
  tripCircuit,
  resetCircuit,
  retryExecution,
  getReliabilityMetrics,
  createReliabilitySnapshot,
  type ReliabilityProbe,
} from "./index";

function healthyProbes(): ReliabilityProbe[] {
  return [
    {
      sourceId: "orchestrator",
      module: "orchestrator",
      timestamp: new Date().toISOString(),
      critical: true,
      available: true,
      healthScore: 95,
      status: "HEALTHY",
      latencyMs: 40,
    },
    {
      sourceId: "ruleEngine",
      module: "ruleEngine",
      timestamp: new Date().toISOString(),
      critical: true,
      available: true,
      healthScore: 92,
      status: "HEALTHY",
    },
    {
      sourceId: "analytics",
      module: "analytics",
      timestamp: new Date().toISOString(),
      advisory: true,
      available: true,
      healthScore: 88,
    },
  ];
}

function degradedProbes(): ReliabilityProbe[] {
  return [
    {
      sourceId: "orchestrator",
      module: "orchestrator",
      timestamp: new Date().toISOString(),
      critical: true,
      available: true,
      healthScore: 90,
      status: "HEALTHY",
    },
    {
      sourceId: "analytics",
      module: "analytics",
      timestamp: new Date().toISOString(),
      advisory: true,
      available: false,
      healthScore: 10,
      status: "CRITICAL",
    },
    {
      sourceId: "reporting",
      module: "reporting",
      timestamp: new Date().toISOString(),
      advisory: true,
      available: false,
      status: "DEGRADED",
      healthScore: 30,
    },
    {
      sourceId: "ruleEngine",
      module: "ruleEngine",
      timestamp: new Date().toISOString(),
      critical: true,
      available: false,
      healthScore: 20,
      status: "CRITICAL",
    },
  ];
}

describe("Reliability registration", () => {
  beforeEach(() => {
    resetValidationReliabilityEngine();
    resetReliabilitySourceRegistrationState();
  });

  afterEach(() => {
    resetValidationReliabilityEngine();
    resetReliabilitySourceRegistrationState();
  });

  it("registers reliability engine idempotently", () => {
    const first = registerValidationReliabilityEngine({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(8);
    expect(getRegisteredReliabilitySources().length).toBeGreaterThanOrEqual(8);

    const second = registerValidationReliabilityEngine();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Circuit breaker, retry, timeout", () => {
  let engine: ValidationReliabilityEngine;

  beforeEach(() => {
    resetValidationReliabilityEngine();
    engine = new ValidationReliabilityEngine({
      circuitFailureThreshold: 2,
      circuitSuccessThreshold: 1,
      circuitRecoveryTimeoutMs: 10_000,
      maxRetries: 2,
      retryPolicy: "FIXED",
      fixedRetryDelayMs: 0,
      ruleTimeoutMs: 50,
    });
  });

  it("trips and resets circuits", () => {
    const tripped = engine.tripCircuit("orch", "test");
    expect(tripped.state).toBe("OPEN");
    expect(tripped.trips).toBe(1);

    const reset = engine.resetCircuit("orch");
    expect(reset.state).toBe("CLOSED");
    expect(reset.failureCount).toBe(0);
  });

  it("retries infrastructure failures but not logical ones", async () => {
    let calls = 0;
    const ok = await engine.retryExecution(
      async () => {
        calls += 1;
        if (calls < 2) throw new Error("infra blip");
        return "done";
      },
      {
        failureKind: "INFRASTRUCTURE",
        sleep: async () => undefined,
      }
    );
    expect(ok.ok).toBe(true);
    expect(ok.retried).toBe(true);
    expect(ok.result).toBe("done");

    const logical = await engine.retryExecution(
      async () => {
        throw new Error("validation failed");
      },
      { failureKind: "LOGICAL", sleep: async () => undefined }
    );
    expect(logical.skipped).toBe(true);
    expect(logical.ok).toBe(false);
    expect(logical.skipReason).toContain("never retried");
  });

  it("handles timeouts gracefully", () => {
    const timedOut = engine.checkTimeout("RULE", "price-range", 100);
    expect(timedOut.timedOut).toBe(true);
    expect(engine.getReliabilityMetrics().timeoutCount).toBeGreaterThan(0);

    const ok = engine.checkTimeout("RULE", "price-range", 10);
    expect(ok.timedOut).toBe(false);
  });
});

describe("Recovery, degradation, health, snapshots", () => {
  let engine: ValidationReliabilityEngine;

  beforeEach(() => {
    resetValidationReliabilityEngine();
    engine = new ValidationReliabilityEngine({
      recoveryPolicy: "AUTOMATIC",
      healthCriticalThreshold: 40,
      healthDegradedThreshold: 70,
    });
  });

  it("runs failure recovery", () => {
    const recovery = engine.runRecovery({
      targetType: "PIPELINE",
      targetId: "full-validation",
      failureKind: "INFRASTRUCTURE",
    });
    expect(recovery.recovered).toBe(true);
    expect(recovery.strategy).toContain("pipeline");
    expect(engine.getRecoveryHistory().length).toBe(1);
    expect(engine.getFailureHistory().length).toBe(1);
  });

  it("monitors health and applies graceful degradation", () => {
    const healthy = engine.checkHealth({
      probes: healthyProbes(),
      includeLiveCollectors: false,
    });
    expect(healthy.health.overallStatus).toBe("HEALTHY");
    expect(healthy.resilienceScore.overall).toBeGreaterThan(50);
    expect(healthy.degradation.status).toBe("NORMAL");

    const degraded = engine.checkHealth({
      probes: degradedProbes(),
      includeLiveCollectors: false,
    });
    expect(degraded.degradation.degraded).toBe(true);
    expect(degraded.degradation.skippedAdvisoryModules.length).toBeGreaterThan(
      0
    );
    expect(degraded.degradation.protectedCriticalModules).toContain(
      "ruleEngine"
    );
    expect(degraded.degradation.continuedCoreModules.length).toBeGreaterThan(0);
  });

  it("creates snapshots and detects regressions", () => {
    engine.checkHealth({
      probes: healthyProbes(),
      includeLiveCollectors: false,
    });
    const snap1 = engine.createReliabilitySnapshot("baseline");

    engine.tripCircuit("bus", "storm");
    engine.checkTimeout("PIPELINE", "full", 999_999);
    engine.checkHealth({
      probes: degradedProbes(),
      includeLiveCollectors: false,
    });
    const snap2 = engine.createReliabilitySnapshot("degraded");

    const comparison = engine.compareReliabilitySnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(comparison).not.toBeNull();
    expect(comparison!.scoreDelta).toBeLessThan(0);
    expect(comparison!.regressionDetected).toBe(true);
    expect(engine.listSnapshots().length).toBe(2);
  });

  it("tracks metrics and audit log", () => {
    engine.checkHealth({
      probes: healthyProbes(),
      includeLiveCollectors: false,
    });
    engine.runRecovery({
      targetType: "CACHE",
      targetId: "rule-cache",
    });
    const metrics = engine.getReliabilityMetrics();
    expect(metrics.healthChecks).toBeGreaterThan(0);
    expect(metrics.resilienceScore).toBeGreaterThanOrEqual(0);
    expect(engine.getAuditLog().length).toBeGreaterThan(0);
    expect(DEFAULT_RELIABILITY_CONFIGURATION.engineVersion).toBe("9F.19.0");
  });
});

describe("Public API", () => {
  beforeEach(() => {
    resetValidationReliabilityEngine();
    resetReliabilitySourceRegistrationState();
  });

  afterEach(() => {
    resetValidationReliabilityEngine();
    resetReliabilitySourceRegistrationState();
  });

  it("exposes reliability helpers", async () => {
    const engine = new ValidationReliabilityEngine({
      maxRetries: 1,
      fixedRetryDelayMs: 0,
      retryPolicy: "IMMEDIATE",
    });
    registerValidationReliabilityEngine({ engine, force: true });

    expect(
      checkHealth({
        probes: healthyProbes(),
        includeLiveCollectors: false,
      }).resilienceScore.overall
    ).toBeGreaterThan(0);

    expect(
      runRecovery({
        targetType: "ENGINE",
        targetId: "trust",
        failureKind: "DEPENDENCY",
      }).recovered
    ).toBe(true);

    expect(tripCircuit("api-circuit").state).toBe("OPEN");
    expect(resetCircuit("api-circuit").state).toBe("CLOSED");

    const retry = await retryExecution(async () => "ok", {
      failureKind: "INFRASTRUCTURE",
      sleep: async () => undefined,
    });
    expect(retry.ok).toBe(true);

    expect(getReliabilityMetrics().healthChecks).toBeGreaterThan(0);
    expect(createReliabilitySnapshot("api").snapshotId).toContain("rel:");
  });
});
