/**
 * Sprint 8A — Symbol normalization across all supported exchange formats.
 * Accepts NSE, BSE, Yahoo, AlphaVantage, Finnhub, and internal symbols.
 */

import { getNseSymbolMeta } from "@/lib/fundamentals/nse-registry";
import {
  isValidNseSymbol,
  normalizeNseSymbol,
  resolveMarketDataSymbol,
  toAlphaVantageSymbol,
  toFinnhubNseSymbol,
  toFmpSymbol,
} from "@/lib/fundamentals/symbols";
import type { ExchangeCode, NormalizedSymbol, SymbolFormat } from "@/lib/market-data/types";

const INDEX_SYMBOLS = new Set(["NIFTY", "SENSEX", "BANKNIFTY", "INDIAVIX"]);

/** BSE scrip suffix patterns */
const BSE_SUFFIX = /\.BO$/i;
const NSE_SUFFIX = /\.NS$/i;
const YAHOO_SUFFIX = /\.(NS|BO)$/i;

/** Yahoo Finance ticker for Indian equities */
export function toYahooSymbol(symbol: string): string {
  const normalized = resolveMarketDataSymbol(stripExchangeSuffix(symbol));
  if (INDEX_SYMBOLS.has(normalized)) {
    if (normalized === "NIFTY") return "^NSEI";
    if (normalized === "SENSEX") return "^BSESN";
    if (normalized === "BANKNIFTY") return "^NSEBANK";
    if (normalized === "INDIAVIX") return "^INDIAVIX";
  }
  if (normalized.endsWith(".BO")) return normalized;
  if (normalized.endsWith(".NS")) return normalized;
  return `${normalized}.NS`;
}

/** TwelveData format */
export function toTwelveDataSymbol(symbol: string): string {
  const normalized = normalizeNseSymbol(stripExchangeSuffix(symbol));
  if (INDEX_SYMBOLS.has(normalized)) return normalized;
  return `${normalized}:NSE`;
}

/** Upstox / Zerodha instrument format */
export function toUpstoxSymbol(symbol: string): string {
  const normalized = normalizeNseSymbol(stripExchangeSuffix(symbol));
  return `NSE_EQ|${normalized}`;
}

export function toZerodhaSymbol(symbol: string): string {
  const normalized = normalizeNseSymbol(stripExchangeSuffix(symbol));
  return `NSE:${normalized}`;
}

/** Strip known exchange suffixes to get bare ticker */
export function stripExchangeSuffix(symbol: string): string {
  return symbol
    .trim()
    .toUpperCase()
    .replace(BSE_SUFFIX, "")
    .replace(NSE_SUFFIX, "")
    .replace(/^NSE:/, "")
    .replace(/^BSE:/, "")
    .replace(/^NSE_EQ\|/, "");
}

function detectExchange(internal: string): ExchangeCode {
  if (INDEX_SYMBOLS.has(internal)) return "INDEX";
  return "NSE";
}

function buildFormats(internal: string): Record<SymbolFormat, string> {
  return {
    internal,
    nse: internal,
    bse: `${internal}.BO`,
    yahoo: toYahooSymbol(internal),
    alphavantage: toAlphaVantageSymbol(internal),
    finnhub: toFinnhubNseSymbol(internal),
    polygon: toFinnhubNseSymbol(internal),
    twelvedata: toTwelveDataSymbol(internal),
    upstox: toUpstoxSymbol(internal),
    zerodha: toZerodhaSymbol(internal),
  };
}

/**
 * Normalize any supported symbol format to canonical internal representation.
 * Supports: NSE, BSE, Yahoo, AlphaVantage, Finnhub, Upstox, Zerodha, internal.
 */
export function normalizeSymbol(input: string): NormalizedSymbol {
  const stripped = stripExchangeSuffix(input);
  const internal = normalizeNseSymbol(stripped);
  const meta = getNseSymbolMeta(internal);

  return {
    internal,
    exchange: detectExchange(internal),
    currency: "INR",
    companyName: meta?.name,
    formats: buildFormats(internal),
  };
}

/** Convert internal symbol to a specific provider format */
export function toProviderFormat(
  symbol: string,
  format: SymbolFormat
): string {
  const normalized = normalizeSymbol(symbol);
  return normalized.formats[format];
}

export function isValidSymbol(symbol: string): boolean {
  const { internal, exchange } = normalizeSymbol(symbol);
  if (exchange === "INDEX") return INDEX_SYMBOLS.has(internal);
  return isValidNseSymbol(internal);
}

/** Re-export FMP helper for adapter compatibility */
export { toFmpSymbol };
