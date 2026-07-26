"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { UpgradeBanner } from "./UpgradeBanner";

const SECTIONS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/subscription", label: "Subscription" },
  { href: "/settings/devices", label: "Devices" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/appearance", label: "Appearance" },
  { href: "/settings/research", label: "Research" },
  { href: "/settings/api-keys", label: "API Keys" },
] as const;

export function SettingsShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-5" data-testid="settings-shell">
      <UpgradeBanner />
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>

      <nav
        aria-label="Settings sections"
        className="flex flex-wrap gap-1 rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-1"
      >
        {SECTIONS.map((s) => {
          const active = pathname === s.href || pathname.startsWith(`${s.href}/`);
          return (
            <Link
              key={s.href}
              href={s.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
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
