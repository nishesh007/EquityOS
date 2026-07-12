"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
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
  currentPrice: number;
  priceHistory: Record<ChartTimeframe, { timestamp: string; price: number; volume?: number }[]>;
}

export function LazyTradingViewChart(props: LazyTradingViewChartProps) {
  return <TradingViewChart {...props} />;
}
