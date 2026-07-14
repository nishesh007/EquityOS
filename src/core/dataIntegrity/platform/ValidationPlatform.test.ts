/**
 * Institutional Validation Platform — unit tests (Prompt 9F.32).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  registerValidationPlatform,
  resetValidationPlatform,
  initializePlatform,
  getPlatformStatus,
  getPlatformHealth,
  getPlatformMetrics,
  createPlatformSnapshot,
  runPlatformCertification,
  verifyPlatformIntegrity,
  getPlatformSummary,
  getValidationPlatform,
  REQUIRED_PLATFORM_ENGINES,
  listPlatformEngines,
  comparePlatformSnapshots,
  buildPlatformSnapshotPayload,
  DEFAULT_PLATFORM_CONFIGURATION,
  PlatformEngine,
} from "./index";

describe("Platform registration & initialization", () => {
  beforeEach(() => {
    resetValidationPlatform();
  });

  afterEach(() => {
    resetValidationPlatform();
  });

  it("registers the platform idempotently", () => {
    const first = registerValidationPlatform({ force: true });
    expect(first.registered).toBe(true);
    expect(first.enginesRegistered).toBe(REQUIRED_PLATFORM_ENGINES.length);

    const second = registerValidationPlatform();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });

  it("initializes all required Sprint 9F engines", () => {
    const result = initializePlatform({ force: true });
    expect(result.initialized || result.skipped).toBe(true);
    expect(listPlatformEngines().filter((e) => e.registered).length).toBe(
      REQUIRED_PLATFORM_ENGINES.length
    );
    for (const id of REQUIRED_PLATFORM_ENGINES) {
      expect(listPlatformEngines().some((e) => e.engineId === id && e.registered)).toBe(
        true
      );
    }
  });

  it("is idempotent on repeated initialize", () => {
    initializePlatform({ force: true });
    const second = initializePlatform();
    expect(second.skipped).toBe(true);
  });
});

describe("Platform health, metrics, status", () => {
  beforeEach(() => {
    resetValidationPlatform();
    registerValidationPlatform({ force: true });
  });

  afterEach(() => {
    resetValidationPlatform();
  });

  it("reports healthy overall scores", () => {
    const health = getPlatformHealth();
    expect(health.overallHealthScore).toBeGreaterThanOrEqual(80);
    expect(health.overallTrustScore).toBeGreaterThan(0);
    expect(health.overallReadiness).toBeGreaterThan(0);
    expect(health.overallCompliance).toBeGreaterThan(0);
    expect(health.overallSecurity).toBeGreaterThan(0);
    expect(health.overallReliability).toBeGreaterThan(0);
    expect(health.overallPerformance).toBeGreaterThan(0);
    expect(health.overallExplainability).toBeGreaterThan(0);
    expect(health.overallDocumentation).toBeGreaterThan(0);
    expect(health.overallCoverage).toBe(100);
    expect(health.overallCertification).toBeGreaterThan(0);
    expect(health.overallValidationStatus).toBe("healthy");
  });

  it("exposes status and metrics", () => {
    expect(DEFAULT_PLATFORM_CONFIGURATION.engineVersion).toBe("9F.32.0");
    const status = getPlatformStatus();
    expect(status.initialized).toBe(true);
    expect(status.engines.length).toBe(REQUIRED_PLATFORM_ENGINES.length);

    const metrics = getPlatformMetrics();
    expect(metrics.initialized).toBe(true);
    expect(metrics.enginesRegistered).toBe(REQUIRED_PLATFORM_ENGINES.length);
  });
});

describe("Platform certification", () => {
  beforeEach(() => {
    resetValidationPlatform();
    registerValidationPlatform({ force: true });
  });

  afterEach(() => {
    resetValidationPlatform();
  });

  it("certifies Production Ready", () => {
    const cert = runPlatformCertification();
    expect(cert.status).toBe("production_ready");
    expect(cert.checks.every((c) => c.passed)).toBe(true);
    expect(cert.errors).toEqual([]);
  });

  it("verifies platform integrity", () => {
    const integrity = verifyPlatformIntegrity();
    expect(integrity.ok).toBe(true);
    expect(integrity.missingEngines).toEqual([]);
    expect(integrity.unhealthyEngines).toEqual([]);
  });
});

describe("Platform summaries & snapshots", () => {
  beforeEach(() => {
    resetValidationPlatform();
    registerValidationPlatform({ force: true });
  });

  afterEach(() => {
    resetValidationPlatform();
  });

  it("builds a platform summary", () => {
    runPlatformCertification();
    const summary = getPlatformSummary();
    expect(summary.initialized).toBe(true);
    expect(summary.certificationStatus).toBe("production_ready");
    expect(summary.enginesRegistered).toBe(REQUIRED_PLATFORM_ENGINES.length);
    expect(summary.highlights.length).toBeGreaterThan(0);
    expect(summary.nextActions.length).toBeGreaterThan(0);
  });

  it("creates snapshots and detects regression", () => {
    const a = createPlatformSnapshot("baseline");
    expect(a.payload.enginesRegistered).toBe(REQUIRED_PLATFORM_ENGINES.length);

    const engine = getValidationPlatform();
    const b = engine.createSnapshot("compare");
    const comparison = engine.compareSnapshots(a.snapshotId, b.snapshotId);
    expect(comparison).not.toBeNull();
    expect(comparison!.regressionDetected).toBe(false);

    const degraded = buildPlatformSnapshotPayload({
      health: {
        ...a.payload.health,
        overallHealthScore: Math.max(0, a.payload.health.overallHealthScore - 20),
        overallRisk: a.payload.health.overallRisk + 20,
        overallCoverage: Math.max(0, a.payload.health.overallCoverage - 15),
      },
      certificationStatus: "not_ready",
      enginesRegistered: a.payload.enginesRegistered,
      enginesRequired: a.payload.enginesRequired,
      configurationVersion: a.payload.configurationVersion,
    });
    const storeA = a;
    const fakeB = {
      ...b,
      payload: degraded,
    };
    const regression = comparePlatformSnapshots(storeA, fakeB);
    expect(regression.regressionDetected).toBe(true);
    expect(regression.trend).toBe("degrading");
  });
});

describe("Public API & readiness", () => {
  beforeEach(() => {
    resetValidationPlatform();
  });

  afterEach(() => {
    resetValidationPlatform();
  });

  it("exposes the full public API surface", () => {
    expect(typeof registerValidationPlatform).toBe("function");
    expect(typeof initializePlatform).toBe("function");
    expect(typeof getPlatformStatus).toBe("function");
    expect(typeof getPlatformHealth).toBe("function");
    expect(typeof getPlatformMetrics).toBe("function");
    expect(typeof createPlatformSnapshot).toBe("function");
    expect(typeof runPlatformCertification).toBe("function");
    expect(typeof verifyPlatformIntegrity).toBe("function");
    expect(typeof getPlatformSummary).toBe("function");
  });

  it("reports platform readiness for Sprint 10A", () => {
    registerValidationPlatform({ force: true });
    const cert = runPlatformCertification();
    const summary = getPlatformSummary();
    expect(cert.status).toBe("production_ready");
    expect(summary.healthScore).toBeGreaterThanOrEqual(80);
    expect(summary.nextActions.some((a) => a.includes("Sprint 10A"))).toBe(true);
  });

  it("supports direct PlatformEngine orchestration", () => {
    const engine = new PlatformEngine({ orchestrationOnly: true });
    const boot = engine.initialize({ force: true });
    expect(boot.registeredCount).toBe(REQUIRED_PLATFORM_ENGINES.length);
    const cert = engine.runCertification();
    expect(cert.status).toBe("production_ready");
  });
});
