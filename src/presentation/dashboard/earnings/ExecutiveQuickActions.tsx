"use client";

import Link from "next/link";
import type { ExecutiveQuickAction } from "@/lib/dashboard/institutional-executive-presentation";

export function ExecutiveQuickActions({
  actions,
  previewOnly = false,
  upgradeRequired = false,
  onRefresh,
}: {
  actions: ExecutiveQuickAction[];
  previewOnly?: boolean;
  upgradeRequired?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <div data-testid="executive-earnings-quick-actions">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        Quick Actions
      </p>
      {upgradeRequired || previewOnly ? (
        <p
          className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-text-secondary"
          data-testid="executive-earnings-acl-preview"
        >
          Free users receive Preview only. Upgrade for full report export.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          if (action.id === "refresh" && onRefresh) {
            return (
              <button
                key={action.id}
                type="button"
                onClick={onRefresh}
                className="rounded-md border border-surface-border-subtle bg-surface-raised/50 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary transition hover:border-accent/30 hover:bg-accent/5 hover:text-accent"
                data-testid={`executive-earnings-action-${action.id}`}
              >
                {action.label}
              </button>
            );
          }
          return (
            <Link
              key={action.id}
              href={action.href}
              className={`rounded-md border border-surface-border-subtle bg-surface-raised/50 px-2.5 py-1.5 text-[11px] font-medium transition hover:border-accent/30 hover:bg-accent/5 hover:text-accent ${
                action.available
                  ? "text-text-secondary"
                  : "pointer-events-none opacity-50 text-text-faint"
              }`}
              data-testid={`executive-earnings-action-${action.id}`}
              title={action.reason}
            >
              {action.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
