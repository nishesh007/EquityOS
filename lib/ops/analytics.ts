/**
 * Ops analytics + API health — Sprint 12C.
 */

import { loadState as loadSaas } from "@/lib/saas/persistence";
import { loadBillingState } from "@/lib/billing/persistence";
import { analyticsService } from "@/lib/billing/services";
import { loadOpsState } from "./persistence";
import type { ApiHealthStats, OpsAnalytics } from "./types";

export function computeOpsAnalytics(): OpsAnalytics {
  const saas = loadSaas();
  const billing = loadBillingState();
  const ops = loadOpsState();
  const activeSessions = saas.sessions.length;
  const planDistribution: Record<string, number> = {};
  for (const s of saas.subscriptions) {
    planDistribution[s.planId] = (planDistribution[s.planId] ?? 0) + 1;
  }
  const licenses = saas.licenses;
  const assigned = licenses.filter((l) => l.status === "valid").length;
  const revenue = analyticsService.compute(saas.subscriptions.map((s) => s.planId));

  const featureAdoption: Record<string, number> = {};
  for (const f of ops.flags) {
    featureAdoption[f.key] = f.enabled && !f.emergencyDisabled ? f.rolloutPercent : 0;
  }

  return {
    dau: Math.max(1, Math.min(saas.users.length, activeSessions || saas.users.length)),
    mau: Math.max(saas.users.length, 1),
    activeSessions,
    subscriberGrowthPct: revenue.monthlyGrowthPct,
    revenueTrendPct: revenue.paymentSuccessRatePct - 90,
    planDistribution,
    licenseUtilizationPct:
      licenses.length === 0
        ? 0
        : Math.round((assigned / licenses.length) * 1000) / 10,
    researchUsage: billing.usage.reduce((s, u) => s + u.researchReports, 0),
    aiUsage: billing.usage.reduce((s, u) => s + u.aiRequests, 0),
    featureAdoption,
  };
}

export function computeApiHealth(): ApiHealthStats {
  const ops = loadOpsState();
  const billing = loadBillingState();
  const latency =
    ops.metrics.find((m) => m.id === "m_latency")?.value ?? 120;
  const errorRate = ops.metrics.find((m) => m.id === "m_error")?.value ?? 0.4;
  const volume = ops.metrics.find((m) => m.id === "m_req")?.value ?? 0;
  const webhookHealthy = !billing.webhooks
    .slice(-10)
    .some((w) => !w.signatureValid && !w.duplicate);

  return {
    latencyMs: latency,
    availabilityPct: Math.max(0, 100 - errorRate),
    errorRatePct: errorRate,
    successRatePct: Math.max(0, 100 - errorRate),
    requestVolume: volume,
    webhookHealthy,
  };
}
