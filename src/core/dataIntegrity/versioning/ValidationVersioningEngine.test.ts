/**
 * Institutional Validation Versioning Engine — unit tests (Prompt 9F.24).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationVersioningEngine,
  registerValidationVersioningEngine,
  resetValidationVersioningEngine,
  listVersionRecords,
  resetVersionRegistry,
  DEFAULT_VERSION_CONFIGURATION,
  registerVersion,
  planMigration,
  validateMigration,
  checkCompatibility,
  compareVersions,
  createVersionSnapshot,
  getVersionMetrics,
} from "./index";

describe("Versioning registration", () => {
  beforeEach(() => {
    resetValidationVersioningEngine();
    resetVersionRegistry();
  });

  afterEach(() => {
    resetValidationVersioningEngine();
    resetVersionRegistry();
  });

  it("registers versioning engine idempotently", () => {
    const first = registerValidationVersioningEngine({ force: true });
    expect(first.registered).toBe(true);
    expect(first.versionsRegistered).toBeGreaterThanOrEqual(10);
    expect(listVersionRecords().length).toBeGreaterThanOrEqual(10);

    const second = registerValidationVersioningEngine();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Version management and comparison", () => {
  let engine: ValidationVersioningEngine;

  beforeEach(() => {
    resetValidationVersioningEngine();
    resetVersionRegistry();
    engine = new ValidationVersioningEngine({
      migrationMode: "dry_run",
      compatibilityStrictness: "strict",
    });
  });

  it("registers and compares versions", () => {
    const a = engine.registerVersion({
      kind: "ENGINE",
      targetId: "demo",
      label: "Demo Engine",
      version: "1.0.0",
      schemaVersion: "1.0.0",
    });
    const b = engine.registerVersion({
      kind: "ENGINE",
      targetId: "demo",
      label: "Demo Engine",
      version: "2.0.0",
      schemaVersion: "1.1.0",
      breaking: true,
    });
    expect(a.registered).toBe(true);
    expect(b.registered).toBe(true);
    expect(DEFAULT_VERSION_CONFIGURATION.engineVersion).toBe("9F.24.0");

    const cmp = engine.compareVersions({
      leftVersionId: a.record!.versionId,
      rightVersionId: b.record!.versionId,
    });
    expect(cmp.breakingLikely).toBe(true);
    expect(cmp.leftNewer).toBe(false);
  });
});

describe("Migration planning and compatibility", () => {
  let engine: ValidationVersioningEngine;

  beforeEach(() => {
    resetValidationVersioningEngine();
    resetVersionRegistry();
    engine = new ValidationVersioningEngine({
      migrationMode: "preview",
      compatibilityStrictness: "moderate",
      institutionalMode: true,
    });
  });

  it("plans migration with rollback and validates", () => {
    const from = engine.registerVersion({
      kind: "CONFIGURATION",
      targetId: "platform-config",
      label: "Platform Config",
      version: "1.0.0",
      schemaVersion: "1.0.0",
    });
    const to = engine.registerVersion({
      kind: "CONFIGURATION",
      targetId: "platform-config",
      label: "Platform Config",
      version: "1.2.0",
      schemaVersion: "1.1.0",
    });

    const planned = engine.planMigration({
      fromVersionId: from.record!.versionId,
      toVersionId: to.record!.versionId,
    });
    expect(planned.plan).not.toBeNull();
    expect(planned.plan!.steps.length).toBeGreaterThan(0);
    expect(planned.plan!.rollbackPlan.steps.length).toBeGreaterThan(0);
    expect(planned.plan!.dryRun).toBe(true);
    expect(planned.execution!.executed).toBe(false);
    expect(planned.healthScore.overall).toBeGreaterThanOrEqual(0);
    expect(planned.healthScore.overall).toBeLessThanOrEqual(100);

    const validation = engine.validateMigration({
      fromVersionId: from.record!.versionId,
      toVersionId: to.record!.versionId,
    });
    expect(validation).toBeTruthy();
  });

  it("detects compatibility issues", () => {
    const from = engine.registerVersion({
      kind: "RULE",
      targetId: "price-range",
      label: "Price Range",
      version: "1.0.0",
      schemaVersion: "1.0.0",
    });
    const to = engine.registerVersion({
      kind: "RULE",
      targetId: "price-range",
      label: "Price Range",
      version: "2.0.0",
      schemaVersion: "2.0.0",
      breaking: true,
      deprecated: true,
    });

    const compat = engine.checkCompatibility({
      fromVersionId: from.record!.versionId,
      toVersionId: to.record!.versionId,
      knownRemovedRules: ["legacy-rule"],
      configDrift: true,
      dependencyConflicts: ["module-a vs module-b"],
    });
    expect(compat.issues.length).toBeGreaterThan(0);
    expect(
      compat.issues.some((i) => i.code === "BREAKING_CHANGE")
    ).toBe(true);
  });
});

describe("Snapshots, metrics, audit", () => {
  let engine: ValidationVersioningEngine;

  beforeEach(() => {
    resetValidationVersioningEngine();
    resetVersionRegistry();
    engine = new ValidationVersioningEngine({
      migrationMode: "dry_run",
      compatibilityStrictness: "moderate",
    });
  });

  it("creates snapshots and detects regressions", () => {
    const from = engine.registerVersion({
      kind: "ENGINE",
      targetId: "svc",
      label: "Service",
      version: "1.0.0",
      schemaVersion: "1.0.0",
    });
    const to = engine.registerVersion({
      kind: "ENGINE",
      targetId: "svc",
      label: "Service",
      version: "1.1.0",
      schemaVersion: "1.0.0",
    });

    engine.planMigration({
      fromVersionId: from.record!.versionId,
      toVersionId: to.record!.versionId,
    });
    const snap1 = engine.createVersionSnapshot("baseline");

    const breaking = engine.registerVersion({
      kind: "ENGINE",
      targetId: "svc",
      label: "Service",
      version: "3.0.0",
      schemaVersion: "3.0.0",
      breaking: true,
    });
    engine.planMigration({
      fromVersionId: from.record!.versionId,
      toVersionId: breaking.record!.versionId,
      knownRemovedRules: ["old-rule"],
      configDrift: true,
      dependencyConflicts: ["conflict"],
    });
    const snap2 = engine.createVersionSnapshot("regressed");

    const comparison = engine.compareVersionSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(comparison).not.toBeNull();
    expect(engine.listSnapshots().length).toBe(2);
  });

  it("tracks metrics and audit log", () => {
    const from = engine.registerVersion({
      kind: "MODULE",
      targetId: "mod",
      label: "Module",
      version: "1.0.0",
    });
    const to = engine.registerVersion({
      kind: "MODULE",
      targetId: "mod",
      label: "Module",
      version: "1.0.1",
    });
    engine.planMigration({
      fromVersionId: from.record!.versionId,
      toVersionId: to.record!.versionId,
    });
    engine.checkCompatibility({
      fromVersionId: from.record!.versionId,
      toVersionId: to.record!.versionId,
    });

    const metrics = engine.getVersionMetrics();
    expect(metrics.versions).toBeGreaterThan(0);
    expect(metrics.migrations).toBeGreaterThan(0);
    expect(metrics.compatibilityChecks).toBeGreaterThan(0);
    expect(engine.getAuditLog().length).toBeGreaterThan(0);
  });
});

describe("Public API", () => {
  beforeEach(() => {
    resetValidationVersioningEngine();
    resetVersionRegistry();
  });

  afterEach(() => {
    resetValidationVersioningEngine();
    resetVersionRegistry();
  });

  it("exposes versioning helpers", () => {
    const engine = new ValidationVersioningEngine({
      migrationMode: "dry_run",
    });
    registerValidationVersioningEngine({ engine, force: true });

    const from = registerVersion({
      kind: "POLICY",
      targetId: "pol",
      label: "Policy",
      version: "1.0.0",
      schemaVersion: "1.0.0",
    });
    const to = registerVersion({
      kind: "POLICY",
      targetId: "pol",
      label: "Policy",
      version: "1.1.0",
      schemaVersion: "1.0.0",
    });
    expect(from.registered).toBe(true);

    const planned = planMigration({
      fromVersionId: from.record!.versionId,
      toVersionId: to.record!.versionId,
    });
    expect(planned.plan).not.toBeNull();
    expect(
      validateMigration({
        fromVersionId: from.record!.versionId,
        toVersionId: to.record!.versionId,
      })
    ).toBeTruthy();
    expect(
      checkCompatibility({
        fromVersionId: from.record!.versionId,
        toVersionId: to.record!.versionId,
      }).compatibilityScore
    ).toBeGreaterThanOrEqual(0);
    expect(
      compareVersions({
        leftVersion: "1.0.0",
        rightVersion: "1.1.0",
        leftId: "a",
        rightId: "b",
      }).equal
    ).toBe(false);
    expect(getVersionMetrics().versions).toBeGreaterThan(0);
    expect(createVersionSnapshot("api").snapshotId).toContain("vsnap:");
  });
});
