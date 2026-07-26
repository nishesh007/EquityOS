"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileBarChart, History, Scale } from "lucide-react";

const SECTIONS = [
  {
    label: "Replay Center",
    href: "/backtesting",
    icon: History,
    exact: true,
  },
  {
    label: "Strategy Validation",
    href: "/backtesting/validation",
    icon: Scale,
    exact: false,
  },
  {
    label: "Reports",
    href: "/backtesting/reports",
    icon: FileBarChart,
    exact: false,
  },
] as const;

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Consistent internal navigation for Historical Backtesting (11B.5).
 */
export function BacktestingModuleNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Historical Backtesting sections"
      className="sticky top-0 z-20 -mx-1 overflow-x-auto rounded-xl border border-surface-border-subtle bg-surface-overlay/80 px-2 py-2 backdrop-blur-md contrast-more:border-2 contrast-more:border-text-primary"
      data-testid="backtesting-module-nav"
    >
      <ul className="flex min-w-max items-center gap-1">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = isActive(pathname, section.href, section.exact);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
