"use client";

import Link from "next/link";
import { useSubscription, useAuth } from "@/lib/saas";
import { cn } from "@/lib/utils";

export function UpgradeBanner({ className }: { className?: string }) {
  const { isAuthenticated } = useAuth();
  const { subscription, trialDaysRemaining } = useSubscription();

  if (!isAuthenticated || !subscription) return null;

  if (subscription.status === "trialing") {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100",
          className
        )}
      >
        <span>
          Trial active — <strong>{trialDaysRemaining}</strong> day
          {trialDaysRemaining === 1 ? "" : "s"} remaining on{" "}
          <strong className="capitalize">{subscription.planId}</strong>.
        </span>
        <Link href="/settings/subscription" className="font-semibold underline">
          Upgrade
        </Link>
      </div>
    );
  }

  if (subscription.status === "expired" || subscription.status === "grace") {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-loss/40 bg-loss/10 px-4 py-2 text-sm text-loss",
          className
        )}
      >
        <span>
          {subscription.status === "grace"
            ? "Grace period — renew to keep full access."
            : "Subscription expired — upgrade to restore entitlements."}
        </span>
        <Link href="/settings/subscription" className="font-semibold underline">
          Manage subscription
        </Link>
      </div>
    );
  }

  return null;
}

export function SubscriptionBadge() {
  const { subscription } = useSubscription();
  if (!subscription) return null;
  return (
    <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
      {subscription.planId} · {subscription.status}
    </span>
  );
}
