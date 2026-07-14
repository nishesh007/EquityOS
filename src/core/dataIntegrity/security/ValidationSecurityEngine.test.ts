/**
 * Institutional Validation Security Engine — unit tests (Prompt 9F.25).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationSecurityEngine,
  registerSecurity,
  resetValidationSecurityEngine,
  listSecurityResources,
  resetSecurityRegistry,
  DEFAULT_SECURITY_CONFIGURATION,
  authorize,
  validateAccess,
  evaluatePolicy,
  createSecuritySnapshot,
  getSecurityMetrics,
  createSecurityContext,
} from "./index";

describe("Security registration", () => {
  beforeEach(() => {
    resetValidationSecurityEngine();
    resetSecurityRegistry();
  });

  afterEach(() => {
    resetValidationSecurityEngine();
    resetSecurityRegistry();
  });

  it("registers security engine idempotently", () => {
    const first = registerSecurity({ force: true });
    expect(first.registered).toBe(true);
    expect(first.resourcesRegistered).toBeGreaterThanOrEqual(10);
    expect(first.rolesRegistered).toBeGreaterThanOrEqual(7);
    expect(listSecurityResources().length).toBeGreaterThanOrEqual(10);

    const second = registerSecurity();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Roles and permissions", () => {
  let engine: ValidationSecurityEngine;

  beforeEach(() => {
    resetValidationSecurityEngine();
    resetSecurityRegistry();
    engine = new ValidationSecurityEngine({
      mode: "strict",
      denyByDefault: true,
      institutionalMode: true,
      approvalPolicy: "none",
      requireApprovalForSensitive: false,
    });
    registerSecurity({ engine, force: true });
  });

  afterEach(() => {
    resetValidationSecurityEngine();
    resetSecurityRegistry();
  });

  it("exposes builtin roles and custom role inheritance", () => {
    expect(DEFAULT_SECURITY_CONFIGURATION.engineVersion).toBe("9F.25.0");
    const roles = engine.listRoles();
    expect(roles.some((r) => r.roleId === "administrator")).toBe(true);
    expect(roles.some((r) => r.roleId === "research_analyst")).toBe(true);
    expect(roles.some((r) => r.roleId === "read_only")).toBe(true);

    const custom = engine.registerRole({
      roleId: "custom_pm_plus",
      label: "Custom PM+",
      permissions: ["read"],
      inheritsFrom: ["portfolio_manager"],
      custom: true,
    });
    expect(custom.registered).toBe(true);

    const result = engine.authorize({
      context: createSecurityContext({
        subject: { subjectId: "u1", roles: ["custom_pm_plus"] },
        action: "approve",
        resource: { type: "DASHBOARD", module: "dashboard" },
      }),
    });
    expect(result.allowed).toBe(true);
    expect(result.validation.evaluation.inheritedPermissions).toContain(
      "approve"
    );
  });

  it("honors explicit permission denies", () => {
    engine.registerPermission({
      roleId: "research_analyst",
      action: "export",
      module: "reporting",
      effect: "deny",
    });

    const denied = engine.authorize({
      context: {
        subject: { subjectId: "analyst-1", roles: ["research_analyst"] },
        action: "export",
        resource: { type: "REPORT", module: "reporting" },
      },
    });
    expect(denied.allowed).toBe(false);
    expect(denied.decision).toBe("deny");
  });
});

describe("Policies and authorization", () => {
  let engine: ValidationSecurityEngine;

  beforeEach(() => {
    resetValidationSecurityEngine();
    resetSecurityRegistry();
    engine = new ValidationSecurityEngine({
      mode: "strict",
      approvalPolicy: "none",
      requireApprovalForSensitive: false,
      denyByDefault: true,
    });
    registerSecurity({ engine, force: true });
  });

  afterEach(() => {
    resetValidationSecurityEngine();
    resetSecurityRegistry();
  });

  it("evaluates policies and validates access", () => {
    const policy = evaluatePolicy({
      subject: { subjectId: "dev-1", roles: ["developer"] },
      action: "read",
      resource: { type: "DIAGNOSTICS", module: "diagnostics" },
    });
    expect(["allow", "deny", "not_applicable"]).toContain(policy.decision);

    const allowed = authorize({
      context: {
        subject: { subjectId: "ro-1", roles: ["read_only"] },
        action: "read",
        resource: { type: "DASHBOARD", module: "dashboard" },
      },
    });
    expect(allowed.allowed).toBe(true);

    const blocked = validateAccess({
      context: {
        subject: { subjectId: "ro-2", roles: ["read_only"] },
        action: "manage_security",
        resource: {
          type: "AUDIT_LOG",
          module: "security",
          sensitive: true,
        },
        environment: { networkZone: "public" },
      },
    });
    expect(blocked.authorized).toBe(false);
  });

  it("enforces module restrictions for scoped roles", () => {
    const result = engine.authorize({
      context: {
        subject: { subjectId: "ra-1", roles: ["research_analyst"] },
        action: "read",
        resource: { type: "CONFIGURATION", module: "versioning" },
      },
    });
    expect(result.allowed).toBe(false);
    expect(result.validation.evaluation.moduleRestricted).toBe(true);
  });
});

describe("Snapshots, metrics, audit, regression", () => {
  let engine: ValidationSecurityEngine;

  beforeEach(() => {
    resetValidationSecurityEngine();
    resetSecurityRegistry();
    engine = new ValidationSecurityEngine({
      mode: "strict",
      approvalPolicy: "none",
      requireApprovalForSensitive: false,
    });
    registerSecurity({ engine, force: true });
  });

  afterEach(() => {
    resetValidationSecurityEngine();
    resetSecurityRegistry();
  });

  it("creates snapshots, tracks metrics/audit, detects regressions", () => {
    engine.authorize({
      context: {
        subject: { subjectId: "admin-1", roles: ["administrator"] },
        action: "read",
        resource: { type: "METRICS", module: "observability" },
      },
    });

    const snap1 = createSecuritySnapshot("baseline", "security");
    expect(snap1.payload.roleCount).toBeGreaterThanOrEqual(7);
    expect(snap1.payload.score.overall).toBeGreaterThanOrEqual(0);
    expect(snap1.payload.score.overall).toBeLessThanOrEqual(100);

    // Degrade security posture: remove coverage policies and add conflicts.
    for (const p of engine.listPolicies()) {
      engine.createPolicy(
        {
          policyId: p.policyId,
          label: p.label,
          effect: "deny",
          actions: p.actions,
          modules: [],
          priority: 1,
          enabled: false,
        },
        { force: true }
      );
    }
    engine.registerPermission({
      roleId: "read_only",
      action: "read",
      effect: "allow",
    });
    engine.registerPermission({
      roleId: "read_only",
      action: "read",
      effect: "deny",
      grantId: "conflict-read",
    });

    for (let i = 0; i < 5; i++) {
      engine.authorize({
        context: {
          subject: { subjectId: `u-${i}`, roles: ["read_only"] },
          action: "manage_security",
          resource: { type: "AUDIT_LOG", module: "security", sensitive: true },
        },
      });
    }

    const snap2 = engine.createSecuritySnapshot("degraded", "security");
    const cmp = engine.compareSecuritySnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(cmp).not.toBeNull();
    expect(cmp!.regressionDetected).toBe(true);

    const metrics = getSecurityMetrics();
    expect(metrics.accessRequests).toBeGreaterThan(0);
    expect(metrics.deniedRequests).toBeGreaterThan(0);
    expect(metrics.roles).toBeGreaterThanOrEqual(7);
    expect(metrics.securityHealthScore).toBeGreaterThanOrEqual(0);

    const audit = engine.getAuditLog();
    expect(audit.some((e) => e.event === "AccessAttempt")).toBe(true);
    expect(audit.some((e) => e.event === "AccessDenied")).toBe(true);
    expect(audit.some((e) => e.event === "SnapshotCreated")).toBe(true);
  });

  it("supports permission/role/policy snapshot kinds", () => {
    const roleSnap = engine.createSecuritySnapshot("roles", "role");
    const permSnap = engine.createSecuritySnapshot("perms", "permission");
    const policySnap = engine.createSecuritySnapshot("policies", "policy");
    expect(roleSnap.payload.kind).toBe("role");
    expect(roleSnap.payload.roleIds?.length).toBeGreaterThan(0);
    expect(permSnap.payload.kind).toBe("permission");
    expect(policySnap.payload.kind).toBe("policy");
    expect(policySnap.payload.policyIds?.length).toBeGreaterThan(0);
  });
});

describe("Graceful failure isolation", () => {
  beforeEach(() => {
    resetValidationSecurityEngine();
    resetSecurityRegistry();
  });

  afterEach(() => {
    resetValidationSecurityEngine();
    resetSecurityRegistry();
  });

  it("never throws from authorize on malformed context", () => {
    registerSecurity({ force: true });
    const result = authorize({
      context: {
        subject: { subjectId: "", roles: ["unknown_role_xyz"] },
        action: "read",
        resource: { type: "DASHBOARD", module: "dashboard" },
      },
    });
    expect(result.decision).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
