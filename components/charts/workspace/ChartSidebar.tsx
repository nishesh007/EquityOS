"use client";

import { cn } from "@/lib/utils";
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutList,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface ChartSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  symbol: string;
  overview?: ReactNode;
  aiSummary?: ReactNode;
  keyMetrics?: ReactNode;
}

const LINKS = [
  { id: "overview", label: "Company Overview", icon: LayoutList, hash: "#overview" },
  { id: "ai", label: "AI Summary", icon: Sparkles, hash: "#ai-analysis" },
  { id: "metrics", label: "Key Metrics", icon: BookOpen, hash: "#key-stats" },
  { id: "notes", label: "Research Notes", icon: FileText, href: "/research" },
  { id: "watchlist", label: "Watchlist", icon: Star, href: "/watchlist" },
  { id: "alerts", label: "Alerts", icon: Bell, href: "/ai" },
] as const;

export function ChartSidebar({
  collapsed,
  onCollapsedChange,
  symbol,
  overview,
  aiSummary,
  keyMetrics,
}: ChartSidebarProps) {
  return (
    <aside
      className={cn(
        "relative shrink-0 border-l border-surface-border-subtle transition-[width] duration-300",
        collapsed ? "w-10" : "w-full max-w-xs lg:w-72"
      )}
    >
      <button
        type="button"
        aria-label={collapsed ? "Expand chart sidebar" : "Collapse chart sidebar"}
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute -left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-surface-border bg-card text-text-muted shadow-sm hover:text-text-primary"
      >
        {collapsed ? (
          <ChevronLeft className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>

      {collapsed ? (
        <div className="flex flex-col items-center gap-3 py-10 text-text-faint">
          <LayoutList className="h-4 w-4" />
          <Sparkles className="h-4 w-4" />
          <Star className="h-4 w-4" />
        </div>
      ) : (
        <div className="space-y-4 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            Quick access · {symbol}
          </p>
          <nav className="space-y-1">
            {LINKS.map((item) => {
              const Icon = item.icon;
              const href =
                "href" in item && item.href
                  ? item.href
                  : `/company/${encodeURIComponent(symbol)}${"hash" in item ? item.hash : ""}`;
              return (
                <Link
                  key={item.id}
                  href={href}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                >
                  <Icon className="h-3.5 w-3.5 text-accent" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {overview ? (
            <div className="rounded-lg border border-surface-border-subtle p-2 text-[11px] text-text-muted">
              {overview}
            </div>
          ) : null}
          {aiSummary ? (
            <div className="rounded-lg border border-surface-border-subtle p-2 text-[11px] text-text-muted">
              {aiSummary}
            </div>
          ) : null}
          {keyMetrics ? (
            <div className="rounded-lg border border-surface-border-subtle p-2 text-[11px] text-text-muted">
              {keyMetrics}
            </div>
          ) : null}
        </div>
      )}
    </aside>
  );
}
