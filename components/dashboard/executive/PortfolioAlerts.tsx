"use client";

/**
 * Compact portfolio alerts — meaningful, priority-sorted, max 5.
 */

import type { PortfolioAlertItem } from "@/lib/dashboard/executive-intelligence";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface PortfolioAlertsProps {
  alerts: PortfolioAlertItem[];
  /** Compact strip (executive layer) vs card widget chrome. */
  variant?: "strip" | "card";
}

export function PortfolioAlerts({
  alerts,
  variant = "strip",
}: PortfolioAlertsProps) {
  if (alerts.length === 0) {
    if (variant === "card") {
      return (
        <div className="rounded-lg border border-surface-border-subtle bg-card/40 px-3 py-2.5">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
            Portfolio Alerts
          </h3>
          <p className="text-xs text-text-muted">No actionable portfolio alerts.</p>
        </div>
      );
    }
    return null;
  }

  const list = (
    <ul className="space-y-1">
      {alerts.map((alert) => {
        const Icon =
          alert.icon === "warning"
            ? AlertTriangle
            : alert.icon === "up"
              ? ArrowUpRight
              : ArrowDownRight;
        const tone =
          alert.icon === "warning"
            ? "text-warning"
            : alert.icon === "up"
              ? "text-gain"
              : "text-loss";
        return (
          <li key={alert.id}>
            <Link
              href={alert.href}
              className="flex items-start gap-2 rounded px-1 py-0.5 text-[12px] text-text-primary transition-colors hover:bg-surface-hover"
            >
              <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", tone)} />
              <span className="leading-snug">{alert.text}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  if (variant === "card") {
    return (
      <div className="h-full rounded-lg border border-surface-border-subtle bg-card/40 px-3 py-2.5">
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
          Portfolio Alerts
        </h3>
        {list}
      </div>
    );
  }

  return (
    <section
      aria-label="Portfolio alerts"
      className="rounded-lg border border-surface-border-subtle bg-card/30 px-3 py-2"
    >
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
        Portfolio Alerts
      </h3>
      {list}
    </section>
  );
}
