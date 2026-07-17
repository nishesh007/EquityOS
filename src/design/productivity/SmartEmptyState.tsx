"use client";

/**
 * Sprint 10C.R7 — smart empty state.
 *
 * Helpful explanation + suggested actions + quick links, consistent
 * across pages and panels.
 */

import Link from "next/link";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface SmartEmptyStateProps {
  title: string;
  description: string;
  actions?: readonly EmptyStateAction[];
  quickLinks?: readonly { label: string; href: string }[];
  icon?: React.ReactNode;
  className?: string;
}

export function SmartEmptyState({
  title,
  description,
  actions = [],
  quickLinks = [],
  icon,
  className,
}: SmartEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-border px-6 py-10 text-center",
        className
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
        {icon ?? <Compass className="h-5 w-5" />}
      </div>
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
        {description}
      </p>
      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                {action.label}
              </button>
            )
          )}
        </div>
      )}
      {quickLinks.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11px] font-medium text-accent hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
