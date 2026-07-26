"use client";

import { useState } from "react";
import { SettingsShell } from "@/components/saas";
import {
  PaymentMethodCard,
  SubscriptionSubNav,
} from "@/components/billing";
import { usePayments, useBilling } from "@/lib/billing";
import type { PaymentGatewayId, PaymentMethodKind } from "@/lib/billing/types";

export default function PaymentMethodsPage() {
  const { methods, addPaymentMethod, removePaymentMethod, setDefaultPaymentMethod } =
    usePayments();
  const { profile } = useBilling();
  const [kind, setKind] = useState<PaymentMethodKind>("card");
  const [label, setLabel] = useState("Primary card");
  const [last4, setLast4] = useState("4242");
  const [upi, setUpi] = useState("");

  return (
    <SettingsShell
      title="Payment Methods"
      description="Cards, UPI, net banking, wallets, and international cards."
    >
      <SubscriptionSubNav />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {methods.map((m) => (
          <PaymentMethodCard
            key={m.id}
            method={m}
            onDefault={() => void setDefaultPaymentMethod(m.id)}
            onRemove={() => void removePaymentMethod(m.id)}
          />
        ))}
        {methods.length === 0 && (
          <p className="text-sm text-text-secondary sm:col-span-2">
            No saved payment methods.
          </p>
        )}
      </div>

      <form
        className="mt-6 grid max-w-xl gap-3 rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4 text-xs"
        onSubmit={(e) => {
          e.preventDefault();
          void addPaymentMethod({
            gateway: (profile?.preferredGateway ?? "razorpay") as PaymentGatewayId,
            kind,
            label,
            last4: kind.includes("card") ? last4 : null,
            brand: kind.includes("card") ? "Visa" : null,
            upiVpa: kind === "upi" ? upi : null,
          });
        }}
      >
        <h2 className="text-sm font-semibold text-text-primary">Add method</h2>
        <label>
          Type
          <select
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
            value={kind}
            onChange={(e) => setKind(e.target.value as PaymentMethodKind)}
          >
            <option value="card">Credit / Debit card</option>
            <option value="international_card">International card</option>
            <option value="upi">UPI</option>
            <option value="netbanking">Net banking</option>
            <option value="wallet">Wallet</option>
          </select>
        </label>
        <label>
          Label
          <input
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        {kind.includes("card") && (
          <label>
            Last 4
            <input
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
              value={last4}
              onChange={(e) => setLast4(e.target.value.slice(0, 4))}
              maxLength={4}
            />
          </label>
        )}
        {kind === "upi" && (
          <label>
            UPI VPA
            <input
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              placeholder="name@upi"
            />
          </label>
        )}
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-2 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Save method
        </button>
      </form>
    </SettingsShell>
  );
}
