"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import type { ChartTimeframe } from "@/types";
import type { OhlcBar } from "@/lib/providers/types";

function ChartSkeleton() {
  return (
    <div className="glass-card flex h-[420px] flex-col p-5">
      <Skeleton className="mb-4 h-4 w-32" />
      <Skeleton className="flex-1 w-full" />
    </div>
  );
}

const TradingViewChart = dynamic(
  () =>
    import("@/components/company/research/TradingViewChart").then(
      (mod) => mod.TradingViewChart
    ),
  { loading: () => <ChartSkeleton />, ssr: false }
);

interface LazyTradingViewChartProps {
  exchangeSymbol: string;
  companyName: string;
  symbol: string;
  priceHistory: Record<ChartTimeframe, OhlcBar[]>;
  quote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
}

export function LazyTradingViewChart({
  symbol,
  quote,
  priceHistory,
  ...props
}: LazyTradingViewChartProps) {
  const { quotes } = useMarketQuotes([symbol], {
    initialQuotes: quote ? { [symbol.toUpperCase()]: quote } : {},
  });

  const liveQuote = quotes.get(symbol) ?? quotes.get(symbol.toUpperCase());

  return (
    <TradingViewChart
      {...props}
      symbol={symbol}
      priceHistory={priceHistory}
      liveQuote={liveQuote}
    />
  );
}
