"use client";

import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";
import { formatISTDateTimeInline } from "@/lib/market/format";
import { cn } from "@/lib/utils";

interface ChartHeaderProps {
  companyName: string;
  symbol: string;
  exchange: string;
  quote?: EnrichedQuote;
}

export function ChartHeader({
  companyName,
  symbol,
  exchange,
  quote,
}: ChartHeaderProps) {
  const price = quote?.price;
  const change = quote?.changePercent;
  const volume = quote?.volume;
  const updated =
    quote?.lastUpdatedIST ||
    (quote?.lastUpdated
      ? formatISTDateTimeInline(quote.lastUpdated)
      : null);

  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-surface-border-subtle pb-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
          {exchange}
        </p>
        <h2 className="truncate font-serif text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">
          {companyName}
        </h2>
        <p className="mt-0.5 font-mono text-xs font-semibold text-text-muted">
          {symbol}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-text-primary">
          {price != null
            ? `₹${price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
            : "—"}
        </p>
        <p
          className={cn(
            "mt-0.5 font-mono text-sm font-semibold tabular-nums",
            change == null
              ? "text-text-muted"
              : change >= 0
                ? "text-gain"
                : "text-loss"
          )}
        >
          {change == null
            ? "—"
            : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
        </p>
        <p className="mt-1 text-[10px] text-text-faint">
          Vol{" "}
          {volume != null ? volume.toLocaleString("en-IN") : "—"}
          {updated ? ` · Updated ${updated}` : ""}
        </p>
      </div>
    </header>
  );
}
