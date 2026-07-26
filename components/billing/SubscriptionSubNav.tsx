"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SUB_NAV = [
  { href: "/settings/subscription", label: "Overview", exact: true },
  { href: "/settings/subscription/billing", label: "Billing" },
  { href: "/settings/subscription/payment-methods", label: "Payment Methods" },
  { href: "/settings/subscription/invoices", label: "Invoices" },
  { href: "/settings/subscription/usage", label: "Usage" },
  { href: "/settings/subscription/coupons", label: "Coupons" },
  { href: "/settings/subscription/referral", label: "Referral" },
  { href: "/settings/subscription/upgrade-history", label: "Upgrade History" },
] as const;

export function SubscriptionSubNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Subscription billing"
      className="mb-4 flex flex-wrap gap-1 rounded-xl border border-surface-border-subtle bg-surface-raised/40 p-1"
    >
      {SUB_NAV.map((s) => {
        const active = "exact" in s && s.exact
          ? pathname === s.href
          : pathname === s.href || pathname.startsWith(`${s.href}/`);
        return (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:bg-surface-overlay"
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
