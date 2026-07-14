"use client";

import Link from "next/link";
import type { ExecutiveQuickAction } from "@/lib/dashboard/institutional-executive-presentation";

export function ExecutiveQuickActions({
  actions,
  previewOnly = false,
  upgradeRequired = false,
}: {
  actions: ExecutiveQuickAction[];
  previewOnly?: boolean;
  upgradeRequired?: boolean;
}) {
  return (
    <div data-testid="executive-quick-actions">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        Quick Actions
      </p>
      {upgradeRequired || previewOnly ? (
        <p
          className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-text-secondary"
          data-testid="executive-export-upgrade-cta"
        >
          Free users receive Preview only. Upgrade for full report export.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="rounded-md border border-surface-border-subtle bg-surface-raised/50 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary transition hover:border-accent/30 hover:bg-accent/5 hover:text-accent"
            data-testid={`executive-action-${action.id}`}
            title={action.reason}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
