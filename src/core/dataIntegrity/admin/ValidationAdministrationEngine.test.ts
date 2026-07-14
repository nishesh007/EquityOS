/**
 * Institutional Validation Administration Engine — unit tests (Prompt 9F.17).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationAdministrationEngine,
  registerValidationAdministrationEngine,
  resetValidationAdministrationEngine,
  resetPolicyRegistry,
  DEFAULT_ADMINISTRATION_CONFIGURATION,
  createPolicy,
  updatePolicy,
  deletePolicy,
  evaluatePolicy,
  applyOverride,
  rollbackPolicy,
  createGovernanceSnapshot,
  getAdministrationMetrics,
} from "./index";

describe("Administration registration", () => {
  beforeEach(() => {
    resetValidationAdministrationEngine();
    resetPolicyRegistry();
  });

  afterEach(() => {
    resetValidationAdministrationEngine();
    resetPolicyRegistry();
  });

  it("registers administration engine idempotently", () => {
    const first = registerValidationAdministrationEngine({ force: true });
    expect(first.registered).toBe(true);
    expect(first.policiesRegistered).toBeGreaterThanOrEqual(2);

    const second = registerValidationAdministrationEngine();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Policy lifecycle", () => {
  let engine: ValidationAdministrationEngine;

  beforeEach(() => {
    resetValidationAdministrationEngine();
    resetPolicyRegistry();
    engine = new ValidationAdministrationEngine();
  });

  it("creates, updates, enables, disables, clones, and deletes policies", () => {
    const created = engine.createPolicy({
      name: "Market Strict",
      description: "Strict market validation",
      scope: "MODULE",
      moduleIds: ["market"],
      tags: ["market"],
      rules: {
        disableRules: ["optional-gap"],
        severityOverrides: { "price-range": "CRITICAL" },
      },
      createdBy: "admin",
      reason: "initial",
    });
    expect(created.ok).toBe(true);
    expect(created.policy?.version).toBe(1);
    expect(created.policy?.status).toBe("ENABLED");

    const policyId = created.policy!.policyId;
    const updated = engine.updatePolicy({
      policyId,
      description: "Updated description",
      updatedBy: "admin",
      reason: "tighten",
    });
    expect(updated.ok).toBe(true);
    expect(updated.policy?.version).toBe(2);
    expect(updated.previous?.version).toBe(1);

    expect(engine.disablePolicy(policyId, "admin").policy?.status).toBe(
      "DISABLED"
    );
    expect(engine.enablePolicy(policyId, "admin").policy?.status).toBe(
      "ENABLED"
    );

    const cloned = engine.clonePolicy(policyId, {
      name: "Market Strict Clone",
      createdBy: "admin",
    });
    expect(cloned.ok).toBe(true);
    expect(cloned.policy?.tags).toContain("cloned");

    const deleted = engine.deletePolicy(policyId, {
      deletedBy: "admin",
      reason: "cleanup",
      approvalStatus: "APPROVED",
    });
    expect(deleted.ok).toBe(true);
    expect(engine.getPolicy(policyId)).toBeNull();
  });

  it("versions and rolls back policies", () => {
    const created = engine.createPolicy({
      name: "Rollback Target",
      rules: { enableRules: ["a"] },
      createdBy: "admin",
    });
    const policyId = created.policy!.policyId;

    engine.updatePolicy({
      policyId,
      rules: { enableRules: ["a", "b"] },
      updatedBy: "admin",
      reason: "add b",
    });
    engine.updatePolicy({
      policyId,
      rules: { enableRules: ["a", "b", "c"] },
      updatedBy: "admin",
      reason: "add c",
    });

    const versions = engine.getPolicyVersions(policyId);
    expect(versions.length).toBeGreaterThanOrEqual(3);

    const rolled = engine.rollbackPolicy(policyId, 1, {
      rolledBackBy: "admin",
      reason: "revert",
    });
    expect(rolled.ok).toBe(true);
    expect(rolled.policy?.rules.enableRules).toEqual(["a"]);
    expect(rolled.policy!.version).toBeGreaterThan(1);
  });
});

describe("Profiles, overrides, conflicts, governance", () => {
  let engine: ValidationAdministrationEngine;

  beforeEach(() => {
    resetValidationAdministrationEngine();
    resetPolicyRegistry();
    engine = new ValidationAdministrationEngine();
  });

  it("switches profiles and applies overrides", () => {
    const switched = engine.switchProfile("production");
    expect(switched.ok).toBe(true);
    expect(switched.policyProfile?.profileId).toBe("production");
    expect(engine.getConfiguration().approvalRequired).toBe(true);

    const override = engine.applyOverride({
      targetType: "RULE",
      targetId: "price-range",
      severity: "CRITICAL",
      priority: 0,
      threshold: 5,
      timeoutMs: 2_000,
      retryCount: 1,
      createdBy: "admin",
      reason: "incident response",
      approvalStatus: "APPROVED",
      previousValues: { severity: "WARNING" },
    });
    expect(override.ok).toBe(true);
    expect(override.override?.active).toBe(true);
    expect(override.override?.newValues.severity).toBe("CRITICAL");
  });

  it("detects policy conflicts during evaluation", () => {
    engine.getRuleGovernance().ensureRule({
      ruleId: "shared-rule",
      name: "Shared",
      module: "market",
      enabled: true,
      dependencies: ["missing-dep"],
    });
    engine.getRuleGovernance().ensureRule({
      ruleId: "child-rule",
      name: "Child",
      module: "market",
      enabled: true,
      dependencies: ["shared-rule"],
    });

    engine.createPolicy({
      name: "Enable Shared",
      status: "ENABLED",
      rules: { enableRules: ["shared-rule"] },
    });
    engine.createPolicy({
      name: "Disable Shared",
      status: "ENABLED",
      rules: { disableRules: ["shared-rule"] },
    });

    const evaluation = engine.evaluatePolicy();
    expect(evaluation.conflicts.some((c) => c.code === "RULE_ENABLE_DISABLE_CONFLICT")).toBe(
      true
    );
    expect(
      evaluation.conflicts.some(
        (c) =>
          c.code === "MISSING_DEPENDENCY" || c.code === "DISABLED_DEPENDENCY"
      )
    ).toBe(true);
  });

  it("governs rules and modules without source changes", () => {
    const rules = engine.getRuleGovernance();
    rules.ensureRule({
      ruleId: "ohlc",
      name: "OHLC",
      module: "market",
      enabled: true,
    });
    expect(rules.disableRule("ohlc", "admin")?.enabled).toBe(false);
    expect(rules.overrideSeverity("ohlc", "ERROR")?.severity).toBe("ERROR");
    expect(rules.overridePriority("ohlc", 1)?.priority).toBe(1);
    expect(rules.overrideThreshold("ohlc", 10)?.threshold).toBe(10);
    expect(rules.assignTags("ohlc", ["core"])?.tags).toContain("core");
    expect(rules.markDeprecated("ohlc")?.deprecated).toBe(true);
    expect(rules.restoreRule("ohlc")?.enabled).toBe(true);

    const modules = engine.getModuleGovernance();
    expect(modules.disableModule("market", "admin")?.enabled).toBe(false);
    expect(modules.setMaintenanceMode("market", true)?.maintenanceMode).toBe(
      true
    );
    expect(modules.setSafeMode("trust", true)?.safeMode).toBe(true);
    expect(modules.setProductionMode("trust", true)?.productionMode).toBe(true);
    expect(modules.enableModule("market")?.enabled).toBe(true);
  });
});

describe("Snapshots, metrics, audit", () => {
  let engine: ValidationAdministrationEngine;

  beforeEach(() => {
    resetValidationAdministrationEngine();
    resetPolicyRegistry();
    engine = new ValidationAdministrationEngine();
  });

  it("creates and compares governance snapshots", () => {
    engine.createPolicy({ name: "Base", createdBy: "admin" });
    const snap1 = engine.createGovernanceSnapshot("baseline");

    engine.createPolicy({ name: "Added", createdBy: "admin" });
    engine.getRuleGovernance().ensureRule({
      ruleId: "r1",
      enabled: false,
    });
    const snap2 = engine.createGovernanceSnapshot("after");

    const comparison = engine.compareGovernanceSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(comparison).not.toBeNull();
    expect(comparison!.policyCountDelta).toBeGreaterThan(0);
    expect(comparison!.policyDiff.some((d) => d.change === "added")).toBe(true);
  });

  it("tracks metrics and audit log", () => {
    engine.createPolicy({ name: "Audited", createdBy: "admin", reason: "test" });
    engine.applyOverride({
      targetType: "RULE",
      targetId: "x",
      severity: "WARNING",
      createdBy: "admin",
      reason: "temp",
    });
    engine.switchProfile("staging");

    const metrics = engine.getAdministrationMetrics();
    expect(metrics.policies).toBeGreaterThan(0);
    expect(metrics.configurationChanges).toBeGreaterThan(0);
    expect(engine.getAuditLog().length).toBeGreaterThan(0);
    expect(DEFAULT_ADMINISTRATION_CONFIGURATION.engineVersion).toBe("9F.17.0");
  });
});

describe("Public API", () => {
  beforeEach(() => {
    resetValidationAdministrationEngine();
    resetPolicyRegistry();
  });

  afterEach(() => {
    resetValidationAdministrationEngine();
    resetPolicyRegistry();
  });

  it("exposes administration helpers", () => {
    const engine = new ValidationAdministrationEngine();
    registerValidationAdministrationEngine({ engine, force: true });

    const created = createPolicy({
      name: "API Policy",
      createdBy: "api",
    });
    expect(created.ok).toBe(true);
    const policyId = created.policy!.policyId;

    expect(
      updatePolicy({
        policyId,
        description: "via api",
        updatedBy: "api",
      }).ok
    ).toBe(true);

    expect(evaluatePolicy().evaluatedAt).toBeTruthy();
    expect(
      applyOverride({
        targetType: "RULE",
        targetId: "api-rule",
        priority: 2,
        createdBy: "api",
      }).ok
    ).toBe(true);

    const versions = engine.getPolicyVersions(policyId);
    const firstVersion = versions[0]?.version ?? 1;
    expect(
      rollbackPolicy(policyId, firstVersion, { rolledBackBy: "api" }).ok
    ).toBe(true);

    expect(createGovernanceSnapshot("api").snapshotId).toContain("gov:");
    expect(getAdministrationMetrics().policies).toBeGreaterThan(0);

    expect(
      deletePolicy(policyId, {
        deletedBy: "api",
        approvalStatus: "APPROVED",
      }).ok
    ).toBe(true);
  });
});
