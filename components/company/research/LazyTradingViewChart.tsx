"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { isValidMarketPrice } from "@/lib/utils";
import type { ChartTimeframe } from "@/types";

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
  priceHistory: Record<ChartTimeframe, { timestamp: string; price: number; volume?: number }[]>;
  quote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
}

function lastHistoricalPrice(
  priceHistory: LazyTradingViewChartProps["priceHistory"]
): number {
  for (const timeframe of ["6M", "1Y", "3M", "1M", "1W", "1D", "5Y"] as ChartTimeframe[]) {
    const series = priceHistory[timeframe];
    const last = series?.[series.length - 1]?.price;
    if (isValidMarketPrice(last)) return last;
  }
  return 0;
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
  const livePrice = liveQuote?.price;
  const chartAnchorPrice = isValidMarketPrice(livePrice)
    ? livePrice
    : lastHistoricalPrice(priceHistory);

  return (
    <TradingViewChart
      {...props}
      symbol={symbol}
      priceHistory={priceHistory}
      chartAnchorPrice={chartAnchorPrice}
      liveQuote={liveQuote}
    />
  );
}
