/**
 * Sprint 12C ops tests.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { createAuditEntry, filterAudit } from "./audit";
import { evaluateFlag } from "./feature-flags";
import { renderEmailTemplate, listEmailTemplates } from "./email-templates";
import { collectSystemHealth } from "./health";
import { applySecurityHeaders } from "./security-headers";
import {
  applyRetention,
  completeBackup,
  createBackupRecord,
} from "./backup";
import { resetOpsMemory, loadOpsState } from "./persistence";
import {
  adminService,
  auditService,
  backupService,
  featureFlagService,
  maintenanceService,
  notificationService,
  emailService,
  healthService,
} from "./services";
import { resetMemoryState, saveState, emptyState } from "@/lib/saas/persistence";
import { authService } from "@/lib/saas/services";
import { nowIso } from "@/lib/saas/utils";

beforeEach(() => {
  resetOpsMemory();
  resetMemoryState();
  saveState(emptyState());
  authService.ensureDemoSeed();
});

describe("feature flags", () => {
  it("respects emergency disable", () => {
    const flag = {
      id: "1",
      key: "x",
      description: "",
      enabled: true,
      scope: "global" as const,
      rolloutPercent: 100,
      planIds: [],
      userIds: [],
      emergencyDisabled: true,
      updatedAt: nowIso(),
    };
    expect(evaluateFlag(flag, {})).toBe(false);
  });

  it("evaluates plan scope", () => {
    const flag = {
      id: "2",
      key: "admin.console",
      description: "",
      enabled: true,
      scope: "plan" as const,
      rolloutPercent: 100,
      planIds: ["institutional"],
      userIds: [],
      emergencyDisabled: false,
      updatedAt: nowIso(),
    };
    expect(evaluateFlag(flag, { planId: "professional" })).toBe(false);
    expect(evaluateFlag(flag, { planId: "institutional" })).toBe(true);
  });

  it("upserts via service", () => {
    const flag = featureFlagService.list()[0]!;
    const res = featureFlagService.upsert({ ...flag, enabled: false });
    expect(res.ok).toBe(true);
    expect(featureFlagService.isEnabled(flag.key, { planId: "enterprise" })).toBe(
      false
    );
  });
});

describe("audit", () => {
  it("records and filters", () => {
    auditService.record({
      action: "user.login",
      actorEmail: "a@b.co",
      summary: "Login ok",
    });
    const list = auditService.list("login");
    expect(list.length).toBeGreaterThan(0);
    expect(filterAudit(list, "zzz")).toHaveLength(0);
    expect(createAuditEntry({ action: "admin.action", summary: "x" }).id).toMatch(
      /^aud_/
    );
  });
});

describe("health", () => {
  it("collects component health", () => {
    const snap = collectSystemHealth();
    expect(snap.components.length).toBeGreaterThan(5);
    expect(snap.buildVersion).toBeTruthy();
    expect(healthService.api().successRatePct).toBeGreaterThan(0);
  });
});

describe("notifications + email", () => {
  it("pushes notification and queues email", () => {
    const n = notificationService.push({
      kind: "security",
      title: "Alert",
      body: "Test",
    });
    expect(n.ok).toBe(true);
    expect(listEmailTemplates()).toContain("welcome");
    const body = renderEmailTemplate("welcome", { name: "Ada" }).body;
    expect(body).toContain("Ada");
    expect(emailService.queue("password_reset", "x@y.z", { token: "abc" }).ok).toBe(
      true
    );
    expect(emailService.outbox()[0]?.status).toBe("sent");
  });
});

describe("maintenance + backups", () => {
  it("toggles maintenance and creates backup", () => {
    const m = maintenanceService.set({ enabled: true, message: "Down" });
    expect(m.ok).toBe(true);
    expect(maintenanceService.isBlocked("u1", false)).toBe(true);
    expect(maintenanceService.isBlocked("u1", true)).toBe(false);
    expect(backupService.create("test-backup").ok).toBe(true);
    expect(backupService.list().length).toBeGreaterThan(0);
    const rec = createBackupRecord({ label: "x" });
    const done = completeBackup(rec, 100);
    expect(done.status).toBe("completed");
    expect(applyRetention([done], Date.now()).length).toBe(1);
  });
});

describe("security headers", () => {
  it("applies CSP and frame options", () => {
    const h = new Headers();
    applySecurityHeaders(h);
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("Content-Security-Policy")).toContain("default-src");
  });
});

describe("admin service", () => {
  it("lists users from demo seed", () => {
    const users = adminService.listUsers();
    expect(users.length).toBeGreaterThan(0);
    const pool = adminService.licensePool();
    expect(pool.total).toBeGreaterThan(0);
  });
});

describe("persistence", () => {
  it("loads default flags", () => {
    expect(loadOpsState().flags.length).toBeGreaterThan(0);
  });
});
