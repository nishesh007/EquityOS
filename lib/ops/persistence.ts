/**
 * Ops persistence — Sprint 12C.
 */

import {
  OPS_STORAGE_KEY,
  PACKAGE_VERSION,
  type FeatureFlag,
  type OpsPersistedState,
  type SystemSettings,
} from "./types";
import { nowIso } from "@/lib/saas/utils";

let memoryState: OpsPersistedState | null = null;

export function defaultSettings(): SystemSettings {
  return {
    companyName: "EquityOS",
    logoUrl: null,
    supportEmail: "support@equityos.app",
    supportUrl: "https://equityos.app/support",
    privacyPolicyUrl: "/legal/privacy",
    termsUrl: "/legal/terms",
    cookiePolicyUrl: "/legal/cookies",
    timezone: "Asia/Kolkata",
    defaultCurrency: "INR",
    updatedAt: nowIso(),
  };
}

export function defaultFlags(): FeatureFlag[] {
  const ts = nowIso();
  return [
    {
      id: "ff_admin_console",
      key: "admin.console",
      description: "Enterprise administration console",
      enabled: true,
      scope: "plan",
      rolloutPercent: 100,
      planIds: ["institutional", "enterprise"],
      userIds: [],
      emergencyDisabled: false,
      updatedAt: ts,
    },
    {
      id: "ff_ai_insights",
      key: "ai.insights",
      description: "AI insights beta",
      enabled: true,
      scope: "beta",
      rolloutPercent: 50,
      planIds: [],
      userIds: [],
      emergencyDisabled: false,
      updatedAt: ts,
    },
    {
      id: "ff_strategy_builder",
      key: "research.strategy_builder",
      description: "AI Strategy Builder canary",
      enabled: true,
      scope: "canary",
      rolloutPercent: 25,
      planIds: ["professional", "institutional", "enterprise"],
      userIds: [],
      emergencyDisabled: false,
      updatedAt: ts,
    },
    {
      id: "ff_maintenance_banner",
      key: "ops.maintenance_banner",
      description: "Show maintenance banner globally",
      enabled: false,
      scope: "global",
      rolloutPercent: 100,
      planIds: [],
      userIds: [],
      emergencyDisabled: false,
      updatedAt: ts,
    },
  ];
}

export function emptyOpsState(): OpsPersistedState {
  const ts = nowIso();
  return {
    version: 1,
    audit: [],
    flags: defaultFlags(),
    notifications: [],
    emailOutbox: [],
    backups: [],
    maintenance: {
      enabled: false,
      message: "Scheduled maintenance in progress.",
      estimatedCompletionAt: null,
      allowAdminLogin: true,
      whitelistUserIds: [],
      updatedAt: ts,
    },
    settings: defaultSettings(),
    metrics: [
      {
        id: "m_latency",
        name: "API P95 Latency",
        value: 120,
        unit: "ms",
        trendPct: -4,
        updatedAt: ts,
      },
      {
        id: "m_error",
        name: "Error Rate",
        value: 0.4,
        unit: "%",
        trendPct: -12,
        updatedAt: ts,
      },
      {
        id: "m_req",
        name: "Request Volume",
        value: 1840,
        unit: "/hr",
        trendPct: 8,
        updatedAt: ts,
      },
      {
        id: "m_jobs",
        name: "Background Jobs",
        value: 12,
        unit: "active",
        trendPct: 0,
        updatedAt: ts,
      },
    ],
    logs: [],
    deployment: {
      buildVersion: PACKAGE_VERSION,
      deploymentVersion: `deploy-${PACKAGE_VERSION}`,
      lastDeploymentAt: ts,
      environment:
        process.env.NODE_ENV === "production" ? "production" : "development",
    },
  };
}

export function resetOpsMemory(): void {
  memoryState = emptyOpsState();
}

export function loadOpsState(): OpsPersistedState {
  if (typeof window === "undefined") {
    return memoryState ?? emptyOpsState();
  }
  try {
    const raw = window.localStorage.getItem(OPS_STORAGE_KEY);
    if (!raw) return emptyOpsState();
    const parsed = JSON.parse(raw) as Partial<OpsPersistedState>;
    if (parsed.version !== 1) return emptyOpsState();
    const base = emptyOpsState();
    return {
      ...base,
      ...parsed,
      version: 1,
      audit: parsed.audit ?? [],
      flags: parsed.flags?.length ? parsed.flags : base.flags,
      notifications: parsed.notifications ?? [],
      emailOutbox: parsed.emailOutbox ?? [],
      backups: parsed.backups ?? [],
      maintenance: parsed.maintenance ?? base.maintenance,
      settings: parsed.settings ?? base.settings,
      metrics: parsed.metrics?.length ? parsed.metrics : base.metrics,
      logs: parsed.logs ?? [],
      deployment: parsed.deployment ?? base.deployment,
    };
  } catch {
    return emptyOpsState();
  }
}

export function saveOpsState(
  state: OpsPersistedState
): { ok: boolean; error?: string } {
  memoryState = state;
  if (typeof window === "undefined") return { ok: true };
  try {
    window.localStorage.setItem(OPS_STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to persist ops data." };
  }
}
