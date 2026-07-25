"use client";

import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import { getCompanyRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import {
  Briefcase,
  Building2,
  CalendarClock,
  ExternalLink,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import type { RecommendationDetailContext } from "./types";

function formatPrice(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2">
      <dt className="text-[10px] text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-xs font-medium tabular-nums text-text-primary">
        {value}
      </dd>
    </div>
  );
}

function SidebarAction({
  href,
  onClick,
  icon: Icon,
  label,
  active,
}: {
  href?: string;
  onClick?: () => void;
  icon: typeof Star;
  label: string;
  active?: boolean;
}) {
  const className = cn(
    "inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-medium transition-colors",
    FOCUS_RING_CLASS,
    active
      ? "border-accent/40 bg-accent/15 text-accent"
      : "border-surface-border-subtle bg-surface/40 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}

export function RecommendationDrawerSidebar({
  context,
}: {
  context: RecommendationDetailContext;
}) {
  const [watchlistAdded, setWatchlistAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function addToWatchlist(): void {
    if (timer.current) clearTimeout(timer.current);
    setWatchlistAdded(true);
    timer.current = setTimeout(() => setWatchlistAdded(false), 1500);
  }

  return (
    <aside
      className="flex h-full w-full flex-col gap-4 bg-surface/20 p-4"
      aria-label="Recommendation quick facts"
    >
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
          Quick Facts
        </p>
        <dl className="grid grid-cols-2 gap-2">
          <Fact label="Current Price" value={formatPrice(context.currentPrice)} />
          <Fact label="Market Cap" value={context.marketCap ?? "—"} />
          <Fact label="Sector" value={context.sector ?? "—"} />
          <Fact label="Industry" value={context.industry ?? "—"} />
          <Fact
            label="Market Status"
            value={context.marketStatus ?? "—"}
          />
          <div className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2">
            <dt className="text-[10px] text-text-muted">Research Confidence</dt>
            <dd className="mt-1.5">
              <ConfidenceBar value={context.confidence} size="sm" />
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
          <CalendarClock className="h-3 w-3" aria-hidden />
          Upcoming Events
        </p>
        <div className="rounded-lg border border-dashed border-surface-border-subtle/80 bg-surface/30 px-2.5 py-3">
          <p className="text-[11px] text-text-muted">
            Event intelligence placeholder — Sprint 11A.2
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
          Quick Actions
        </p>
        <div className="space-y-1.5">
          <SidebarAction
            icon={Star}
            label={watchlistAdded ? "Added to Watchlist" : "Watchlist"}
            onClick={addToWatchlist}
            active={watchlistAdded}
          />
          <SidebarAction
            icon={Briefcase}
            label="Portfolio"
            href="/portfolio"
          />
          <SidebarAction
            icon={ExternalLink}
            label="Open Company Page"
            href={getCompanyRoute(context.symbol)}
          />
          <SidebarAction
            icon={Building2}
            label="Research Desk"
            href="/research"
          />
        </div>
      </section>
    </aside>
  );
}
