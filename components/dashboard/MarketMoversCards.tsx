/**
 * Sprint 10C.1 — Market Movers compact cards (presentation only).
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
  accent: string;
  strip: string;
  viewAllHref: string;
}

const CARD_THEMES: readonly MoverCardTheme[] = [
  {
    id: "gainers",
    title: "Top Gainers",
    metric: "change",
    icon: <TrendingUp className="h-4 w-4" />,
    accent: "text-emerald-400",
    strip: "bg-emerald-500",
    viewAllHref: "/markets",
  },
  {
    id: "losers",
    title: "Top Losers",
    metric: "change",
    icon: <TrendingDown className="h-4 w-4" />,
    accent: "text-red-400",
    strip: "bg-red-500",
    viewAllHref: "/markets",
  },
  {
    id: "active",
    title: "Most Active",
    metric: "volume",
    icon: <Activity className="h-4 w-4" />,
    accent: "text-blue-400",
    strip: "bg-blue-500",
    viewAllHref: "/markets",
  },
  {
    id: "volume-shock",
    title: "Volume Shockers",
    metric: "volume",
    icon: <Flame className="h-4 w-4" />,
    accent: "text-purple-400",
    strip: "bg-purple-500",
    viewAllHref: "/markets",
  },
  {
    id: "delivery",
    title: "Delivery Leaders",
    metric: "delivery",
    icon: <Package className="h-4 w-4" />,
    accent: "text-amber-400",
    strip: "bg-amber-500",
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

function deriveDeliveryLeaders(breadth: MarketBreadth): {
  items: MarketMover[];
  unavailable: boolean;
} {
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

  if (ranked.length > 0) {
    return { items: ranked, unavailable: false };
  }

  return {
    items: breadth.mostActive.slice(0, 5),
    unavailable: true,
  };
}

function itemsForCard(
  theme: MoverCardTheme,
  breadth: MarketBreadth
): { items: MarketMover[]; deliveryUnavailable: boolean } {
  switch (theme.id) {
    case "gainers":
      return { items: breadth.gainers.slice(0, 5), deliveryUnavailable: false };
    case "losers":
      return { items: breadth.losers.slice(0, 5), deliveryUnavailable: false };
    case "active":
      return {
        items: breadth.mostActive.slice(0, 5),
        deliveryUnavailable: false,
      };
    case "volume-shock":
      return {
        items: deriveVolumeShockers(breadth),
        deliveryUnavailable: false,
      };
    case "delivery": {
      const result = deriveDeliveryLeaders(breadth);
      return { items: result.items, deliveryUnavailable: result.unavailable };
    }
    default:
      return { items: [], deliveryUnavailable: false };
  }
}

function metricLabel(
  item: MarketMover,
  metric: MoverMetric,
  deliveryUnavailable: boolean
): string {
  if (metric === "volume") return item.volume || "—";
  if (metric === "delivery") {
    const pct = item.quote?.deliveryPercent;
    if (pct != null && Number.isFinite(pct)) return `${pct.toFixed(1)}%`;
    return deliveryUnavailable ? "Unavailable" : "Unavailable";
  }
  return "";
}

function MoverCard({
  theme,
  items,
  deliveryUnavailable = false,
}: {
  theme: MoverCardTheme;
  items: MarketMover[];
  deliveryUnavailable?: boolean;
}) {
  return (
    <article className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-raised">
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${theme.strip}`}
      />
      <header className="flex items-center gap-2 px-3 py-2 pl-4">
        <span className={theme.accent}>{theme.icon}</span>
        <h3 className="text-caption font-semibold text-text-primary">
          {theme.title}
        </h3>
      </header>

      <ul className="flex flex-1 flex-col gap-0.5 px-2 pb-2 pl-3">
        {items.length === 0 ? (
          <li className="py-3 text-center text-micro text-text-muted">
            No names in this screen
          </li>
        ) : (
          items.map((item) => (
            <li key={`${theme.id}-${item.symbol}`}>
              <StockLink
                symbol={item.symbol}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1 transition-colors duration-150 hover:bg-white/5"
              >
                <span className="min-w-0 truncate text-caption font-semibold text-text-primary">
                  {item.symbol}
                </span>
                {theme.metric === "change" ? (
                  <ChangeIndicator
                    value={item.changePercent}
                    size="sm"
                    showIcon={false}
                  />
                ) : (
                  <span className="shrink-0 text-micro tabular-nums text-text-secondary">
                    {metricLabel(item, theme.metric, deliveryUnavailable)}
                  </span>
                )}
              </StockLink>
            </li>
          ))
        )}
      </ul>

      <footer className="px-3 pb-2 pl-4">
        <Link
          href={theme.viewAllHref}
          className={`text-micro font-semibold ${theme.accent} transition-opacity duration-150 hover:opacity-80`}
        >
          View All →
        </Link>
      </footer>
    </article>
  );
}

export function MarketMoversCards({ breadth }: { breadth: MarketBreadth }) {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-minor-section font-semibold text-text-primary">
            Market Movers
          </h2>
          <p className="mt-1 text-caption text-text-muted">
            {breadth.universeLabel ?? "Entire NSE"}
          </p>
        </div>
        <Link
          href="/markets"
          className="text-caption font-semibold text-accent transition-opacity duration-150 hover:opacity-80"
        >
          Markets →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {CARD_THEMES.map((theme) => {
          const { items, deliveryUnavailable } = itemsForCard(theme, breadth);
          return (
            <MoverCard
              key={theme.id}
              theme={theme}
              items={items}
              deliveryUnavailable={deliveryUnavailable}
            />
          );
        })}
      </div>
    </div>
  );
}
