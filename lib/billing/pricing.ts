/**
 * Commercial plan pricing — Sprint 12B (INR primary, USD secondary).
 */

import type { PlanId } from "@/lib/saas/types";
import type { BillingCycle, PlanPricing } from "./types";

export const PLAN_PRICING: readonly PlanPricing[] = [
  {
    planId: "free",
    monthlyInr: 0,
    yearlyInr: 0,
    monthlyUsd: 0,
    yearlyUsd: 0,
    currencyDefault: "INR",
  },
  {
    planId: "starter",
    monthlyInr: 999,
    yearlyInr: 9990,
    monthlyUsd: 12,
    yearlyUsd: 120,
    currencyDefault: "INR",
  },
  {
    planId: "professional",
    monthlyInr: 2999,
    yearlyInr: 29990,
    monthlyUsd: 36,
    yearlyUsd: 360,
    currencyDefault: "INR",
  },
  {
    planId: "institutional",
    monthlyInr: 9999,
    yearlyInr: 99990,
    monthlyUsd: 120,
    yearlyUsd: 1200,
    currencyDefault: "INR",
  },
  {
    planId: "enterprise",
    monthlyInr: 24999,
    yearlyInr: 249990,
    monthlyUsd: 299,
    yearlyUsd: 2990,
    currencyDefault: "INR",
  },
] as const;

export function getPlanPricing(planId: PlanId): PlanPricing {
  return PLAN_PRICING.find((p) => p.planId === planId) ?? PLAN_PRICING[0]!;
}

export function priceFor(
  planId: PlanId,
  cycle: BillingCycle,
  currency: "INR" | "USD" = "INR"
): number {
  const p = getPlanPricing(planId);
  if (currency === "USD") {
    return cycle === "yearly" ? p.yearlyUsd : p.monthlyUsd;
  }
  return cycle === "yearly" ? p.yearlyInr : p.monthlyInr;
}
