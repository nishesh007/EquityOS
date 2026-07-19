"use client";

import {
  Activity,
  Briefcase,
  Crosshair,
  LayoutGrid,
  RefreshCw,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ACTIONS = [
  {
    id: "refresh",
    label: "Refresh",
    icon: RefreshCw,
    href: null as string | null,
  },
  { id: "screener", label: "Screener", icon: Search, href: "/screener" },
  { id: "research", label: "Research", icon: LayoutGrid, href: "/research" },
  { id: "watchlist", label: "Watchlist", icon: Star, href: "/watchlist" },
  { id: "portfolio", label: "Portfolio", icon: Briefcase, href: "/portfolio" },
  {
    id: "pulse",
    label: "Market Pulse",
    icon: Activity,
    href: "#section-market-pulse",
  },
  {
    id: "opportunities",
    label: "AI Opportunities",
    icon: Sparkles,
    href: "#section-opportunities",
  },
  {
    id: "scan",
    label: "Opportunities",
    icon: Crosshair,
    href: "/opportunities",
  },
] as const;

/**
 * Persistent quick-action strip — presentation navigation only.
 */
export function QuickActionBar() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <nav
      aria-label="Quick actions"
      className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-surface-border-subtle bg-surface-raised/80 p-2 shadow-card backdrop-blur-sm"
    >
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        const className =
          "inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-all duration-200 hover:border-surface-border hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

        if (action.id === "refresh") {
          return (
            <button
              key={action.id}
              type="button"
              onClick={handleRefresh}
              className={className}
              aria-label="Refresh dashboard data"
            >
              <Icon
                className={`h-3.5 w-3.5 text-sky-400 ${refreshing ? "animate-spin" : ""}`}
              />
              {action.label}
            </button>
          );
        }

        if (action.href?.startsWith("#")) {
          return (
            <a key={action.id} href={action.href} className={className}>
              <Icon className="h-3.5 w-3.5 text-emerald-400" />
              {action.label}
            </a>
          );
        }

        return (
          <Link key={action.id} href={action.href!} className={className}>
            <Icon className="h-3.5 w-3.5 text-indigo-400" />
            {action.label}
          </Link>
        );
      })}
    </nav>
  );
}
