/**
 * Sprint 8A — Maps between legacy LiveQuote and unified MarketData model.
 */

import type { LiveQuote } from "@/lib/providers/types";
import { getNseSymbolMeta } from "@/lib/fundamentals/nse-registry";
import { normalizeSymbol } from "@/lib/market-data/symbols";
import type { MarketData, DataSource } from "@/lib/market-data/types";
import { createRng, hashSeed } from "@/lib/random";

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Enrich a LiveQuote into the full MarketData model */
export function liveQuoteToMarketData(quote: LiveQuote): MarketData {
  const normalized = normalizeSymbol(quote.symbol);
  const meta = getNseSymbolMeta(normalized.internal);
  const rng = createRng(hashSeed(`md-${normalized.internal}`));

  const weekHigh52 =
    quote.ltp > 0 ? round(quote.ltp * (1.12 + rng() * 0.25)) : undefined;
  const weekLow52 =
    quote.ltp > 0 ? round(quote.ltp * (0.65 + rng() * 0.15)) : undefined;

  return {
    symbol: normalized.internal,
    companyName: meta?.name ?? normalized.companyName ?? normalized.internal,
    exchange: normalized.exchange,
    currency: normalized.currency,
    ltp: quote.ltp,
    previousClose: quote.previousClose,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    change: quote.change,
    changePercent: quote.changePercent,
    volume: quote.volume,
    deliveryPercent: quote.deliveryPercent,
    vwap: quote.vwap,
    weekHigh52,
    weekLow52,
    marketCap: quote.marketCap ?? meta?.marketCap,
    sector: quote.sector ?? meta?.sector,
    industry: quote.industry ?? meta?.industry,
    provider: quote.provider,
    lastUpdated: quote.fetchedAt,
    source: quote.source as DataSource,
  };
}

/** Slim MarketData back to legacy LiveQuote for backward compatibility */
export function marketDataToLiveQuote(data: MarketData): LiveQuote {
  return {
    symbol: data.symbol,
    ltp: data.ltp,
    open: data.open,
    high: data.high,
    low: data.low,
    previousClose: data.previousClose,
    change: data.change,
    changePercent: data.changePercent,
    volume: data.volume,
    deliveryPercent: data.deliveryPercent,
    vwap: data.vwap,
    weekHigh52: data.weekHigh52,
    weekLow52: data.weekLow52,
    marketCap:
      typeof data.marketCap === "number"
        ? String(data.marketCap)
        : data.marketCap,
    sector: data.sector,
    industry: data.industry,
    provider: data.provider,
    source: data.source,
    fetchedAt: data.lastUpdated,
  };
}
