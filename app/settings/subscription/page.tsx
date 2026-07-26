"use client";

import { SettingsShell, PlanCard, LicenseCard, PermissionBadge } from "@/components/saas";
import { Card } from "@/components/ui/Card";
import {
  useSubscription,
  useLicense,
  usePermissions,
  useCurrentUser,
  getPlan,
} from "@/lib/saas";
import type { PlanId } from "@/lib/saas";

export default function SubscriptionSettingsPage() {
  const { profile } = useCurrentUser();
  const { subscription, plans, trialDaysRemaining, changePlan, startTrial } =
    useSubscription();
  const { license } = useLicense();
  const { permissions } = usePermissions();

  if (!subscription || !profile) {
    return (
      <SettingsShell title="Subscription">
        <Card padding="lg">
          <p className="text-sm text-text-secondary">No subscription on this account.</p>
        </Card>
      </SettingsShell>
    );
  }

  const plan = getPlan(subscription.planId);

  return (
    <SettingsShell
      title="Subscription"
      description="Plan entitlements, license metadata, and usage limits. Payments arrive in Sprint 12B."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2" accent="violet">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-text-faint">
                Current plan
              </div>
              <div className="text-2xl font-semibold text-text-primary">{plan.name}</div>
              <p className="mt-1 text-sm text-text-secondary">{plan.description}</p>
            </div>
            <div className="text-right text-xs">
              <div className="capitalize text-accent">{subscription.status}</div>
              {subscription.status === "trialing" && (
                <div className="text-text-secondary">
                  {trialDaysRemaining} days left
                </div>
              )}
            </div>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <div>
              <dt className="text-text-faint">Registered email</dt>
              <dd>{subscription.registeredEmail}</dd>
            </div>
            <div>
              <dt className="text-text-faint">Renewal</dt>
              <dd>
                {subscription.renewalDate
                  ? new Date(subscription.renewalDate).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-faint">Expiry</dt>
              <dd>
                {subscription.expiryDate
                  ? new Date(subscription.expiryDate).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-faint">Max devices</dt>
              <dd>{plan.limits.maxDevices}</dd>
            </div>
            <div>
              <dt className="text-text-faint">Seats</dt>
              <dd>
                {license ? `${license.seatsUsed}/${license.seats}` : plan.limits.maxSeats}
              </dd>
            </div>
            <div>
              <dt className="text-text-faint">Storage</dt>
              <dd>{plan.limits.storageGb} GB</dd>
            </div>
          </dl>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <div className="rounded-lg border border-surface-border-subtle p-2">
              Exports {subscription.usage.exportsUsed}/{plan.limits.exportsPerMonth}
            </div>
            <div className="rounded-lg border border-surface-border-subtle p-2">
              Research {subscription.usage.researchReportsUsed}/
              {plan.limits.researchReportsPerMonth}
            </div>
            <div className="rounded-lg border border-surface-border-subtle p-2">
              AI {subscription.usage.aiRequestsUsed}/{plan.limits.aiRequestsPerMonth}
            </div>
            <div className="rounded-lg border border-surface-border-subtle p-2">
              Optimizations {subscription.usage.optimizationRunsUsed}/
              {plan.limits.optimizationRunsPerMonth}
            </div>
            <div className="rounded-lg border border-surface-border-subtle p-2">
              Backtests {subscription.usage.backtestsUsed}/{plan.limits.backtestsPerMonth}
            </div>
            <div className="rounded-lg border border-surface-border-subtle p-2">
              Paper accounts {plan.limits.paperTradingAccounts}
            </div>
          </div>
        </Card>
        <LicenseCard license={license} />
      </div>

      <Card padding="lg" className="mt-4">
        <h2 className="text-sm font-semibold text-text-primary">Feature access</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {plan.features.map((f) => (
            <span
              key={f}
              className="rounded-md bg-surface-raised px-2 py-0.5 text-[10px] text-text-secondary"
            >
              {f}
            </span>
          ))}
        </div>
        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-faint">
          Effective permissions
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {permissions.map((p) => (
            <PermissionBadge key={p} permission={p} />
          ))}
        </div>
      </Card>

      <div className="mt-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          Plans (entitlement only — no payment)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              current={p.id === subscription.planId}
              onSelect={() => changePlan(p.id as PlanId)}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-raised"
              onClick={() => startTrial("professional", d)}
            >
              Start {d}-day Professional trial
            </button>
          ))}
        </div>
      </div>
    </SettingsShell>
  );
}
