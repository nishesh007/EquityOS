/**
 * Ops domain services — Sprint 12C.
 */

import { createAuditEntry, filterAudit } from "./audit";
import { computeApiHealth, computeOpsAnalytics } from "./analytics";
import {
  applyRetention,
  completeBackup,
  createBackupRecord,
  failBackup,
} from "./backup";
import { renderEmailTemplate, listEmailTemplates } from "./email-templates";
import { evaluateFlag } from "./feature-flags";
import { collectSystemHealth } from "./health";
import { loadOpsState, saveOpsState } from "./persistence";
import type {
  AuditAction,
  EmailTemplateId,
  FeatureFlag,
  MaintenanceState,
  NotificationKind,
  OpsNotification,
  OpsPersistedState,
  SystemSettings,
} from "./types";
import { createId, nowIso } from "@/lib/saas/utils";
import { loadState as loadSaas, saveState as saveSaas } from "@/lib/saas/persistence";
import { revokeLicense, createLicense } from "@/lib/saas/license-engine";
import type { PlanId, UserRole } from "@/lib/saas/types";
import { subscriptionService } from "@/lib/saas/services";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function persist(state: OpsPersistedState): ServiceResult<OpsPersistedState> {
  const saved = saveOpsState(state);
  if (!saved.ok) return { ok: false, error: saved.error ?? "Persist failed" };
  return { ok: true, data: state };
}

function appendAudit(
  state: OpsPersistedState,
  entry: ReturnType<typeof createAuditEntry>
): OpsPersistedState {
  return { ...state, audit: [entry, ...state.audit].slice(0, 2000) };
}

function appendLog(
  state: OpsPersistedState,
  level: "debug" | "info" | "warn" | "error",
  message: string,
  context: Record<string, unknown> = {}
): OpsPersistedState {
  return {
    ...state,
    logs: [
      {
        id: createId("log"),
        level,
        message,
        service: "equityos-ops",
        context,
        createdAt: nowIso(),
      },
      ...state.logs,
    ].slice(0, 1000),
  };
}

export const healthService = {
  snapshot: collectSystemHealth,
  api: computeApiHealth,
};

export const auditService = {
  list(query = "") {
    return filterAudit(loadOpsState().audit, query);
  },
  record(input: {
    action: AuditAction;
    actorUserId?: string | null;
    actorEmail?: string | null;
    targetId?: string | null;
    summary: string;
    metadata?: Record<string, string>;
  }): ServiceResult<true> {
    let state = loadOpsState();
    state = appendAudit(state, createAuditEntry(input));
    const saved = persist(state);
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },
};

export const monitoringService = {
  metrics() {
    return loadOpsState().metrics;
  },
  logs(limit = 100) {
    return loadOpsState().logs.slice(0, limit);
  },
  log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    context?: Record<string, unknown>
  ): ServiceResult<true> {
    let state = loadOpsState();
    state = appendLog(state, level, message, context);
    const saved = persist(state);
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },
  refreshSynthetic(): ServiceResult<true> {
    let state = loadOpsState();
    const jitter = () => Math.round((Math.random() - 0.5) * 10);
    state = {
      ...state,
      metrics: state.metrics.map((m) => ({
        ...m,
        value: Math.max(0, Math.round((m.value + jitter()) * 10) / 10),
        updatedAt: nowIso(),
      })),
    };
    const saved = persist(state);
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },
};

export const featureFlagService = {
  list() {
    return loadOpsState().flags;
  },
  isEnabled(
    key: string,
    ctx: { userId?: string | null; planId?: string | null } = {}
  ): boolean {
    const flag = loadOpsState().flags.find((f) => f.key === key);
    if (!flag) return false;
    return evaluateFlag(flag, ctx);
  },
  upsert(flag: FeatureFlag): ServiceResult<FeatureFlag> {
    let state = loadOpsState();
    const idx = state.flags.findIndex((f) => f.id === flag.id || f.key === flag.key);
    const next = { ...flag, updatedAt: nowIso() };
    const flags =
      idx >= 0
        ? state.flags.map((f, i) => (i === idx ? next : f))
        : [...state.flags, next];
    state = appendAudit(
      { ...state, flags },
      createAuditEntry({
        action: "feature_flag.change",
        summary: `Flag ${next.key} → enabled=${next.enabled} emergency=${next.emergencyDisabled}`,
        targetId: next.id,
        metadata: { key: next.key },
      })
    );
    const saved = persist(state);
    if (!saved.ok) return saved;
    return { ok: true, data: next };
  },
  emergencyDisable(key: string): ServiceResult<true> {
    const flag = this.list().find((f) => f.key === key);
    if (!flag) return { ok: false, error: "Flag not found." };
    const res = this.upsert({
      ...flag,
      emergencyDisabled: true,
      enabled: false,
    });
    if (!res.ok) return res;
    return { ok: true, data: true };
  },
};

