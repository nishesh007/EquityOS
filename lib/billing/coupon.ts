/**
 * Coupon validation engine — Sprint 12B.
 */

import type { PlanId } from "@/lib/saas/types";
import { planRank } from "@/lib/saas/plans";
import type { CouponRecord } from "./types";

export function validateCoupon(input: {
  coupon: CouponRecord | null;
  planId: PlanId;
  amount: number;
  now?: number;
}): { ok: boolean; discount: number; trialExtensionDays: number; error?: string } {
  const { coupon, planId, amount } = input;
  const now = input.now ?? Date.now();
  if (!coupon) return { ok: false, discount: 0, trialExtensionDays: 0, error: "Coupon not found." };
  if (!coupon.active) return { ok: false, discount: 0, trialExtensionDays: 0, error: "Coupon inactive." };
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) {
    return { ok: false, discount: 0, trialExtensionDays: 0, error: "Coupon expired." };
  }
  if (coupon.usedCount >= coupon.maxUses) {
    return { ok: false, discount: 0, trialExtensionDays: 0, error: "Coupon usage limit reached." };
  }
  if (coupon.minPlanId && planRank(planId) < planRank(coupon.minPlanId)) {
    return {
      ok: false,
      discount: 0,
      trialExtensionDays: 0,
      error: `Coupon requires ${coupon.minPlanId} or higher.`,
    };
  }

  if (coupon.type === "trial_extension") {
    return { ok: true, discount: 0, trialExtensionDays: coupon.trialExtensionDays };
  }

  let discount = 0;
  if (coupon.type === "percentage" || coupon.type === "referral") {
    discount = Math.round(amount * (coupon.value / 100) * 100) / 100;
  } else if (coupon.type === "flat") {
    discount = coupon.value;
  }
  if (coupon.maxDiscount != null) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  discount = Math.min(discount, amount);
  return { ok: true, discount, trialExtensionDays: 0 };
}

export const DEFAULT_COUPONS: CouponRecord[] = [
  {
    id: "cpn_welcome",
    code: "WELCOME20",
    type: "percentage",
    value: 20,
    trialExtensionDays: 0,
    maxUses: 1000,
    usedCount: 0,
    expiresAt: null,
    minPlanId: "starter",
    maxDiscount: 2000,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "cpn_flat500",
    code: "FLAT500",
    type: "flat",
    value: 500,
    trialExtensionDays: 0,
    maxUses: 500,
    usedCount: 0,
    expiresAt: null,
    minPlanId: "professional",
    maxDiscount: null,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "cpn_trial7",
    code: "EXTRA7",
    type: "trial_extension",
    value: 0,
    trialExtensionDays: 7,
    maxUses: 200,
    usedCount: 0,
    expiresAt: null,
    minPlanId: null,
    maxDiscount: null,
    active: true,
    createdAt: new Date().toISOString(),
  },
];
