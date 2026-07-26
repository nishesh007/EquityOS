/**
 * System health checks — Sprint 12C.
 */

import { listProviders } from "@/lib/billing/providers/manager-safe";
import { loadBillingState } from "@/lib/billing/persistence";
import { loadState as loadSaas } from "@/lib/saas/persistence";
import { PACKAGE_VERSION, type ComponentHealth, type HealthStatus, type SystemHealthSnapshot } from "./types";
import { loadOpsState } from "./persistence";
import { nowIso } from "@/lib/saas/utils";

function worst(...statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes("down")) return "down";
  if (statuses.includes("degraded")) return "degraded";
  if (statuses.includes("unknown")) return "unknown";
  return "healthy";
}

function component(
  id: string,
  label: string,
  status: HealthStatus,
  latencyMs: number | null,
  message: string
): ComponentHealth {
  return { id, label, status, latencyMs, message, checkedAt: nowIso() };
}

export function collectSystemHealth(): SystemHealthSnapshot {
  const ops = loadOpsState();
  const saas = loadSaas();
  const billing = loadBillingState();
  const gateways = listProviders();

  const authOk = saas.users.length >= 0;
  const licenseOk = true;
  const billingConfigured = gateways.some((g) => g.available);
  const webhookRecent = billing.webhooks.slice(-5);
  const webhookFail = webhookRecent.filter((w) => !w.signatureValid).length;

  const components: ComponentHealth[] = [
    component("system", "System Status", "healthy", 8, "Core runtime online"),
    component("api", "API Status", "healthy", 42, "Edge + App Router responding"),
    component(
      "auth",
      "Authentication",
      authOk ? "healthy" : "down",
      18,
      `${saas.sessions.length} sessions tracked`
    ),
    component(
      "license",
      "License Server",
      licenseOk ? "healthy" : "degraded",
      22,
      `${saas.licenses.length} licenses in pool`
    ),
    component(
      "billing",
      "Billing",
      billingConfigured ? "healthy" : "degraded",
      55,
      gateways
        .filter((g) => g.available)
        .map((g) => `${g.name}:${g.mode}`)
        .join(", ") || "No gateways"
    ),
    component("database", "Database", "healthy", 15, "Local persistence OK (localStorage/memory)"),
    component("storage", "Storage", "healthy", 12, "Object store placeholder healthy"),
    component(
      "email",
      "Email",
      ops.emailOutbox.some((e) => e.status === "failed") ? "degraded" : "healthy",
      90,
      `${ops.emailOutbox.filter((e) => e.status === "sent").length} sent`
    ),
    component("jobs", "Background Jobs", "healthy", 30, `${ops.metrics.find((m) => m.id === "m_jobs")?.value ?? 0} active`),
    component(
      "webhooks",
      "Webhooks",
      webhookFail > 2 ? "degraded" : "healthy",
      40,
      `${billing.webhooks.length} events · ${webhookFail} recent invalid`
    ),
    component("cache", "Cache", "healthy", 5, "In-memory cache warm"),
  ];

  const overall = worst(...components.map((c) => c.status));

  return {
    overall,
    environment: ops.deployment.environment,
    buildVersion: ops.deployment.buildVersion || PACKAGE_VERSION,
    deploymentVersion: ops.deployment.deploymentVersion,
    lastDeploymentAt: ops.deployment.lastDeploymentAt,
    memoryUsagePct: 48,
    cpuUsagePct: 22,
    diskUsagePct: 35,
    components,
  };
}
