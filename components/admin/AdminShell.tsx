"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useCurrentUser, usePermissions } from "@/lib/saas";
import { roleHasPermission } from "@/lib/saas/roles";
import { MaintenanceBanner } from "./AdminCards";

const SECTIONS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/licenses", label: "Licenses" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/feature-flags", label: "Feature Flags" },
  { href: "/admin/health", label: "System Health" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/monitoring", label: "Monitoring" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/maintenance", label: "Maintenance" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/backups", label: "Backups" },
] as const;

export function AdminShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { can } = usePermissions();
  const { profile } = useCurrentUser();
  const allowed =
    can("canAccessAdmin") ||
    (profile != null && roleHasPermission(profile.role, "canAccessAdmin"));

  if (!allowed) {
    return (
      <div className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-8 text-center">
        <h1 className="text-lg font-semibold text-text-primary">
          Admin access required
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Owner or Admin role is required for the operations console.
        </p>
        <Link
          href="/settings/subscription"
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          View subscription
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="admin-shell">
      <MaintenanceBanner />
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      <nav
        aria-label="Administration"
        className="flex flex-wrap gap-1 rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-1"
      >
        {SECTIONS.map((s) => {
          const active =
            "exact" in s && s.exact
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
                  : "text-text-secondary hover:bg-surface-raised"
              )}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
