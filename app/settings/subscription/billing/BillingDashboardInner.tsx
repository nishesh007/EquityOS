"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SettingsShell } from "@/components/saas";
import {
  BillingCard,
  GatewayStatusCard,
  SubscriptionSubNav,
  TransactionTable,
} from "@/components/billing";
import { Card } from "@/components/ui/Card";
import {
  useBilling,
  usePayments,
  listProviders,
  priceFor,
} from "@/lib/billing";
import { useSubscription, PLAN_DEFINITIONS } from "@/lib/saas";
import type { BillingCycle, PaymentGatewayId } from "@/lib/billing/types";
import type { PlanId } from "@/lib/saas/types";

export default function BillingDashboardInner() {
  const search = useSearchParams();
  const {
    dashboard,
    profile,
    setAutoRenew,
    startCheckout,
    completeSandboxCheckout,
    loading,
    error,
    clearError,
    updateProfile,
  } = useBilling();
  const { changePlan, subscription } = useSubscription();
  const { transactions, requestRefund } = usePayments();
  const [planId, setPlanId] = useState<PlanId>("professional");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [gateway, setGateway] = useState<PaymentGatewayId>("razorpay");
  const [coupon, setCoupon] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkoutId = search.get("checkout");
    const sandbox = search.get("sandbox");
    if (checkoutId && sandbox === "1") {
      void (async () => {
        const ok = await completeSandboxCheckout(checkoutId);
        if (ok) {
          const plan = search.get("plan") as PlanId | null;
          if (plan) await changePlan(plan);
          setMsg("Payment completed (sandbox). Plan activated.");
        }
      })();
    }
    if (search.get("paid") === "1" || search.get("activated") === "1") {
      setMsg("Billing update received.");
    }
  }, [search, completeSandboxCheckout, changePlan]);

  useEffect(() => {
    if (subscription) setPlanId(subscription.planId);
    if (profile) {
      setCycle(profile.billingCycle);
      setGateway(profile.preferredGateway);
    }
  }, [subscription, profile]);

  const pay = async () => {
    clearError();
    const url = await startCheckout({
      planId,
      cycle,
      gateway,
      couponCode: coupon || null,
    });
    if (!url) return;
    if (url.includes("activated=1")) {
      await changePlan(planId);
      setMsg("Plan activated.");
      return;
    }
    if (url.includes("sandbox=1")) {
      const id = new URL(url, "http://local").searchParams.get("checkout");
      if (id) {
        const ok = await completeSandboxCheckout(id);
        if (ok) {
          await changePlan(planId);
          setMsg("Sandbox payment succeeded.");
        }
      }
      return;
    }
    window.location.href = url;
  };

  return (
    <SettingsShell
      title="Billing"
      description="Plan cost, renewals, payment status, and commercial controls."
    >
      <SubscriptionSubNav />
      {(error || msg) && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-xs"
        >
          {error ?? msg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <BillingCard
          title="Current plan"
          subtitle="Commercial snapshot"
          className="lg:col-span-2"
        >
          {dashboard ? (
            <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-text-faint">Plan</dt>
                <dd className="capitalize text-text-primary">{dashboard.planId}</dd>
              </div>
              <div>
                <dt className="text-text-faint">Current cost</dt>
                <dd>
                  {dashboard.currentCost} {dashboard.currency} / {dashboard.cycle}
                </dd>
              </div>
              <div>
                <dt className="text-text-faint">Payment status</dt>
                <dd className="capitalize">{dashboard.paymentStatus}</dd>
              </div>
              <div>
                <dt className="text-text-faint">Renewal</dt>
                <dd>{new Date(dashboard.renewalDate).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-text-faint">Outstanding</dt>
                <dd>
                  {dashboard.outstandingBalance.toFixed(2)} {dashboard.currency}
                </dd>
              </div>
              <div>
                <dt className="text-text-faint">Lifetime spend</dt>
                <dd>
                  {dashboard.lifetimeSpend.toFixed(2)} {dashboard.currency}
                </dd>
              </div>
              <div>
                <dt className="text-text-faint">Total savings</dt>
                <dd>{dashboard.totalSavings.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-text-faint">Referral credits</dt>
                <dd>{dashboard.referralCredits.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-text-faint">Payment method</dt>
                <dd>{dashboard.paymentMethod?.label ?? "None saved"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-text-secondary">Sign in to view billing.</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={dashboard?.autoRenew ?? true}
                onChange={(e) => void setAutoRenew(e.target.checked)}
                className="rounded border-surface-border-subtle"
              />
              Auto renewal
            </label>
          </div>
        </BillingCard>

        <BillingCard title="Billing profile">
          <div className="space-y-2 text-xs">
            <label className="block">
              <span className="text-text-faint">GSTIN</span>
              <input
                className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
                defaultValue={profile?.gstin ?? ""}
                onBlur={(e) =>
                  void updateProfile({
                    gstin: e.target.value.trim() || null,
                    invoiceKind: e.target.value.trim() ? "business" : "consumer",
                  })
                }
                aria-label="GSTIN"
              />
            </label>
            <label className="block">
              <span className="text-text-faint">State (for CGST/SGST/IGST)</span>
              <input
                className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
                defaultValue={profile?.state ?? "KA"}
                onBlur={(e) => void updateProfile({ state: e.target.value })}
                aria-label="Billing state"
              />
            </label>
            <label className="block">
              <span className="text-text-faint">Billing address</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
                rows={2}
                defaultValue={profile?.billingAddress ?? ""}
                onBlur={(e) =>
                  void updateProfile({ billingAddress: e.target.value })
                }
                aria-label="Billing address"
              />
            </label>
          </div>
        </BillingCard>
      </div>

      <BillingCard
        title="Upgrade / renew"
        subtitle="Razorpay & Stripe (sandbox when keys unset)"
        className="mt-4"
      >
        <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className="text-text-faint">Plan</span>
            <select
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
              value={planId}
              onChange={(e) => setPlanId(e.target.value as PlanId)}
            >
              {PLAN_DEFINITIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {priceFor(p.id, cycle)} INR
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-text-faint">Cycle</span>
            <select
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
              value={cycle}
              onChange={(e) => {
                const c = e.target.value as BillingCycle;
                setCycle(c);
                void updateProfile({ billingCycle: c });
              }}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          <label>
            <span className="text-text-faint">Gateway</span>
            <select
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
              value={gateway}
              onChange={(e) => {
                const g = e.target.value as PaymentGatewayId;
                setGateway(g);
                void updateProfile({ preferredGateway: g });
              }}
            >
              <option value="razorpay">Razorpay</option>
              <option value="stripe">Stripe</option>
            </select>
          </label>
          <label>
            <span className="text-text-faint">Coupon</span>
            <input
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="WELCOME20"
              aria-label="Coupon code"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void pay()}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {loading ? "Processing…" : "Pay & activate"}
        </button>
      </BillingCard>

      <BillingCard title="Gateways" className="mt-4">
        <GatewayStatusCard gateways={listProviders()} />
      </BillingCard>

      <Card padding="lg" className="mt-4">
        <h2 className="mb-3 text-sm font-semibold">Recent transactions</h2>
        <TransactionTable
          rows={transactions}
          onRefund={(t) => {
            void requestRefund(t.id, t.amount, "Customer requested refund");
          }}
        />
      </Card>
    </SettingsShell>
  );
}
