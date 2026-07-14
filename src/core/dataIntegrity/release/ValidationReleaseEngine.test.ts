/**
 * Institutional Validation Release Certification Engine — unit tests (Prompt 9F.30).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationReleaseEngine,
  registerRelease,
  resetValidationReleaseEngine,
  listReleaseSources,
  resetReleaseRegistry,
  DEFAULT_RELEASE_CONFIGURATION,
  evaluateReadiness,
  certifyRelease,
  analyzeDeployment,
  createReleaseSnapshot,
  getReleaseMetrics,
} from "./index";

const COMPLETE_CHECKLIST = [
  { itemId: "pr-health", completed: true },
  { itemId: "pr-tests", completed: true },
  { itemId: "pr-docs", completed: true },
  { itemId: "dep-config", completed: true },
  { itemId: "dep-migrate", completed: true },
  { itemId: "dep-infra", completed: true },
  { itemId: "rb-plan", completed: true },
  { itemId: "rb-snapshot", completed: true },
  { itemId: "rb-owner", completed: true },
  { itemId: "ops-monitor", completed: true },
  { itemId: "ops-oncall", completed: true },
  { itemId: "ops-runbook", completed: true },
  { itemId: "sec-scan", completed: true },
  { itemId: "sec-access", completed: true },
  { itemId: "sec-secrets", completed: true },
  { itemId: "comp-policy", completed: true },
  { itemId: "comp-audit", completed: true },
  { itemId: "comp-signoff", completed: true },
];

describe("Release registration", () => {
  beforeEach(() => {
    resetValidationReleaseEngine();
    resetReleaseRegistry();
  });

  afterEach(() => {
    resetValidationReleaseEngine();
    resetReleaseRegistry();
  });

  it("registers release engine idempotently", () => {
    const first = registerRelease({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(15);
    expect(listReleaseSources().length).toBeGreaterThanOrEqual(15);

    const second = registerRelease();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Readiness and certification", () => {
  let engine: ValidationReleaseEngine;

  beforeEach(() => {
    resetValidationReleaseEngine();
    resetReleaseRegistry();
    engine = new ValidationReleaseEngine({
      mode: "institutional",
      certificationOnly: true,
      checklistProfile: "full",
    });
    registerRelease({ engine, force: true });
  });

  afterEach(() => {
    resetValidationReleaseEngine();
    resetReleaseRegistry();
  });

  it("evaluates readiness and certifies release", () => {
    expect(DEFAULT_RELEASE_CONFIGURATION.engineVersion).toBe("9F.30.0");

    const readiness = evaluateReadiness();
    expect(readiness.dimensions.length).toBe(10);
    expect(readiness.score.overall).toBeGreaterThan(0);
    expect(readiness.score.overall).toBeLessThanOrEqual(100);

    const cert = certifyRelease({
      checklistOverrides: COMPLETE_CHECKLIST,
      versionCompatibility: 95,
      migrationReadiness: 90,
      configurationDrift: 10,
    });
    expect([
      "production_ready",
      "conditionally_ready",
      "not_ready",
      "blocked",
    ]).toContain(cert.status);
    expect(cert.score.overall).toBeGreaterThan(70);
    expect(cert.reasoning.length).toBeGreaterThan(0);
    expect(cert.summary).toContain("Certification status");
  });

  it("blocks when critical readiness gaps exist", () => {
    const blocked = engine.certifyRelease({
      overrides: {
        health: 20,
        testing: 20,
        security: 15,
        compliance: 15,
        performance: 20,
        reliability: 20,
        operationalReadiness: 15,
      },
      checklistOverrides: [
        { itemId: "comp-signoff", completed: false },
        { itemId: "rb-plan", completed: false },
        { itemId: "rb-snapshot", completed: false },
      ],
    });
    expect(blocked.status).toBe("blocked");
    expect(blocked.criticalRisks).toBeGreaterThanOrEqual(0);
  });
});

describe("Deployment analysis and risk", () => {
  beforeEach(() => {
    resetValidationReleaseEngine();
    resetReleaseRegistry();
    registerRelease({ force: true });
  });

  afterEach(() => {
    resetValidationReleaseEngine();
    resetReleaseRegistry();
  });

  it("analyzes deployment risk and rollback readiness", () => {
    const deployment = analyzeDeployment({
      checklistOverrides: COMPLETE_CHECKLIST,
      configurationDrift: 25,
      migrationReadiness: 80,
      versionCompatibility: 88,
    });
    expect(deployment.deploymentRisk).toBeGreaterThanOrEqual(0);
    expect(deployment.deploymentRisk).toBeLessThanOrEqual(100);
    expect(deployment.rollbackReadiness).toBeGreaterThan(0);
    expect(deployment.summary.length).toBeGreaterThan(10);
  });
});

describe("Snapshots, metrics, audit, regression", () => {
  let engine: ValidationReleaseEngine;

  beforeEach(() => {
    resetValidationReleaseEngine();
    resetReleaseRegistry();
    engine = new ValidationReleaseEngine({ mode: "standard" });
    registerRelease({ engine, force: true });
  });

  afterEach(() => {
    resetValidationReleaseEngine();
    resetReleaseRegistry();
  });

  it("creates snapshots, tracks metrics/audit, detects regressions", () => {
    engine.certifyRelease({
      checklistOverrides: COMPLETE_CHECKLIST,
      configurationDrift: 5,
      migrationReadiness: 95,
      versionCompatibility: 95,
    });
    const snap1 = createReleaseSnapshot("baseline", "certification");
    expect(snap1.payload.kind).toBe("certification");
    expect(snap1.payload.score.overall).toBeGreaterThan(0);

    engine.certifyRelease({
      overrides: {
        health: 40,
        testing: 35,
        security: 30,
        compliance: 30,
        performance: 40,
        reliability: 35,
        operationalReadiness: 30,
      },
      checklistOverrides: [
        { itemId: "rb-plan", completed: false },
        { itemId: "rb-snapshot", completed: false },
        { itemId: "comp-signoff", completed: false },
        { itemId: "sec-scan", completed: false },
      ],
      configurationDrift: 70,
      migrationReadiness: 30,
      versionCompatibility: 40,
    });
    const snap2 = engine.createReleaseSnapshot("degraded", "deployment");
    const cmp = engine.compareReleaseSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(cmp).not.toBeNull();
    expect(cmp!.regressionDetected).toBe(true);
    expect(["improving", "stable", "degrading"]).toContain(cmp!.trend);

    const releaseSnap = engine.createReleaseSnapshot("release", "release");
    expect(releaseSnap.payload.kind).toBe("release");

    const metrics = getReleaseMetrics();
    expect(metrics.certificationRuns).toBeGreaterThanOrEqual(2);
    expect(metrics.releaseScore).toBeGreaterThanOrEqual(0);
    expect(metrics.checklistCompletion).toBeGreaterThanOrEqual(0);

    const audit = engine.getAuditLog();
    expect(audit.some((e) => e.event === "CertificationRun")).toBe(true);
    expect(audit.some((e) => e.event === "RiskAssessed")).toBe(true);
    expect(audit.some((e) => e.event === "SnapshotCreated")).toBe(true);
  });
});

describe("Graceful failure isolation", () => {
  beforeEach(() => {
    resetValidationReleaseEngine();
    resetReleaseRegistry();
  });

  afterEach(() => {
    resetValidationReleaseEngine();
    resetReleaseRegistry();
  });

  it("never throws from public APIs", () => {
    registerRelease({ force: true });
    const readiness = evaluateReadiness();
    expect(readiness.score).toBeTruthy();
    const cert = certifyRelease();
    expect(cert.certificationId).toBeTruthy();
  });
});
