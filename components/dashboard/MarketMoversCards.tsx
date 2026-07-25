/**
 * Sprint 10C — Market Movers as five institutional strategy-style cards.
 * Presentation only over existing breadth mover lists (no engine changes).
 */

import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { StockLink } from "@/components/ui/StockLink";
import type { MarketBreadth, MarketMover } from "@/types";
import {
  Activity,
  Flame,
  Package,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type MoverMetric = "change" | "volume" | "delivery";

interface MoverCardTheme {
  id: string;
  title: string;
  metric: MoverMetric;
  icon: ReactNode;
  background: string;
  border: string;
  accent: string;
  viewAllHref: string;
}

const CARD_THEMES: readonly MoverCardTheme[] = [
  {
    id: "gainers",
    title: "Top Gainers",
    metric: "change",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    background: "bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent",
    border: "border-emerald-500/30",
    accent: "text-emerald-400",
    viewAllHref: "/markets",
  },
  {
    id: "losers",
    title: "Top Losers",
    metric: "change",
    icon: <TrendingDown className="h-3.5 w-3.5" />,
    background: "bg-gradient-to-br from-rose-500/20 via-rose-500/5 to-transparent",
    border: "border-rose-500/30",
    accent: "text-rose-400",
    viewAllHref: "/markets",
  },
  {
    id: "active",
    title: "Most Active",
    metric: "volume",
    icon: <Activity className="h-3.5 w-3.5" />,
    background: "bg-gradient-to-br from-sky-500/20 via-sky-500/5 to-transparent",
    border: "border-sky-500/30",
    accent: "text-sky-400",
    viewAllHref: "/markets",
  },
  {
    id: "volume-shock",
    title: "Volume Shockers",
    metric: "volume",
    icon: <Flame className="h-3.5 w-3.5" />,
    background: "bg-gradient-to-br from-violet-500/20 via-violet-500/5 to-transparent",
    border: "border-violet-500/30",
    accent: "text-violet-400",
    viewAllHref: "/markets",
  },
  {
    id: "delivery",
    title: "Delivery Leaders",
    metric: "delivery",
    icon: <Package className="h-3.5 w-3.5" />,
    background: "bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-transparent",
    border: "border-amber-500/30",
    accent: "text-amber-400",
    viewAllHref: "/markets",
  },
];

function uniqueMovers(items: MarketMover[]): MarketMover[] {
  const seen = new Set<string>();
  const out: MarketMover[] = [];
  for (const item of items) {
    const key = item.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Presentation-only: volume × |% change| as a shock proxy from existing quotes. */
function deriveVolumeShockers(breadth: MarketBreadth): MarketMover[] {
  return uniqueMovers([
    ...breadth.mostActive,
    ...breadth.gainers,
    ...breadth.losers,
  ])
    .slice()
    .sort((a, b) => {
      const scoreA = (a.quote?.volume ?? 0) * Math.abs(a.changePercent);
      const scoreB = (b.quote?.volume ?? 0) * Math.abs(b.changePercent);
      return scoreB - scoreA;
    })
    .slice(0, 5);
}

/** Presentation-only: rank by delivery % already on enriched quotes. */
function deriveDeliveryLeaders(breadth: MarketBreadth): MarketMover[] {
  const ranked = uniqueMovers([
    ...breadth.mostActive,
    ...breadth.gainers,
    ...breadth.losers,
    ...breadth.weekHighs,
  ])
    .filter((item) => item.quote?.deliveryPercent != null)
    .sort(
      (a, b) =>
        (b.quote?.deliveryPercent ?? 0) - (a.quote?.deliveryPercent ?? 0)
    )
    .slice(0, 5);
  if (ranked.length > 0) return ranked;
  return breadth.mostActive.slice(0, 5);
}

function itemsForCard(
  theme: MoverCardTheme,
  breadth: MarketBreadth
): MarketMover[] {
  switch (theme.id) {
    case "gainers":
      return breadth.gainers.slice(0, 5);
    case "losers":
      return breadth.losers.slice(0, 5);
    case "active":
      return breadth.mostActive.slice(0, 5);
    case "volume-shock":
      return deriveVolumeShockers(breadth);
    case "delivery":
      return deriveDeliveryLeaders(breadth);
    default:
      return [];
  }
}

function metricLabel(item: MarketMover, metric: MoverMetric): string {
  if (metric === "volume") return item.volume || "—";
  if (metric === "delivery") {
    const pct = item.quote?.deliveryPercent;
    return pct != null && Number.isFinite(pct) ? `${pct.toFixed(1)}%` : "—";
  }
  return "";
}

function MoverCard({
  theme,
  items,
}: {
  theme: MoverCardTheme;
  items: MarketMover[];
}) {
  return (
    <article
      className={`flex min-w-0 flex-col rounded-2xl border backdrop-blur-md ${theme.background} ${theme.border}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2.5">
        <div className={`flex items-center gap-2 ${theme.accent}`}>
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5">
            {theme.icon}
          </span>
          <h3 className="text-[12px] font-bold tracking-tight text-white">
            {theme.title}
          </h3>
        </div>
      </header>

      <ul className="flex flex-1 flex-col gap-1.5 px-3 py-2.5">
        {items.length === 0 ? (
          <li className="py-4 text-center text-[11px] text-white/45">
            No names in this screen
          </li>
        ) : (
          items.map((item) => (
            <li key={`${theme.id}-${item.symbol}`}>
              <StockLink
                symbol={item.symbol}
                className="flex items-center justify-between gap-2 rounded-md px-1 py-1 transition-colors hover:bg-white/5"
              >
                <span className="min-w-0 truncate text-[11px] font-semibold text-white/90">
                  {item.symbol}
                </span>
                {theme.metric === "change" ? (
                  <ChangeIndicator
                    value={item.changePercent}
                    size="sm"
                    showIcon={false}
                  />
                ) : (
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/70">
                    {metricLabel(item, theme.metric)}
                  </span>
                )}
              </StockLink>
            </li>
          ))
        )}
      </ul>

      <footer className="border-t border-white/5 px-3 py-2">
        <Link
          href={theme.viewAllHref}
          className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${theme.accent} hover:underline`}
        >
          View All →
        </Link>
      </footer>
    </article>
  );
}

export function MarketMoversCards({ breadth }: { breadth: MarketBreadth }) {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Market Movers
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            {breadth.universeLabel ?? "Entire NSE"} · institutional screens
          </p>
        </div>
        <Link
          href="/markets"
          className="text-[11px] font-semibold text-accent hover:underline"
        >
          Open Markets →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CARD_THEMES.map((theme) => (
          <MoverCard
            key={theme.id}
            theme={theme}
            items={itemsForCard(theme, breadth)}
          />
        ))}
      </div>
    </div>
  );
}
