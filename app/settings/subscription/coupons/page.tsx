"use client";

import { useState } from "react";
import { SettingsShell } from "@/components/saas";
import { CouponCard, SubscriptionSubNav } from "@/components/billing";
import { useCoupons } from "@/lib/billing";
import { useSubscription } from "@/lib/saas";

export default function CouponsPage() {
  const { coupons, validateCoupon } = useCoupons();
  const { subscription } = useSubscription();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<string | null>(null);

  return (
    <SettingsShell
      title="Coupons"
      description="Percentage, flat, trial extension, and referral discounts."
    >
      <SubscriptionSubNav />
      <form
        className="mb-4 flex flex-wrap items-end gap-2 text-xs"
        onSubmit={(e) => {
          e.preventDefault();
          const v = validateCoupon(code, subscription?.planId ?? "starter");
          setResult(
            v.ok
              ? `Valid — discount ${v.discount}`
              : v.error ?? "Invalid coupon"
          );
        }}
      >
        <label>
          Validate code
          <input
            className="mt-1 block w-48 rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label="Coupon code"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white"
        >
          Check
        </button>
        {result && <span className="text-text-secondary">{result}</span>}
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((c) => (
          <CouponCard key={c.id} coupon={c} />
        ))}
      </div>
    </SettingsShell>
  );
}
