"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import { getCompanyRoute } from "@/lib/routes";
import { buildInitialQuotesMap } from "@/lib/market-data/enriched-quote";
import type { WatchlistItem } from "@/types";
import type { SharedRecommendation } from "@/lib/recommendations";
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
        icon: <X className="h-3 w-3" />,
        onAction: (selected) => {
          selected.forEach((row) => removeItem(row.id));
        },
      },
    ],
    [removeItem]
  );

  return (
    <Card padding="lg" accent="cyan" className="h-full">
      <CardHeader
        title="Watchlist"
        subtitle={`${items.length} stocks tracked · live signals`}
        icon={<Star className="h-4 w-4 text-cyan-400" />}
      />

      {items.length === 0 ? (
        <EmptyStatePanel
          message="Watchlist is empty. Add symbols from company pages or Markets to track Strategy Engine signals here."
          source="Watchlist registry · Strategy Engine"
          icon={Star}
        />
      ) : (
        <ResearchDataGrid
          table={WATCHLIST_TABLE}
          rows={rows}
          getRowId={(row) => row.id}
          bulkActions={bulkActions}
          maxHeight={420}
          onRowClick={(row) => router.push(getCompanyRoute(row.symbol))}
          renderExpandedRow={(row) => (
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                  Strategy Details
                </p>
                <p className="mt-1 text-xs">
                  {row.action} · {row.strategy}
                  {row.confidence != null
                    ? ` · Confidence ${row.confidence.toFixed(1)}%`
                    : ""}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                  Notes
                </p>
                <p className="mt-1 text-xs">
                  {row.sector} · Updated {row.updated} · Vol {row.volume}
                </p>
              </div>
            </div>
          )}
        />
      )}
    </Card>
  );
}
