"use client";

import { SettingsShell } from "@/components/saas";
import { SubscriptionSubNav, UsageMeters } from "@/components/billing";
import { useUsage } from "@/lib/billing";
import { usageRemaining } from "@/lib/billing/usage";
import { useSubscription } from "@/lib/saas";

export default function UsagePage() {
  const { usage, trackUsage, exportUsageCsv } = useUsage();
  const { subscription } = useSubscription();
  const planId = subscription?.planId ?? "free";
  const remaining = usage ? usageRemaining(usage, planId) : {};

  return (
    <SettingsShell
      title="Usage"
      description="Quotas for AI, research, exports, backtests, and storage."
    >
      <SubscriptionSubNav />
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportUsageCsv}
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-raised"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => trackUsage("aiRequests")}
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-raised"
        >
          Simulate AI request
        </button>
      </div>
      {usage ? (
        <>
          <p className="mb-4 text-xs text-text-faint">
            Period {new Date(usage.periodStart).toLocaleDateString()} →{" "}
            {new Date(usage.periodEnd).toLocaleDateString()} (monthly reset)
          </p>
          <UsageMeters usage={usage} remaining={remaining} />
        </>
      ) : (
        <p className="text-sm text-text-secondary">No usage data.</p>
      )}
    </SettingsShell>
  );
}
