/**
 * Sprint 9A.1 — Enriched quote model for live price display across EquityOS.
 */

import { formatISTDateTimeInline, formatISTTime } from "@/lib/market/format";
import {
  getLastSessionCloseISO,
  getMarketStatus,
  type MarketStatus,
} from "@/lib/market/session";
import { normalizeSymbol } from "@/lib/market-data/symbols";
import type { DataSource } from "@/lib/market-data/types";
import type { QuoteResult } from "@/lib/market-data/service";
import { isValidMarketPrice } from "@/lib/utils";

export type QuoteAvailability = "live" | "delayed" | "unavailable";

export interface EnrichedQuote {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  vwap: number | null;
  volume: number | null;
  deliveryPercent: number | null;
  weekHigh52: number | null;
  weekLow52: number | null;
  marketCap: string | null;
  exchange: "NSE" | "BSE" | "INDEX";
  marketStatus: MarketStatus;
  marketStatusLabel: string;
  lastTradeTime: string | null;
  lastTradeTimeIST: string | null;
  lastUpdated: string;
  lastUpdatedIST: string;
  lastSuccessfulUpdate: string | null;
  lastSuccessfulUpdateIST: string | null;
  availability: QuoteAvailability;
  provider: string;
  source: DataSource;
}

function resolveAvailability(
  source: DataSource,
  price: number | null,
  marketStatus: MarketStatus
): QuoteAvailability {
  if (!isValidMarketPrice(price)) return "unavailable";
  if (source === "live") return marketStatus === "open" ? "live" : "delayed";
  if (source === "cached") return "delayed";
  return "unavailable";
}

function resolveExchange(symbol: string): "NSE" | "BSE" | "INDEX" {
  const upper = symbol.toUpperCase();
  if (["NIFTY", "SENSEX", "BANKNIFTY", "INDIAVIX"].includes(upper)) {
    return "INDEX";
  }
  try {
    const normalized = normalizeSymbol(symbol);
    if (normalized.exchange === "BSE") return "BSE";
    if (normalized.exchange === "INDEX") return "INDEX";
    return "NSE";
  } catch {
    return "NSE";
  }
}

function resolveLastTradeTime(
  fetchedAt: string,
  marketStatus: MarketStatus
): string {
  if (marketStatus === "open" || marketStatus === "pre_open") {
    return fetchedAt;
  }
  return getLastSessionCloseISO();
}

export function toEnrichedQuote(
  symbol: string,
  result: QuoteResult | null,
  now = new Date()
): EnrichedQuote {
  const marketStatus = getMarketStatus(now);
  const exchange = resolveExchange(symbol);

  if (!result || result.source === "mock" || result.source === "unavailable") {
    const staleAt = result?.data?.fetchedAt ?? null;
    return {
      symbol: symbol.toUpperCase(),
      price: null,
      change: null,
      changePercent: null,
      open: null,
      high: null,
      low: null,
      previousClose: null,
      vwap: null,
      volume: null,
      deliveryPercent: null,
      weekHigh52: null,
      weekLow52: null,
      marketCap: null,
      exchange,
      marketStatus,
      marketStatusLabel: marketStatus === "open" ? "NSE" : exchange,
      lastTradeTime: null,
      lastTradeTimeIST: null,
      lastUpdated: now.toISOString(),
      lastUpdatedIST: formatISTDateTimeInline(now.toISOString()) ?? "",
      lastSuccessfulUpdate: staleAt,
      lastSuccessfulUpdateIST: formatISTTime(staleAt),
      availability: "unavailable",
      provider: result?.provider ?? "unavailable",
      source: "unavailable",
    };
  }

  const { data } = result;
  const price = isValidMarketPrice(data.ltp) ? data.ltp : null;
  const availability = resolveAvailability(result.source, price, marketStatus);
  const lastTradeTime = resolveLastTradeTime(data.fetchedAt, marketStatus);

  return {
    symbol: data.symbol,
    price,
    change: price !== null ? data.change : null,
    changePercent: price !== null ? data.changePercent : null,
    open: price !== null && Number.isFinite(data.open) ? data.open : null,
    high: price !== null && Number.isFinite(data.high) ? data.high : null,
    low: price !== null && Number.isFinite(data.low) ? data.low : null,
    previousClose:
      price !== null && Number.isFinite(data.previousClose)
        ? data.previousClose
        : null,
    vwap:
      price !== null && data.vwap !== undefined && Number.isFinite(data.vwap)
        ? data.vwap
        : null,
    volume:
      price !== null && Number.isFinite(data.volume) ? data.volume : null,
    deliveryPercent:
      price !== null &&
      data.deliveryPercent !== undefined &&
      Number.isFinite(data.deliveryPercent)
        ? data.deliveryPercent
        : null,
    weekHigh52:
      price !== null &&
      data.weekHigh52 !== undefined &&
      Number.isFinite(data.weekHigh52)
        ? data.weekHigh52
        : null,
    weekLow52:
      price !== null &&
      data.weekLow52 !== undefined &&
      Number.isFinite(data.weekLow52)
        ? data.weekLow52
        : null,
    marketCap: data.marketCap ?? null,
    exchange,
    marketStatus,
    marketStatusLabel: exchange,
    lastTradeTime,
    lastTradeTimeIST: formatISTDateTimeInline(lastTradeTime),
    lastUpdated: data.fetchedAt,
    lastUpdatedIST: formatISTDateTimeInline(data.fetchedAt) ?? "",
    lastSuccessfulUpdate: data.fetchedAt,
    lastSuccessfulUpdateIST: formatISTTime(data.fetchedAt),
    availability,
    provider: result.provider,
    source: result.source,
  };
}

export function createUnavailableQuote(symbol: string, now = new Date()): EnrichedQuote {
  return toEnrichedQuote(symbol, null, now);
}

export function buildInitialQuotesMap(
  items: Array<{ symbol: string; quote?: EnrichedQuote }>
): Record<string, EnrichedQuote> {
  const map: Record<string, EnrichedQuote> = {};
  for (const item of items) {
    if (item.quote) {
      map[item.symbol.toUpperCase()] = item.quote;
    }
  }
  return map;
}

export function enrichedQuoteToJSON(quote: EnrichedQuote): EnrichedQuote {
  return { ...quote };
}
