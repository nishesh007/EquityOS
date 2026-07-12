"use client";

import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";
import { cn, formatPrice } from "@/lib/utils";

export interface QuoteDisplayProps {
  quote: EnrichedQuote;
  size?: "sm" | "md" | "lg";
  showChange?: boolean;
  showTimestamp?: boolean;
  showExchange?: boolean;
  align?: "left" | "right";
  className?: string;
}

function priceSizeClass(size: QuoteDisplayProps["size"]): string {
  switch (size) {
    case "sm":
      return "text-sm";
    case "lg":
      return "text-3xl";
    default:
      return "text-xl";
  }
}

function timestampLines(quote: EnrichedQuote): {
  label: string;
  value: string | null;
} {
  if (quote.availability === "unavailable") {
    return {
      label: "Last successful update",
      value: quote.lastSuccessfulUpdateIST,
    };
  }

  if (quote.marketStatus === "open" || quote.marketStatus === "pre_open") {
    return {
      label: "Updated",
      value: quote.lastUpdatedIST,
    };
  }

  return {
    label: "Last traded",
    value: quote.lastTradeTimeIST,
  };
}

export function QuoteDisplay({
  quote,
  size = "md",
  showChange = true,
  showTimestamp = true,
  showExchange = true,
  align = "left",
  className,
}: QuoteDisplayProps) {
  const isUnavailable = quote.availability === "unavailable";
  const isDelayed = quote.availability === "delayed";
  const { label: timestampLabel, value: timestampValue } = timestampLines(quote);
  const alignClass = align === "right" ? "items-end text-right" : "items-start text-left";

  return (
    <div className={cn("flex flex-col gap-1", alignClass, className)}>
      {isUnavailable ? (
        <p className={cn("font-semibold text-text-muted", priceSizeClass(size))}>
          Price unavailable
        </p>
      ) : (
        <>
          <p className={cn("font-bold font-mono text-text-primary tabular-nums", priceSizeClass(size))}>
            {formatPrice(quote.price!)}
          </p>
          {showChange && quote.changePercent !== null && (
            <div className={cn("flex items-center gap-2", align === "right" && "justify-end")}>
              {quote.change !== null && (
                <span
                  className={cn(
                    "text-xs font-mono tabular-nums",
                    (quote.change ?? 0) >= 0 ? "text-gain" : "text-loss"
                  )}
                >
                  {(quote.change ?? 0) >= 0 ? "+" : ""}₹
                  {Math.abs(quote.change ?? 0).toFixed(2)}
                </span>
              )}
              <ChangeIndicator value={quote.changePercent} size="sm" />
            </div>
          )}
        </>
      )}

      {showExchange && (
        <div className={cn("flex flex-wrap items-center gap-1.5", align === "right" && "justify-end")}>
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
            {quote.marketStatusLabel}
          </span>
          {isDelayed && (
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-accent">
              Delayed
            </span>
          )}
        </div>
      )}

      {showTimestamp && (
        <div className={cn("mt-0.5", alignClass)}>
          <p className="text-[10px] text-text-faint">{timestampLabel}</p>
          {timestampValue ? (
            <p className="whitespace-pre-line text-[10px] font-mono text-text-muted">
              {timestampValue}
            </p>
          ) : (
            <p className="text-[10px] text-text-faint">—</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact inline price + change for tables */
export function QuoteDisplayCompact({
  quote,
  className,
}: {
  quote: EnrichedQuote;
  className?: string;
}) {
  if (quote.availability === "unavailable") {
    return (
      <div className={className}>
        <p className="text-xs text-text-muted">Unavailable</p>
        {quote.lastSuccessfulUpdateIST && (
          <p className="text-[9px] text-text-faint">{quote.lastSuccessfulUpdateIST}</p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-sm font-mono text-text-primary tabular-nums">
        {formatPrice(quote.price!)}
      </p>
      {quote.changePercent !== null && (
        <ChangeIndicator value={quote.changePercent} size="sm" showIcon={false} />
      )}
      {quote.availability === "delayed" && (
        <p className="text-[9px] text-accent">Delayed</p>
      )}
    </div>
  );
}
