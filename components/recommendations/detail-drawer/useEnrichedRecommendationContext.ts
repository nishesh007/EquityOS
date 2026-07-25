"use client";

import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { useMemo } from "react";
import type { RecommendationDetailContext } from "./types";

/**
 * Overlay live quote fields onto drawer context without mutating engines/APIs.
 * Sector / industry remain placeholders until Sprint 11A.2 research wiring.
 */
export function useEnrichedRecommendationContext(
  context: RecommendationDetailContext | null
): RecommendationDetailContext | null {
  const symbols = useMemo(
    () => (context?.symbol ? [context.symbol] : []),
    [context?.symbol]
  );
  const { quotes, marketStatus } = useMarketQuotes(symbols, {
    enabled: context != null,
  });

  return useMemo(() => {
    if (!context) return null;
    const quote = quotes.get(context.symbol.toUpperCase());
    if (!quote) return context;

    return {
      ...context,
      currentPrice:
        quote.price != null && quote.price > 0
          ? quote.price
          : context.currentPrice,
      changeAbsolute: quote.change ?? context.changeAbsolute,
      changePercent: quote.changePercent ?? context.changePercent,
      marketCap: quote.marketCap ?? context.marketCap,
      marketStatus:
        quote.marketStatusLabel ||
        marketStatus ||
        context.marketStatus,
    };
  }, [context, quotes, marketStatus]);
}
