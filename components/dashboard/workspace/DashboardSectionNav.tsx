"use client";

import type { DashboardSectionId } from "./dashboardPreferences";
import { cn } from "@/lib/utils";

const LABELS: Record<DashboardSectionId, string> = {
  "market-pulse": "Pulse",
  opportunities: "Opportunities",
  portfolio: "Portfolio",
  intelligence: "Intelligence",
  earnings: "Earnings",
  news: "News",
};

interface DashboardSectionNavProps {
  order: DashboardSectionId[];
  activeId?: DashboardSectionId | null;
}

/** Sticky section anchor strip for in-page navigation. */
export function DashboardSectionNav({
  order,
  activeId,
}: DashboardSectionNavProps) {
  return (
    <nav
      aria-label="Dashboard sections"
      className="sticky top-0 z-30 -mx-1 mb-6 overflow-x-auto rounded-xl border border-surface-border-subtle/80 bg-surface/90 px-2 py-2 shadow-card backdrop-blur-md"
    >
      <ul className="flex min-w-max items-center gap-1">
        {order.map((id) => (
          <li key={id}>
            <a
              href={`#section-${id}`}
              className={cn(
                "inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-200",
                activeId === id
                  ? "bg-accent/15 text-accent"
                  : "text-text-muted hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              {LABELS[id]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
