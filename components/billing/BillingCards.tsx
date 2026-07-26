"use client";

import { cn } from "@/lib/utils";
import type {
  CouponRecord,
  InvoiceRecord,
  PaymentMethodRecord,
  ReferralRecord,
  RevenueAnalytics,
  SubscriptionLifecycleEvent,
  TransactionRecord,
  UsageSnapshot,
} from "@/lib/billing/types";
import type { ReactNode } from "react";

export function BillingCard({
  title,
  subtitle,
  children,
  className,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4",
        className
      )}
      aria-label={title}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function InvoiceCard({
  invoice,
  onDownload,
  onEmail,
}: {
  invoice: InvoiceRecord;
  onDownload?: () => void;
  onEmail?: () => void;
}) {
  return (
    <article
      className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4"
      data-testid={`invoice-${invoice.invoiceNumber}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-mono text-sm text-text-primary">
            {invoice.invoiceNumber}
          </div>
          <div className="text-xs text-text-secondary">
            {invoice.customerName}
            {invoice.companyName ? ` · ${invoice.companyName}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-text-primary">
            {invoice.total.toFixed(2)} {invoice.currency}
          </div>
          <div className="text-[11px] text-text-faint">
            {new Date(invoice.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <div>
          <dt className="text-text-faint">GSTIN</dt>
          <dd>{invoice.gstin || "—"}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Discount</dt>
          <dd>{invoice.discount.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Tax</dt>
          <dd>
            CGST {invoice.tax.cgst} / SGST {invoice.tax.sgst} / IGST{" "}
            {invoice.tax.igst}
          </dd>
        </div>
        <div>
          <dt className="text-text-faint">Paid</dt>
          <dd>
            {invoice.paidAt
              ? new Date(invoice.paidAt).toLocaleDateString()
              : "Unpaid"}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex gap-2">
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Download
          </button>
        )}
        {onEmail && (
          <button
            type="button"
            onClick={onEmail}
            className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Email
          </button>
        )}
      </div>
    </article>
  );
}

export function PaymentMethodCard({
  method,
  onDefault,
  onRemove,
}: {
  method: PaymentMethodRecord;
  onDefault?: () => void;
  onRemove?: () => void;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border p-4",
        method.isDefault
          ? "border-accent bg-accent/10"
          : "border-surface-border-subtle bg-surface-overlay/40"
      )}
      data-testid={`pm-${method.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-text-primary">{method.label}</div>
          <div className="text-xs capitalize text-text-secondary">
            {method.kind.replace("_", " ")} · {method.gateway}
          </div>
          {method.last4 && (
            <div className="mt-1 font-mono text-xs text-text-faint">
              •••• {method.last4}
              {method.brand ? ` · ${method.brand}` : ""}
            </div>
          )}
          {method.upiVpa && (
            <div className="mt-1 font-mono text-xs text-text-faint">{method.upiVpa}</div>
          )}
        </div>
        {method.isDefault && (
          <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
            Default
          </span>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        {!method.isDefault && onDefault && (
          <button
            type="button"
            onClick={onDefault}
            className="rounded-lg border border-surface-border-subtle px-2.5 py-1 text-[11px] text-text-secondary hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Make default
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-danger/40 px-2.5 py-1 text-[11px] text-danger hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            Remove
          </button>
        )}
      </div>
    </article>
  );
}

export function CouponCard({ coupon }: { coupon: CouponRecord }) {
  return (
    <article className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-sm font-semibold text-accent">{coupon.code}</div>
        <span
          className={cn(
            "text-[10px] uppercase",
            coupon.active ? "text-success" : "text-text-faint"
          )}
        >
          {coupon.active ? "Active" : "Inactive"}
        </span>
      </div>
      <p className="mt-1 text-xs capitalize text-text-secondary">
        {coupon.type.replace("_", " ")}
        {coupon.type === "percentage"
          ? ` · ${coupon.value}%`
          : coupon.type === "flat"
            ? ` · ${coupon.value}`
            : coupon.type === "trial_extension"
              ? ` · +${coupon.trialExtensionDays}d`
              : ""}
      </p>
      <div className="mt-2 text-[11px] text-text-faint">
        Used {coupon.usedCount}/{coupon.maxUses}
        {coupon.expiresAt
          ? ` · expires ${new Date(coupon.expiresAt).toLocaleDateString()}`
          : ""}
      </div>
    </article>
  );
}

export function ReferralCard({
  referral,
  onInvite,
}: {
  referral: ReferralRecord;
  onInvite?: () => void;
}) {
  return (
    <article className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4">
      <div className="text-xs text-text-faint">Referral code</div>
      <div className="font-mono text-lg text-accent">{referral.code}</div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-text-faint">Invites</dt>
          <dd>{referral.invitesSent}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Conversions</dt>
          <dd>{referral.conversions}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Pending</dt>
          <dd>{referral.pendingCredits}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Wallet</dt>
          <dd>{referral.walletBalance}</dd>
        </div>
      </dl>
      {onInvite && (
        <button
          type="button"
          onClick={onInvite}
          className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Copy invite link
        </button>
      )}
    </article>
  );
}

export function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit <= 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="space-y-1" aria-label={`${label}: ${used} of ${limit}`}>
      <div className="flex justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-faint">
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct > 90 ? "bg-danger" : pct > 70 ? "bg-warning" : "bg-accent"
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
        />
      </div>
    </div>
  );
}

export function UsageMeters({
  usage,
  remaining,
}: {
  usage: UsageSnapshot;
  remaining: Record<string, { used: number; limit: number; remaining: number }>;
}) {
  void usage;
  const keys = Object.keys(remaining);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {keys.map((k) => (
        <UsageMeter
          key={k}
          label={k}
          used={remaining[k]!.used}
          limit={remaining[k]!.limit}
        />
      ))}
    </div>
  );
}

export function TransactionTable({
  rows,
  onRefund,
}: {
  rows: TransactionRecord[];
  onRefund?: (txn: TransactionRecord) => void;
}) {
  const visible = rows.slice(0, 200);
  return (
    <div className="overflow-x-auto" role="region" aria-label="Transactions">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="border-b border-surface-border-subtle text-text-faint">
          <tr>
            <th className="py-2 pr-3 font-medium">ID</th>
            <th className="py-2 pr-3 font-medium">Gateway</th>
            <th className="py-2 pr-3 font-medium">Amount</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Invoice</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((t) => (
            <tr
              key={t.id}
              className="border-b border-surface-border-subtle/60 text-text-secondary"
            >
              <td className="py-2 pr-3 font-mono text-[11px]">{t.id.slice(0, 14)}</td>
              <td className="py-2 pr-3 capitalize">{t.gateway}</td>
              <td className="py-2 pr-3">
                {t.amount.toFixed(2)} {t.currency}
              </td>
              <td className="py-2 pr-3 capitalize">{t.status.replace("_", " ")}</td>
              <td className="py-2 pr-3">
                {new Date(t.createdAt).toLocaleString()}
              </td>
              <td className="py-2 pr-3 font-mono text-[11px]">
                {t.invoiceId?.slice(0, 12) ?? "—"}
              </td>
              <td className="py-2">
                {onRefund && t.status === "succeeded" && (
                  <button
                    type="button"
                    onClick={() => onRefund(t)}
                    className="text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Refund
                  </button>
                )}
              </td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-text-faint">
                No transactions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SubscriptionTimeline({
  events,
}: {
  events: SubscriptionLifecycleEvent[];
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-text-secondary">No upgrade history yet.</p>
    );
  }
  return (
    <ol className="space-y-3 border-l border-surface-border-subtle pl-4">
      {events.map((e) => (
        <li key={e.id} className="relative text-xs">
          <span className="absolute -left-[1.15rem] top-1 h-2 w-2 rounded-full bg-accent" />
          <div className="font-medium text-text-primary">
            {e.fromStatus} → {e.toStatus} · {e.planId}
          </div>
          <div className="text-text-secondary">{e.note}</div>
          <div className="text-text-faint">
            {new Date(e.createdAt).toLocaleString()}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function RevenueCard({ analytics }: { analytics: RevenueAnalytics }) {
  const items: Array<[string, string]> = [
    ["MRR", `₹${analytics.mrr.toLocaleString()}`],
    ["ARR", `₹${analytics.arr.toLocaleString()}`],
    ["Active subs", String(analytics.activeSubscribers)],
    ["Churn", `${analytics.churnRatePct}%`],
    ["Renewal", `${analytics.renewalRatePct}%`],
    ["ARPU", `₹${analytics.arpu}`],
    ["LTV", `₹${analytics.ltv}`],
    ["Pay success", `${analytics.paymentSuccessRatePct}%`],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-3"
        >
          <div className="text-[11px] text-text-faint">{label}</div>
          <div className="mt-1 text-lg font-semibold text-text-primary">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function GatewayStatusCard({
  gateways,
}: {
  gateways: Array<{
    id: string;
    name: string;
    configured: boolean;
    mode: string;
    available: boolean;
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {gateways.map((g) => (
        <div
          key={g.id}
          className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-3"
        >
          <div className="text-sm font-medium text-text-primary">{g.name}</div>
          <div className="mt-1 text-xs text-text-secondary">
            {g.available ? "Integrated" : "Planned"} · {g.mode}
          </div>
          <div
            className={cn(
              "mt-2 text-[11px] font-medium",
              g.configured ? "text-success" : "text-warning"
            )}
          >
            {g.configured ? "Keys configured" : "Sandbox mode"}
          </div>
        </div>
      ))}
    </div>
  );
}
