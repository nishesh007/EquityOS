"use client";

import { Card } from "@/components/ui/Card";
import { QuoteDisplay } from "@/components/market/QuoteDisplay";
import { Sparkline } from "@/src/design";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import { formatNumber } from "@/lib/utils";
import { buildInitialQuotesMap } from "@/lib/market-data/enriched-quote";
import type { MarketIndex } from "@/types";

interface MarketOverviewCardsProps {
  indices: MarketIndex[];
  /** When true, render only snapshot quotes — no independent polling. */
  snapshotLocked?: boolean;
  /** Hide per-quote timestamps (page owns as-of). */
  hideTimestamps?: boolean;
}

export function MarketOverviewCards({
  indices,
  snapshotLocked = false,
  hideTimestamps = false,
}: MarketOverviewCardsProps) {
  const symbols = indices.map((i) => i.symbol);
  const { quotes } = useMarketQuotes(symbols, {
    initialQuotes: buildInitialQuotesMap(indices),
    enabled: !snapshotLocked,
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {indices.map((index) => {
        const polled = snapshotLocked ? undefined : quotes.get(index.symbol);
        const quote =
          polled &&
          polled.availability !== "unavailable" &&
          polled.price !== null &&
          polled.price > 0
            ? polled
            : index.quote ??
              polled ??
              createUnavailableQuote(index.symbol);
        const changePercent = quote.changePercent ?? index.changePercent;
        const high = quote.high ?? index.high;
        const low = quote.low ?? index.low;

        return (
          <Card key={index.id} hover padding="sm" className="!p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="data-label">{index.name}</p>
                <p className="mt-1 text-micro text-text-muted">{index.symbol}</p>
              </div>
              {index.sparkline.length > 0 && (
                <Sparkline
                  data={index.sparkline}
                  positive={changePercent >= 0}
                />
              )}
            </div>

            <div className="mt-4">
              <QuoteDisplay
                quote={quote}
                size="lg"
                showTimestamp={!hideTimestamps}
              />
            </div>

            <div className="mt-4 border-t border-surface-border-subtle pt-3">
              <div className="flex gap-4">
                <div>
                  <p className="text-micro text-text-muted">H</p>
                  <p className="text-caption tabular-nums text-text-secondary">
                    {formatNumber(high)}
                  </p>
                </div>
                <div>
                  <p className="text-micro text-text-muted">L</p>
                  <p className="text-caption tabular-nums text-text-secondary">
                    {formatNumber(low)}
                  </p>
                </div>
              </div>
              {high > low && quote.price !== null && quote.price > 0 && (
                <div className="mt-2">
                  <div className="relative h-1 rounded-full bg-surface-border">
                    <span
                      aria-hidden="true"
                      className={`absolute -top-0.5 h-2 w-2 -translate-x-1/2 rounded-full ${
                        changePercent >= 0 ? "bg-gain" : "bg-loss"
                      }`}
                      style={{
                        left: `${Math.min(
                          100,
                          Math.max(
                            0,
                            ((quote.price - low) / (high - low)) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[9px] uppercase tracking-wider text-text-faint">
                    Session range
                  </p>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
