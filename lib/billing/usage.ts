/**
 * Usage tracking — Sprint 12B.
 */

import { getPlan } from "@/lib/saas/plans";
import type { PlanId } from "@/lib/saas/types";
import type { UsageSnapshot } from "./types";
import { addDays, nowIso } from "@/lib/saas/utils";

export type UsageMetric = keyof Omit<UsageSnapshot, "userId" | "periodStart" | "periodEnd">;

export function createUsagePeriod(userId: string, from = nowIso()): UsageSnapshot {
  return {
    userId,
    periodStart: from,
    periodEnd: addDays(from, 30),
    aiRequests: 0,
    researchReports: 0,
    exports: 0,
    backtests: 0,
    optimizationRuns: 0,
    paperTradingSessions: 0,
    watchlists: 0,
    portfolioCount: 0,
    apiCalls: 0,
    storageGbUsed: 0,
  };
}

export function incrementUsage(
  snap: UsageSnapshot,
  metric: UsageMetric,
  by = 1
): UsageSnapshot {
  return { ...snap, [metric]: (snap[metric] as number) + by };
}

export function usageRemaining(
  snap: UsageSnapshot,
  planId: PlanId
): Record<string, { used: number; limit: number; remaining: number }> {
  const limits = getPlan(planId).limits;
  const rows: Array<[string, number, number]> = [
    ["aiRequests", snap.aiRequests, limits.aiRequestsPerMonth],
    ["researchReports", snap.researchReports, limits.researchReportsPerMonth],
    ["exports", snap.exports, limits.exportsPerMonth],
    ["backtests", snap.backtests, limits.backtestsPerMonth],
    ["optimizationRuns", snap.optimizationRuns, limits.optimizationRunsPerMonth],
    ["watchlists", snap.watchlists, limits.watchlists],
    ["portfolioCount", snap.portfolioCount, limits.portfolioCount],
    ["storageGb", snap.storageGbUsed, limits.storageGb],
  ];
  const out: Record<string, { used: number; limit: number; remaining: number }> = {};
  for (const [k, used, limit] of rows) {
    out[k] = { used, limit, remaining: Math.max(0, limit - used) };
  }
  return out;
}
