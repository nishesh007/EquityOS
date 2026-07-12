"use client";

import { QuoteDisplay } from "@/components/market/QuoteDisplay";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import {
  createUnavailableQuote,
  type EnrichedQuote,
} from "@/lib/market-data/enriched-quote";
import { cn } from "@/lib/utils";

export interface CompanyLiveQuoteProps {
  symbol: string;
  initialQuote?: EnrichedQuote;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
  showChange?: boolean;
  className?: string;
}

export function CompanyLiveQuote({
  symbol,
  initialQuote,
  size = "md",
  align = "left",
  showChange = true,
  className,
}: CompanyLiveQuoteProps) {
  const normalized = symbol.toUpperCase();
  const { quotes, loading } = useMarketQuotes([symbol], {
    initialQuotes: initialQuote ? { [normalized]: initialQuote } : {},
  });

  const polled = quotes.get(symbol) ?? quotes.get(normalized);
  const quote =
    polled ??
    (loading ? initialQuote : undefined) ??
    createUnavailableQuote(symbol);

  const alignClass = align === "right" ? "text-right items-end" : "text-left items-start";

  return (
    <div className={cn("flex flex-col gap-1", alignClass, className)}>
      <QuoteDisplay
        quote={quote}
        size={size}
        align={align}
        showChange={showChange}
        showTimestamp={false}
      />
      <div className={cn("mt-0.5 flex flex-col gap-1", alignClass)}>
        <div>
          <p className="text-[10px] text-text-faint">Last traded</p>
          <p className="whitespace-pre-line text-[10px] font-mono text-text-muted">
            {quote.lastTradeTimeIST ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-faint">Updated</p>
          <p className="whitespace-pre-line text-[10px] font-mono text-text-muted">
            {quote.lastUpdatedIST ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
