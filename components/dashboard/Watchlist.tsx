"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { EventAwarenessBadgeRow } from "@/components/events/EventAwarenessBadges";
import { useOptionalGlobalEventDrawer } from "@/components/events/GlobalEventDrawerProvider";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import { getCompanyRoute } from "@/lib/routes";
import { buildInitialQuotesMap } from "@/lib/market-data/enriched-quote";
import type { WatchlistItem } from "@/types";
import type { SharedRecommendation } from "@/lib/recommendations";
import { buildWatchlistEventInsights } from "@/src/core/events/integration";
import { buildEventSeedCatalog, toDateKey } from "@/src/core/events";
import { useRouter } from "next/navigation";
import { Star, X } from "lucide-react";
import { useMemo } from "react";
import {
  createInstitutionalTable,
  ResearchDataGrid,
  type BulkAction,
} from "@/src/design";

interface WatchlistProps {
  initialItems: WatchlistItem[];
  recommendations?: Record<string, SharedRecommendation>;
}

interface WatchlistGridRow {
  id: string;
  symbol: string;
  sector: string;
  ltp: number | null;
  dayChangePercent: number | null;
  updated: string;
  volume: string;
  strategy: string;
  confidence: number | null;
  action: string;
}

const WATCHLIST_TABLE = createInstitutionalTable<WatchlistGridRow>({
  id: "watchlist-grid",
  pageSize: 50,
  density: "compact",
  columns: [
    { id: "symbol", label: "Symbol", kind: "text", sticky: true, width: 100 },
    { id: "sector", label: "Sector", kind: "text" },
    { id: "ltp", label: "LTP", kind: "price" },
    { id: "dayChangePercent", label: "Change", kind: "trend" },
    { id: "updated", label: "Updated", kind: "text" },
    { id: "volume", label: "Vol", kind: "text" },
    { id: "action", label: "Signal", kind: "badge" },
    { id: "strategy", label: "Strategy", kind: "text" },
    { id: "confidence", label: "Confidence", kind: "percent" },
  ],
});

function formatVolume(volume: number | null, fallback: string): string {
  if (volume === null) return fallback;
  if (volume >= 1e7) return `${(volume / 1e7).toFixed(2)} Cr`;
  if (volume >= 1e5) return `${(volume / 1e5).toFixed(2)} L`;
  return `${Math.round(volume)}`;
}

export function Watchlist({
  initialItems,
  recommendations = {},
}: WatchlistProps) {
  const { items, removeItem } = useWatchlist({ initialItems });
  const router = useRouter();
  const drawer = useOptionalGlobalEventDrawer();
  const today = useMemo(() => toDateKey(new Date()), []);
  const catalog = useMemo(() => buildEventSeedCatalog(today), [today]);
  const eventInsights = useMemo(() => {
    const list = buildWatchlistEventInsights(
      catalog,
      items.map((item) => ({ symbol: item.symbol, sector: item.sector })),
      today
    );
    return new Map(list.map((insight) => [insight.symbol, insight]));
  }, [catalog, items, today]);

  const symbols = items.map((item) => item.symbol);
  const { quotes } = useMarketQuotes(symbols, {
    initialQuotes: buildInitialQuotesMap(items),
  });

  const rows = useMemo<WatchlistGridRow[]>(
    () =>
      items.map((item) => {
        const quote =
          quotes.get(item.symbol) ??
          item.quote ??
          createUnavailableQuote(item.symbol);
        const recommendation = recommendations[item.symbol.toUpperCase()];
        return {
          id: item.id,
          symbol: item.symbol,
          sector: item.sector,
          ltp: quote.price,
          dayChangePercent: quote.changePercent,
          updated:
            quote.availability === "unavailable"
              ? quote.lastSuccessfulUpdateIST ?? "N/A"
              : quote.lastUpdatedIST?.split(" ").slice(-3).join(" ") ?? "N/A",
          volume: formatVolume(quote.volume, item.volume),
          strategy: recommendation?.primaryStrategy ?? "No active signal",
          confidence: recommendation?.confidence ?? null,
          action: recommendation?.action ?? "—",
        };
      }),
    [items, quotes, recommendations]
  );

  const bulkActions = useMemo<BulkAction<WatchlistGridRow>[]>(
    () => [
      {
        id: "remove",
        label: "Remove",
        icon: <X className="h-4 w-4" />,
        onAction: (selected) => {
          selected.forEach((row) => removeItem(row.id));
        },
      },
    ],
    [removeItem]
  );

  return (
    <Card padding="md" className="flex h-full flex-col shadow-none">
      <CardHeader
        title="Watchlist"
        subtitle={`${items.length} stocks tracked`}
        icon={<Star className="h-4 w-4 text-text-secondary" />}
      />

      {items.length === 0 ? (
        <EmptyStatePanel
          message="Watchlist is empty. Add symbols from company pages or Markets to track Strategy Engine signals here."
          source="Watchlist registry · Strategy Engine"
          icon={Star}
        />
      ) : (
        <div className="min-h-0 flex-1 space-y-2">
          {Array.from(eventInsights.values())
            .filter((insight) => insight.badgeKind != null && insight.primary != null)
            .slice(0, 6)
            .map((insight) => (
              <button
                key={insight.symbol}
                type="button"
                onClick={() =>
                  insight.primary && drawer?.openEvent(insight.primary.event)
                }
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-surface-border-subtle/50 bg-white/[0.02] px-2 py-1 text-left transition-colors duration-150 hover:bg-white/[0.04]"
              >
                <span className="text-caption font-semibold text-text-primary">
                  {insight.symbol}
                </span>
                <span className="opacity-70">
                  <EventAwarenessBadgeRow
                    kinds={insight.primary!.awareness}
                    max={2}
                  />
                </span>
              </button>
            ))}
          <ResearchDataGrid
            table={WATCHLIST_TABLE}
            rows={rows}
            getRowId={(row) => row.id}
            bulkActions={bulkActions}
            maxHeight={252}
            onRowClick={(row) => router.push(getCompanyRoute(row.symbol))}
            renderExpandedRow={(row) => {
              const insight = eventInsights.get(row.symbol.toUpperCase());
              const primary = insight?.primary ?? null;
              return (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <p className="data-label">Strategy Details</p>
                    <p className="data-secondary mt-1">
                      {row.action} · {row.strategy}
                      {row.confidence != null
                        ? ` · Confidence ${row.confidence.toFixed(1)}%`
                        : ""}
                    </p>
                  </div>
                  <div>
                    <p className="data-label">Notes</p>
                    <p className="data-secondary mt-1">
                      {row.sector} · Updated {row.updated} · Vol {row.volume}
                    </p>
                  </div>
                  <div>
                    <p className="data-label">Upcoming Catalysts</p>
                    {primary ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          drawer?.openEvent(primary.event);
                        }}
                        className="mt-1 w-full text-left"
                      >
                        <p className="data-secondary">
                          {primary.event.title} · {primary.countdown.label}
                          {primary.impactScore != null
                            ? ` · Impact ${primary.impactScore}`
                            : ""}
                        </p>
                        <EventAwarenessBadgeRow
                          kinds={primary.awareness}
                          max={3}
                          className="mt-1.5"
                        />
                      </button>
                    ) : (
                      <p className="data-secondary mt-1">
                        No upcoming catalysts for this symbol.
                      </p>
                    )}
                  </div>
                </div>
              );
            }}
          />
        </div>
      )}
    </Card>
  );
}
