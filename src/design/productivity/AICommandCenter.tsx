"use client";

/**
 * AI Command Center — presentation hub for opportunities, risks,
 * research queue and upcoming events. Links to existing surfaces only.
 */

import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Crosshair,
  FileText,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFavorites, getRecents } from "./recentItems";

interface HubCard {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  tone?: "default" | "warning" | "accent";
}

function buildHubSections() {
  const pinned = getFavorites("company").slice(0, 3);
  const recentCompanies = getRecents("company", 3);
  const recentResearch = getRecents("research", 3);

  const opportunities: HubCard[] = [
    {
      id: "best",
      title: "Today's Best Opportunities",
      subtitle: "Open AI Insights for live Strategy Engine output",
      href: "/opportunities",
      tone: "accent",
    },
    {
      id: "recs",
      title: "AI Recommendations",
      subtitle: "Shared recommendation pipeline surface",
      href: "/opportunities",
    },
    {
      id: "conviction",
      title: "Highest Conviction Stocks",
      subtitle:
        pinned[0]?.label ??
        recentCompanies[0]?.label ??
        "Pin stocks from the command palette",
      href: pinned[0]?.href ?? recentCompanies[0]?.href ?? "/watchlist",
      tone: "accent",
    },
  ];

  const attention: HubCard[] = [
    {
      id: "attention",
      title: "Stocks Requiring Attention",
      subtitle: "Review portfolio risk and watchlist alerts",
      href: "/portfolio",
      tone: "warning",
    },
    {
      id: "risk",
      title: "Risk Warnings",
      subtitle: "Validation & research confidence checks",
      href: "/validation",
      tone: "warning",
    },
    {
      id: "suggestions",
      title: "Portfolio Suggestions",
      subtitle: "Holdings overview and opportunity changes",
      href: "/portfolio",
    },
  ];

  const queue: HubCard[] = [
    {
      id: "events",
      title: "Upcoming Events",
      subtitle: "Earnings & economic calendar (future-ready)",
      href: "/results",
    },
    {
      id: "queue",
      title: "Research Queue",
      subtitle:
        recentResearch[0]?.label ?? "Recent research notes appear here",
      href: recentResearch[0]?.href ?? "/research",
    },
  ];

  return { opportunities, attention, queue };
}

function CardGrid({
  title,
  icon,
  cards,
}: {
  title: string;
  icon: React.ReactNode;
  cards: HubCard[];
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
        {icon}
        {title}
      </h3>
      <ul className="space-y-1.5">
        {cards.map((card) => (
          <li key={card.id}>
            <Link
              href={card.href}
              className={cn(
                "block rounded-lg border border-surface-border-subtle px-3 py-2.5 transition-colors hover:bg-surface-hover",
                card.tone === "accent" && "border-accent/25 bg-accent/5",
                card.tone === "warning" && "border-amber-500/25 bg-amber-500/5"
              )}
            >
              <p className="text-xs font-medium text-text-primary">{card.title}</p>
              <p className="mt-0.5 text-[11px] text-text-muted">{card.subtitle}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AICommandCenter({ className }: { className?: string }) {
  const { opportunities, attention, queue } = buildHubSections();

  return (
    <div className={cn("space-y-5 px-3 py-3", className)}>
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          AI Command Center
        </p>
        <p className="mt-0.5 text-[11px] text-text-muted">
          Productivity shortcuts into existing AI, portfolio and research
          surfaces — no engine data is recomputed here.
        </p>
      </div>

      <CardGrid
        title="Opportunities"
        icon={<Crosshair className="h-3 w-3" />}
        cards={opportunities}
      />
      <CardGrid
        title="Attention & Risk"
        icon={<ShieldAlert className="h-3 w-3" />}
        cards={attention}
      />
      <CardGrid
        title="Queue & Events"
        icon={<Calendar className="h-3 w-3" />}
        cards={queue}
      />

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/screener"
          className="flex items-center gap-2 rounded-lg border border-surface-border-subtle px-3 py-2 text-[11px] font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          <TrendingUp className="h-3.5 w-3.5 text-accent" />
          Scan Market
        </Link>
        <Link
          href="/ai/research"
          className="flex items-center gap-2 rounded-lg border border-surface-border-subtle px-3 py-2 text-[11px] font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          <FileText className="h-3.5 w-3.5 text-accent" />
          Run AI Research
        </Link>
        <Link
          href="/validation"
          className="col-span-2 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] font-medium text-text-secondary hover:bg-amber-500/10"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          Review risk warnings in Validation
        </Link>
      </div>
    </div>
  );
}
