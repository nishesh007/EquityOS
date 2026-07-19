"use client";

/**
 * Productivity Panel — recent research, pinned stocks, favorites,
 * recent searches and quick links. Presentation only.
 */

import Link from "next/link";
import {
  Bookmark,
  Clock,
  Eye,
  FileText,
  Search,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFavorites, getRecents } from "./recentItems";
import { listCommands } from "../command/commandRegistry";

function Section({
  title,
  icon,
  children,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
        {icon}
        {title}
      </h3>
      {empty ? (
        <p className="rounded-lg border border-dashed border-surface-border px-3 py-2 text-[11px] text-text-faint">
          Nothing pinned yet — use Ctrl+K and Ctrl+P.
        </p>
      ) : (
        <ul className="space-y-1">{children}</ul>
      )}
    </section>
  );
}

function ItemLink({
  href,
  label,
  meta,
}: {
  href?: string;
  label: string;
  meta?: string;
}) {
  const content = (
    <>
      <span className="truncate text-xs text-text-primary">{label}</span>
      {meta ? (
        <span className="shrink-0 text-[10px] text-text-faint">{meta}</span>
      ) : null}
    </>
  );
  if (!href) {
    return (
      <li className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5">
        {content}
      </li>
    );
  }
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-hover"
      >
        {content}
      </Link>
    </li>
  );
}

export function ProductivityPanel({ className }: { className?: string }) {
  const recentResearch = getRecents("research", 5);
  const recentPages = getRecents("page", 5);
  const recentSearches = getRecents("search", 5);
  const recentCompanies = getRecents("company", 5);
  const pinnedStocks = getFavorites("company");
  const pinnedPages = getFavorites("page");
  const watchlistCmd = listCommands().find((c) => c.id === "page-watchlist");

  return (
    <div className={cn("space-y-5 px-3 py-3", className)}>
      <Section
        title="Pinned Stocks"
        icon={<Star className="h-3 w-3" />}
        empty={pinnedStocks.length === 0}
      >
        {pinnedStocks.map((item) => (
          <ItemLink
            key={item.id}
            href={item.href}
            label={item.label}
            meta="Pinned"
          />
        ))}
      </Section>

      <Section
        title="Favorite Pages / Reports"
        icon={<Bookmark className="h-3 w-3" />}
        empty={pinnedPages.length === 0}
      >
        {pinnedPages.map((item) => (
          <ItemLink
            key={item.id}
            href={item.href}
            label={item.label}
            meta="Pinned"
          />
        ))}
      </Section>

      <Section
        title="Recent Research"
        icon={<FileText className="h-3 w-3" />}
        empty={recentResearch.length === 0}
      >
        {recentResearch.map((item) => (
          <ItemLink key={item.id} href={item.href} label={item.label} />
        ))}
      </Section>

      <Section title="Favorite Watchlists" icon={<Eye className="h-3 w-3" />}>
        <ItemLink
          href={watchlistCmd?.href ?? "/watchlist"}
          label="Primary Watchlist"
          meta="Open"
        />
      </Section>

      <Section
        title="Recently Viewed"
        icon={<Clock className="h-3 w-3" />}
        empty={recentCompanies.length === 0 && recentPages.length === 0}
      >
        {[...recentCompanies, ...recentPages].slice(0, 6).map((item) => (
          <ItemLink
            key={`${item.kind}-${item.id}`}
            href={item.href}
            label={item.label}
            meta={item.kind}
          />
        ))}
      </Section>

      <Section
        title="Recent Searches"
        icon={<Search className="h-3 w-3" />}
        empty={recentSearches.length === 0}
      >
        {recentSearches.map((item) => (
          <ItemLink key={item.id} label={item.label} meta="Search" />
        ))}
      </Section>

      <Section title="Saved Reports" icon={<FileText className="h-3 w-3" />}>
        <ItemLink href="/research" label="Research Workspace" meta="Open" />
        <ItemLink href="/ai/research" label="AI Research Desk" meta="Open" />
        <ItemLink href="/validation" label="Research Confidence" meta="Open" />
      </Section>
    </div>
  );
}
