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
  volume?: number;
}

function resolveAvailability(source: DataSource, price: number | null): QuoteAvailability {
  if (!isValidMarketPrice(price)) return "unavailable";
  if (source === "live") return "live";
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
  const availability = resolveAvailability(result.source, price);
  const lastTradeTime = resolveLastTradeTime(data.fetchedAt, marketStatus);

  return {
    symbol: data.symbol,
    price,
    change: price !== null ? data.change : null,
    changePercent: price !== null ? data.changePercent : null,
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
    volume: data.volume,
  };
}

export function createUnavailableQuote(symbol: string, now = new Date()): EnrichedQuote {
  return toEnrichedQuote(symbol, null, now);
}

export function enrichedQuoteToJSON(quote: EnrichedQuote): EnrichedQuote {
  return { ...quote };
}
