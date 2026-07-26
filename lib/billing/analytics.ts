/**
 * Revenue analytics — Sprint 12B.
 */

import { getPlanPricing } from "./pricing";
import type {
  PaymentGatewayId,
  RevenueAnalytics,
  TransactionRecord,
  SubscriptionLifecycleEvent,
} from "./types";
import type { PlanId } from "@/lib/saas/types";

export function computeRevenueAnalytics(input: {
  transactions: TransactionRecord[];
  activePlanIds: PlanId[];
  lifecycle: SubscriptionLifecycleEvent[];
  creditSavings: number;
}): RevenueAnalytics {
  const succeeded = input.transactions.filter((t) => t.status === "succeeded");
  const failed = input.transactions.filter((t) => t.status === "failed");
  const lifetimeSpend = succeeded.reduce((s, t) => s + t.amount, 0);

  const mrr = input.activePlanIds.reduce((s, id) => {
    return s + getPlanPricing(id).monthlyInr;
  }, 0);

  const gatewayDistribution = {
    razorpay: 0,
    stripe: 0,
    paypal: 0,
    paddle: 0,
    lemonsqueezy: 0,
  } as Record<PaymentGatewayId, number>;
  for (const t of succeeded) {
    gatewayDistribution[t.gateway] = (gatewayDistribution[t.gateway] ?? 0) + t.amount;
  }

  const cancels = input.lifecycle.filter((e) => e.toStatus === "cancelled").length;
  const renewals = input.lifecycle.filter((e) => e.toStatus === "active" || e.toStatus === "reactivated").length;
  const activeSubscribers = input.activePlanIds.filter((p) => p !== "free").length;
  const churnRatePct =
    activeSubscribers + cancels === 0
      ? 0
      : Math.round((cancels / (activeSubscribers + cancels)) * 1000) / 10;
  const renewalRatePct =
    renewals + cancels === 0
      ? 100
      : Math.round((renewals / (renewals + cancels)) * 1000) / 10;
  const attempts = succeeded.length + failed.length;
  const paymentSuccessRatePct =
    attempts === 0 ? 100 : Math.round((succeeded.length / attempts) * 1000) / 10;
  const arpu = activeSubscribers === 0 ? 0 : Math.round((mrr / activeSubscribers) * 100) / 100;
  const ltv = Math.round(arpu * 18 * 100) / 100;

  return {
    mrr,
    arr: mrr * 12,
    monthlyGrowthPct: 0,
    activeSubscribers,
    churnRatePct,
    renewalRatePct,
    arpu,
    ltv,
    paymentSuccessRatePct,
    gatewayDistribution,
    lifetimeSpend,
    totalSavings: input.creditSavings,
  };
}
