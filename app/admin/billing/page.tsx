"use client";

import { useMemo, useState } from "react";
import { PageContainer } from "@/src/design";
import {
  BillingCard,
  CouponCard,
  GatewayStatusCard,
  RevenueCard,
  TransactionTable,
} from "@/components/billing";
import {
  analyticsService,
  couponService,
  listProviders,
  paymentService,
  refundService,
  referralService,
  transactionService,
  webhookService,
} from "@/lib/billing";
import { loadState as loadSaas } from "@/lib/saas/persistence";
import { createId, nowIso } from "@/lib/saas/utils";
import type { CouponRecord, CouponType } from "@/lib/billing/types";
import type { PlanId as SaasPlanId } from "@/lib/saas/types";

export default function AdminBillingPage() {
  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const data = useMemo(() => {
    void tick;
    const saas = loadSaas();
    const txns = transactionService.list();
    const refunds = refundService.list();
    const webhooks = webhookService.list();
    const coupons = couponService.list();
    const analytics = analyticsService.compute(
      saas.subscriptions.map((s) => s.planId)
    );
    const failed = txns.filter((t) => t.status === "failed");
    return {
      saas,
      txns,
      refunds,
      webhooks,
      coupons,
      analytics,
      failed,
      referrals: referralService.leaderboardPlaceholder(),
    };
  }, [tick]);

  const filteredUsers = data.saas.users.filter(
    (u) =>
      !q ||
      u.profile.email.includes(q.toLowerCase()) ||
      u.profile.displayName.toLowerCase().includes(q.toLowerCase())
  );
  const filteredLicenses = data.saas.licenses.filter(
    (l) => !q || l.id.includes(q) || l.licenseKey.includes(q.toUpperCase())
  );
  const filteredTxns = data.txns.filter(
    (t) => !q || t.id.includes(q) || t.externalId.includes(q)
  );
  const filteredInvoices = data.txns
    .map((t) => t.invoiceId)
    .filter(Boolean) as string[];

  return (
    <PageContainer>
      <div className="space-y-5" data-testid="admin-billing">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Admin Billing
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Subscriptions, payments, invoices, refunds, coupons, and revenue.
          </p>
        </div>

        <label className="block max-w-md text-xs">
          Search customers / licenses / payments
          <input
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Admin search"
          />
        </label>

        <BillingCard title="Revenue summary">
          <RevenueCard analytics={data.analytics} />
          <button
            type="button"
            className="mt-3 text-xs text-accent hover:underline"
            onClick={refresh}
          >
            Refresh analytics
          </button>
        </BillingCard>

        <BillingCard title="Gateway status">
          <GatewayStatusCard gateways={listProviders()} />
        </BillingCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <BillingCard title="Customer search">
            <ul className="max-h-48 space-y-1 overflow-auto text-xs">
              {filteredUsers.slice(0, 20).map((u) => (
                <li key={u.profile.id}>
                  {u.profile.displayName} · {u.profile.email} · {u.profile.role}
                </li>
              ))}
            </ul>
          </BillingCard>
          <BillingCard title="License search">
            <ul className="max-h-48 space-y-1 overflow-auto text-xs font-mono">
              {filteredLicenses.slice(0, 20).map((l) => (
                <li key={l.id}>
                  {l.licenseKey} · {l.planId} · {l.status}
                </li>
              ))}
            </ul>
          </BillingCard>
        </div>

        <BillingCard title="Payment / invoice lookup">
          <TransactionTable rows={filteredTxns.slice(0, 50)} />
          <p className="mt-2 text-[11px] text-text-faint">
            Invoice IDs linked: {filteredInvoices.slice(0, 8).join(", ") || "—"}
          </p>
        </BillingCard>

        <BillingCard title="Failed payments">
          <TransactionTable
            rows={data.failed}
            onRefund={undefined}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {data.failed.slice(0, 5).map((t) => (
              <button
                key={t.id}
                type="button"
                className="rounded border border-surface-border-subtle px-2 py-1 text-[11px]"
                onClick={() => {
                  transactionService.retryFailed(t.id);
                  refresh();
                }}
              >
                Retry {t.id.slice(0, 10)}
              </button>
            ))}
          </div>
        </BillingCard>

        <BillingCard title="Refund console">
          <ul className="space-y-1 text-xs">
            {data.refunds.slice(0, 20).map((r) => (
              <li key={r.id}>
                {r.id} · {r.amount} {r.currency} · {r.status} · {r.reason}
              </li>
            ))}
            {data.refunds.length === 0 && <li>No refunds.</li>}
          </ul>
          {data.txns
            .filter((t) => t.status === "succeeded")
            .slice(0, 3)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                className="mr-2 mt-2 rounded bg-accent px-2 py-1 text-[11px] text-white"
                onClick={() => {
                  void refundService
                    .create({
                      transactionId: t.id,
                      amount: t.amount,
                      reason: "Admin manual refund",
                    })
                    .then(refresh);
                }}
              >
                Refund {t.id.slice(0, 10)}
              </button>
            ))}
        </BillingCard>

        <BillingCard title="Coupon management">
          <div className="mb-3 grid gap-3 sm:grid-cols-3">
            {data.coupons.map((c) => (
              <CouponCard key={c.id} coupon={c} />
            ))}
          </div>
          <button
            type="button"
            className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs"
            onClick={() => {
              const coupon: CouponRecord = {
                id: createId("cpn"),
                code: `ADMIN${Math.floor(Math.random() * 90 + 10)}`,
                type: "percentage" as CouponType,
                value: 15,
                trialExtensionDays: 0,
                maxUses: 50,
                usedCount: 0,
                expiresAt: null,
                minPlanId: "starter" as SaasPlanId,
                maxDiscount: 1500,
                active: true,
                createdAt: nowIso(),
              };
              couponService.upsert(coupon);
              refresh();
            }}
          >
            Create 15% admin coupon
          </button>
        </BillingCard>

        <BillingCard title="Referral management">
          <ul className="text-xs text-text-secondary">
            {data.referrals.map((r) => (
              <li key={r.code}>
                {r.code} · conversions {r.conversions} · credits {r.credits}
              </li>
            ))}
          </ul>
        </BillingCard>

        <BillingCard title="Webhook audit trail">
          <ul className="max-h-40 space-y-1 overflow-auto text-[11px] font-mono">
            {data.webhooks
              .slice()
              .reverse()
              .slice(0, 30)
              .map((w) => (
                <li key={w.id}>
                  {w.createdAt} {w.gateway} {w.eventType} valid=
                  {String(w.signatureValid)} dup={String(w.duplicate)}
                </li>
              ))}
            {data.webhooks.length === 0 && <li>No webhook events logged.</li>}
          </ul>
        </BillingCard>

        <BillingCard title="Manual license override">
          <p className="text-xs text-text-secondary">
            Use Settings → Subscription plan cards or SaaS{" "}
            <code className="text-accent">subscriptionService.changePlan</code>{" "}
            for entitlement overrides. Payment gateways:{" "}
            {paymentService.listGateways()
              .filter((g) => g.available)
              .map((g) => g.name)
              .join(", ")}
            .
          </p>
        </BillingCard>
      </div>
    </PageContainer>
  );
}
