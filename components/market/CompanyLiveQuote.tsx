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
  /** Hide last-traded / updated lines for dense headers. */
  compact?: boolean;
  className?: string;
}

export function CompanyLiveQuote({
  symbol,
  initialQuote,
  size = "md",
  align = "left",
  showChange = true,
  compact = false,
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
      {!compact ? (
        <div className={cn("mt-0.5 flex flex-col gap-1", alignClass)}>
          <div>
            <p className="data-label">Last traded</p>
            <p className="data-timestamp whitespace-pre-line font-mono">
              {quote.lastTradeTimeIST ?? "—"}
            </p>
          </div>
          <div>
            <p className="data-label">Updated</p>
            <p className="data-timestamp whitespace-pre-line font-mono">
              {quote.lastUpdatedIST ?? "—"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
