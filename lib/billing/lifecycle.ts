/**
 * Subscription commercial lifecycle — Sprint 12B.
 */

import type { PlanId } from "@/lib/saas/types";
import type {
  ExtendedSubscriptionStatus,
  SubscriptionLifecycleEvent,
} from "./types";
import { createId, nowIso } from "@/lib/saas/utils";

const TRANSITIONS: Record<
  ExtendedSubscriptionStatus,
  ExtendedSubscriptionStatus[]
> = {
  free: ["trial", "active"],
  trial: ["active", "expired", "cancelled", "grace"],
  active: ["grace", "past_due", "cancelled", "suspended", "expired"],
  grace: ["active", "past_due", "expired", "cancelled"],
  past_due: ["active", "grace", "expired", "suspended", "cancelled"],
  cancelled: ["expired", "reactivated", "free"],
  expired: ["reactivated", "free", "trial"],
  suspended: ["reactivated", "cancelled", "expired"],
  reactivated: ["active", "cancelled"],
};

export function canTransition(
  from: ExtendedSubscriptionStatus,
  to: ExtendedSubscriptionStatus
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function mapSaasStatus(
  status: string,
  planId: PlanId
): ExtendedSubscriptionStatus {
  if (planId === "free") return "free";
  if (status === "trialing") return "trial";
  if (status === "past_due") return "past_due";
  if (status === "cancelled") return "cancelled";
  if (status === "expired") return "expired";
  if (status === "active") return "active";
  return "active";
}

export function recordLifecycle(input: {
  userId: string;
  fromStatus: ExtendedSubscriptionStatus;
  toStatus: ExtendedSubscriptionStatus;
  planId: PlanId;
  note: string;
}): SubscriptionLifecycleEvent {
  return {
    id: createId("lc"),
    userId: input.userId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    planId: input.planId,
    note: input.note,
    createdAt: nowIso(),
  };
}

export type LifecycleAction =
  | "upgrade"
  | "downgrade"
  | "renewal"
  | "auto_renewal"
  | "manual_renewal"
  | "reactivate"
  | "suspend"
  | "cancel"
  | "enter_grace"
  | "expire";

export function applyLifecycleAction(
  current: ExtendedSubscriptionStatus,
  action: LifecycleAction
): ExtendedSubscriptionStatus {
  switch (action) {
    case "upgrade":
    case "downgrade":
    case "renewal":
    case "auto_renewal":
    case "manual_renewal":
      return canTransition(current, "active") ? "active" : current;
    case "reactivate":
      return canTransition(current, "reactivated") ? "reactivated" : current;
    case "suspend":
      return canTransition(current, "suspended") ? "suspended" : current;
    case "cancel":
      return canTransition(current, "cancelled") ? "cancelled" : current;
    case "enter_grace":
      return canTransition(current, "grace") ? "grace" : current;
    case "expire":
      return canTransition(current, "expired") ? "expired" : current;
    default:
      return current;
  }
}
