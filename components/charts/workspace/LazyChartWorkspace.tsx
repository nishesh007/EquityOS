"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import type { ChartTimeframe } from "@/types";
import type { OhlcBar } from "@/lib/providers/types";
import type { ReactNode } from "react";

function WorkspaceSkeleton() {
  return (
    <div className="flex h-[520px] flex-col gap-3 rounded-xl border border-surface-border p-4">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="flex-1 w-full" />
    </div>
  );
}

const ChartWorkspace = dynamic(
  () =>
    import("./ChartWorkspace").then((mod) => mod.ChartWorkspace),
  { loading: () => <WorkspaceSkeleton />, ssr: false }
);

interface LazyChartWorkspaceProps {
  exchangeSymbol: string;
  companyName: string;
  symbol: string;
  priceHistory: Record<ChartTimeframe, OhlcBar[]>;
  quote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
  comparePriceHistory?: Record<ChartTimeframe, OhlcBar[]>;
  overview?: ReactNode;
  aiSummary?: ReactNode;
  keyMetrics?: ReactNode;
}

export function LazyChartWorkspace({
  symbol,
  quote,
  ...props
}: LazyChartWorkspaceProps) {
  const { quotes } = useMarketQuotes([symbol], {
    initialQuotes: quote ? { [symbol.toUpperCase()]: quote } : {},
  });
  const liveQuote = quotes.get(symbol) ?? quotes.get(symbol.toUpperCase());

  return (
    <ChartWorkspace
      {...props}
      symbol={symbol}
      liveQuote={liveQuote ?? quote}
    />
  );
}