export const notificationService = {
  list(userId?: string | null) {
    const all = loadOpsState().notifications;
    if (!userId) return all;
    return all.filter((n) => n.userId == null || n.userId === userId);
  },
  push(input: {
    kind: NotificationKind;
    title: string;
    body: string;
    userId?: string | null;
  }): ServiceResult<OpsNotification> {
    let state = loadOpsState();
    const note: OpsNotification = {
      id: createId("ntf"),
      kind: input.kind,
      title: input.title,
      body: input.body,
      userId: input.userId ?? null,
      read: false,
      createdAt: nowIso(),
      expiresAt: null,
    };
    state = {
      ...state,
      notifications: [note, ...state.notifications].slice(0, 500),
    };
    state = appendAudit(
      state,
      createAuditEntry({
        action: "notification.send",
        summary: input.title,
        metadata: { kind: input.kind },
      })
    );
    const saved = persist(state);
    if (!saved.ok) return saved;
    return { ok: true, data: note };
  },
  markRead(id: string): ServiceResult<true> {
    const state = loadOpsState();
    const saved = persist({
      ...state,
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    });
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },
};

export const emailService = {
  templates: listEmailTemplates,
  queue(
    templateId: EmailTemplateId,
    to: string,
    vars: Record<string, string> = {}
  ): ServiceResult<true> {
    const rendered = renderEmailTemplate(templateId, vars);
    let state = loadOpsState();
    state = {
      ...state,
      emailOutbox: [
        {
          id: createId("eml"),
          templateId,
          to,
          subject: rendered.subject,
          body: rendered.body,
          status: "sent" as const,
          createdAt: nowIso(),
          error: null,
        },
        ...state.emailOutbox,
      ].slice(0, 500),
    };
    state = appendLog(state, "info", `Email ${templateId} → ${to}`);
    const saved = persist(state);
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },
  outbox() {
    return loadOpsState().emailOutbox;
  },
};

export const backupService = {
  list() {
    return applyRetention(loadOpsState().backups);
  },
  create(label: string, scheduled = false): ServiceResult<true> {
    let state = loadOpsState();
    let record = createBackupRecord({ label, scheduled });
    record = { ...record, status: "running" };
    try {
      const saas = loadSaas();
      const size =
        JSON.stringify(saas).length + JSON.stringify(state).length;
      record = completeBackup(record, size);
    } catch (e) {
      record = failBackup(
        record,
        e instanceof Error ? e.message : "Backup failed"
      );
    }
    state = {
      ...state,
      backups: applyRetention([record, ...state.backups]),
    };
    state = appendAudit(
      state,
      createAuditEntry({
        action: "backup.create",
        summary: `${label} → ${record.status}`,
        targetId: record.id,
      })
    );
    const saved = persist(state);
    if (!saved.ok) return saved;
    if (record.status === "failed") {
      return { ok: false, error: record.error ?? "Backup failed" };
    }
    return { ok: true, data: true };
  },
  restorePlaceholder(backupId: string): ServiceResult<{ message: string }> {
    const b = this.list().find((x) => x.id === backupId);
    if (!b) return { ok: false, error: "Backup not found." };
    return {
      ok: true,
      data: {
        message: `Restore of ${b.label} is queued (placeholder — no destructive restore in demo).`,
      },
    };
  },
};

export const maintenanceService = {
  get() {
    return loadOpsState().maintenance;
  },
  set(patch: Partial<MaintenanceState>): ServiceResult<MaintenanceState> {
    let state = loadOpsState();
    const maintenance: MaintenanceState = {
      ...state.maintenance,
      ...patch,
      updatedAt: nowIso(),
    };
    state = appendAudit(
      { ...state, maintenance },
      createAuditEntry({
        action: "maintenance.toggle",
        summary: `Maintenance ${maintenance.enabled ? "enabled" : "disabled"}`,
        metadata: { message: maintenance.message },
      })
    );
    const saved = persist(state);
    if (!saved.ok) return saved;
    return { ok: true, data: maintenance };
  },
  isBlocked(userId: string | null, isAdmin: boolean): boolean {
    const m = this.get();
    if (!m.enabled) return false;
    if (isAdmin && m.allowAdminLogin) return false;
    if (userId && m.whitelistUserIds.includes(userId)) return false;
    return true;
  },
};

export const deploymentService = {
  info() {
    return loadOpsState().deployment;
  },
  recordDeploy(version: string): ServiceResult<true> {
    const state = loadOpsState();
    const saved = persist({
      ...state,
      deployment: {
        ...state.deployment,
        deploymentVersion: version,
        lastDeploymentAt: nowIso(),
      },
    });
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },
};

