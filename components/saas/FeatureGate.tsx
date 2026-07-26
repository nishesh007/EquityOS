"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePermissions, type FeatureId, type PermissionId } from "@/lib/saas";
import { cn } from "@/lib/utils";

export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionId;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = usePermissions();
  if (!can(permission)) return <>{fallback}</>;
  return <>{children}</>;
}

export function FeatureGate({
  feature,
  children,
  mode = "disable",
}: {
  feature: FeatureId;
  children: ReactNode;
  mode?: "hide" | "disable" | "overlay";
}) {
  const { gate } = usePermissions();
  const decision = gate(feature);

  if (!decision.allowed && mode === "hide") return null;
  if (decision.visibility === "hidden") return null;

  if (decision.allowed && (decision.visibility === "visible" || decision.visibility === "trial" || decision.visibility === "grace_period")) {
    return <>{children}</>;
  }

  if (mode === "overlay" || decision.visibility === "upgrade_required" || decision.visibility === "expired") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-surface-border-subtle">
        <div className="pointer-events-none select-none opacity-40 blur-[1px]" aria-hidden>
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80 p-6 backdrop-blur-sm">
          <div className="max-w-sm rounded-xl border border-surface-border-subtle bg-surface-raised p-4 text-center shadow-lg">
            <p className="text-sm font-semibold text-text-primary">
              {decision.visibility === "expired" ? "Subscription expired" : "Upgrade required"}
            </p>
            <p className="mt-1 text-xs text-text-secondary">{decision.reason}</p>
            <Link
              href="/settings/subscription"
              className="mt-3 inline-flex rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
            >
              View plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("opacity-50")} aria-disabled="true" title={decision.reason}>
      {children}
    </div>
  );
}