export const settingsService = {
  get() {
    return loadOpsState().settings;
  },
  update(patch: Partial<SystemSettings>): ServiceResult<SystemSettings> {
    const state = loadOpsState();
    const settings = { ...state.settings, ...patch, updatedAt: nowIso() };
    const saved = persist({ ...state, settings });
    if (!saved.ok) return saved;
    return { ok: true, data: settings };
  },
};

export const analyticsOpsService = {
  compute: computeOpsAnalytics,
};

export const adminService = {
  search(query: string) {
    const q = query.trim().toLowerCase();
    const saas = loadSaas();
    const users = saas.users.filter(
      (u) =>
        !q ||
        u.profile.email.includes(q) ||
        u.profile.displayName.toLowerCase().includes(q)
    );
    const licenses = saas.licenses.filter(
      (l) => !q || l.id.includes(q) || l.licenseKey.toLowerCase().includes(q)
    );
    const subscriptions = saas.subscriptions.filter(
      (s) => !q || s.id.includes(q) || s.planId.includes(q) || s.registeredEmail.includes(q)
    );
    const audit = filterAudit(loadOpsState().audit, q);
    return { users, licenses, subscriptions, audit };
  },

  listUsers() {
    const saas = loadSaas();
    return saas.users.map((u) => {
      const sub = saas.subscriptions.find((s) => s.userId === u.profile.id);
      const license = saas.licenses.find((l) => l.userId === u.profile.id);
      const devices = saas.devices.filter((d) => d.userId === u.profile.id);
      const sessions = saas.sessions.filter((s) => s.userId === u.profile.id);
      const lastLogin = saas.loginHistory
        .filter((h) => h.userId === u.profile.id)
        .sort((a, b) => b.at.localeCompare(a.at))[0];
      return {
        user: u,
        planId: sub?.planId ?? "free",
        role: u.profile.role,
        license,
        deviceCount: devices.length,
        sessionCount: sessions.length,
        lastLoginAt: lastLogin?.at ?? null,
        status: license?.status === "revoked" ? "suspended" : "active",
      };
    });
  },

  forceLogout(userId: string): ServiceResult<true> {
    const saas = loadSaas();
    const sessions = saas.sessions.filter((s) => s.userId !== userId);
    const activeSessionId =
      saas.activeSessionId &&
      saas.sessions.find((s) => s.id === saas.activeSessionId)?.userId === userId
        ? null
        : saas.activeSessionId;
    saveSaas({ ...saas, sessions, activeSessionId });
    auditService.record({
      action: "admin.action",
      targetId: userId,
      summary: "Force logout",
    });
    return { ok: true, data: true };
  },

  suspendUser(userId: string): ServiceResult<true> {
    const saas = loadSaas();
    const licenses = saas.licenses.map((l) =>
      l.userId === userId ? revokeLicense(l) : l
    );
    saveSaas({ ...saas, licenses });
    auditService.record({
      action: "license.revoke",
      targetId: userId,
      summary: "Admin suspend — license revoked",
    });
    notificationService.push({
      kind: "security",
      title: "Account suspended",
      body: "An administrator suspended this account.",
      userId,
    });
    return { ok: true, data: true };
  },

  reactivateUser(userId: string, planId: PlanId = "professional"): ServiceResult<true> {
    const saas = loadSaas();
    const user = saas.users.find((u) => u.profile.id === userId);
    if (!user) return { ok: false, error: "User not found." };
    const license = createLicense({ userId, planId, expiresAt: null });
    const licenses = [
      ...saas.licenses.filter((l) => l.userId !== userId),
      license,
    ];
    saveSaas({ ...saas, licenses });
    subscriptionService.changePlan(userId, planId);
    auditService.record({
      action: "license.assign",
      targetId: userId,
      summary: `Reactivated with ${planId}`,
    });
    return { ok: true, data: true };
  },

  setRole(userId: string, role: UserRole): ServiceResult<true> {
    const saas = loadSaas();
    const users = saas.users.map((u) =>
      u.profile.id === userId
        ? { ...u, profile: { ...u.profile, role, updatedAt: nowIso() } }
        : u
    );
    saveSaas({ ...saas, users });
    auditService.record({
      action: "role.change",
      targetId: userId,
      summary: `Role → ${role}`,
    });
    return { ok: true, data: true };
  },

  licensePool() {
    const licenses = loadSaas().licenses;
    return {
      total: licenses.length,
      assigned: licenses.filter((l) => l.status === "valid").length,
      available: Math.max(
        0,
        100 - licenses.filter((l) => l.status === "valid").length
      ),
      expired: licenses.filter((l) => l.status === "expired").length,
      revoked: licenses.filter((l) => l.status === "revoked").length,
      transferred: licenses.filter((l) => l.status === "transfer_pending").length,
      offline: licenses.filter((l) => l.status === "grace").length,
      licenses,
    };
  },
};
