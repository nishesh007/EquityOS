/**
 * Sprint 9A.1 — Unified Market Data Service.
 * Single entry point for all market data consumption across EquityOS.
 *
 * Architecture:
 *   UI → Services → MarketDataService → Provider Adapter → Provider
 */

import {
  CACHE_TTL,
  cacheKey,
  getCached,
  getStaleCachedSync,
} from "@/lib/cache";
import {
  fetchIndexWithFailover,
  fetchMarketDataWithFailover,
  fetchQuoteWithFailover,
  getActiveMarketDataProviders,
  getProductionProviderChain,
} from "@/lib/market-data/fallback";
import { getProviderHealth } from "@/lib/market-data/provider-health";
import {
  toEnrichedQuote,
  type EnrichedQuote,
} from "@/lib/market-data/enriched-quote";
import { marketDataToLiveQuote } from "@/lib/market-data/mappers";
import { isIndexSymbol, normalizeSymbol, isValidSymbol } from "@/lib/market-data/symbols";
import { getQuoteCacheTtlMs } from "@/lib/market/session";
import type {
  MarketDataResult,
  NormalizedSymbol,
} from "@/lib/market-data/types";
import type { ProviderHealth } from "@/lib/market-data/provider-health";
import { getOhlcCandles, type OhlcResult } from "@/lib/market/ohlc-engine";
import type { ChartTimeframe } from "@/types";
import type { LiveQuote } from "@/lib/providers/types";
import type { OhlcBar } from "@/lib/providers/types";

export interface QuoteResult {
  data: LiveQuote;
  provider: string;
  source: "live" | "cached" | "mock" | "unavailable";
  attempted: string[];
}

function toQuoteResult(result: MarketDataResult): QuoteResult {
  return {
    data: marketDataToLiveQuote(result.data),
    provider: result.provider,
    source: result.source,
    attempted: result.attempted,
  };
}

function unavailableQuoteResult(symbol: string, attempted: string[] = []): QuoteResult {
  const normalized = normalizeSymbol(symbol);
  const now = new Date().toISOString();
  return {
    data: {
      symbol: normalized.internal,
      ltp: 0,
      open: 0,
      high: 0,
      low: 0,
      previousClose: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      provider: "unavailable",
      source: "unavailable",
      fetchedAt: now,
    },
    provider: "unavailable",
    source: "unavailable",
    attempted,
  };
}

function rejectMockQuote(symbol: string, result: QuoteResult): QuoteResult {
  if (result.source !== "mock") return result;
  return unavailableQuoteResult(symbol, result.attempted);
}

class MarketDataServiceImpl {
  /** Normalize any supported symbol format to canonical internal representation */
  normalizeSymbol(symbol: string): NormalizedSymbol {
    return normalizeSymbol(symbol);
  }

  isValidSymbol(symbol: string): boolean {
    return isValidSymbol(symbol);
  }

  /** Lightweight quote — maps to legacy LiveQuote for backward compatibility */
  async getQuote(symbol: string): Promise<QuoteResult> {
    const normalized = normalizeSymbol(symbol);
    const result = await getCached(
      {
        key: cacheKey("quote", normalized.internal),
        ttlMs: getQuoteCacheTtlMs(),
      },
      () => fetchQuoteWithFailover(normalized.internal)
    );
    return rejectMockQuote(normalized.internal, toQuoteResult(result));
  }

  /** Enriched quote with exchange, market status, and IST timestamps */
  async getEnrichedQuote(symbol: string): Promise<EnrichedQuote> {
    const result = await this.getQuote(symbol);
    return toEnrichedQuote(symbol, result);
  }

  /** Full market data model with valuation, quality, and risk fields */
  async getMarketData(symbol: string): Promise<MarketDataResult> {
    const normalized = normalizeSymbol(symbol);
    return getCached(
      {
        key: cacheKey("market-data", normalized.internal),
        ttlMs: CACHE_TTL.MARKET_DATA,
      },
      () => fetchMarketDataWithFailover(normalized.internal)
    );
  }

  /** Index quote (NIFTY, SENSEX, BANKNIFTY, INDIAVIX) — separate cache namespace from equities */
  async getIndex(indexSymbol: string): Promise<QuoteResult> {
    const normalized = indexSymbol.toUpperCase();
    const result = await getCached(
      {
        key: cacheKey("index", normalized),
        ttlMs: getQuoteCacheTtlMs(),
      },
      () => fetchIndexWithFailover(normalized)
    );
    return rejectMockQuote(normalized, toQuoteResult(result));
  }

  /** Enriched index quote */
  async getEnrichedIndex(indexSymbol: string): Promise<EnrichedQuote> {
    const result = await this.getIndex(indexSymbol);
    return toEnrichedQuote(indexSymbol, result);
  }

  /** Batch quotes for multiple symbols */
  async getQuotes(symbols: string[]): Promise<Map<string, QuoteResult>> {
    const normalizedSymbols = [
      ...new Set(symbols.map((symbol) => normalizeSymbol(symbol).internal)),
    ];
    const results = await Promise.all(
      normalizedSymbols.map(async (symbol) => {
        const result = isIndexSymbol(symbol)
          ? await this.getIndex(symbol)
          : await this.getQuote(symbol);
        return [symbol, result] as const;
      })
    );
    return new Map(results);
  }

  /** Batch enriched quotes — indices use the dedicated index pipeline */
  async getEnrichedQuotes(symbols: string[]): Promise<Map<string, EnrichedQuote>> {
    const normalizedSymbols = [
      ...new Set(symbols.map((symbol) => normalizeSymbol(symbol).internal)),
    ];
    const results = await Promise.all(
      normalizedSymbols.map(async (symbol) => {
        const enriched = isIndexSymbol(symbol)
          ? await this.getEnrichedIndex(symbol)
          : await this.getEnrichedQuote(symbol);
        return [symbol, enriched] as const;
      })
    );
    return new Map(results);
  }

  /** Batch full market data */
  async getMarketDataBatch(
    symbols: string[]
  ): Promise<Map<string, MarketDataResult>> {
    const normalizedSymbols = [
      ...new Set(symbols.map((symbol) => normalizeSymbol(symbol).internal)),
    ];
    const results = await Promise.all(
      normalizedSymbols.map(async (symbol) => {
        const result = await this.getMarketData(symbol);
        return [symbol, result] as const;
      })
    );
    return new Map(results);
  }

  /** Graceful stale read — never throws; returns null when no live data */
  async getQuoteSafe(symbol: string): Promise<LiveQuote | null> {
    try {
      const result = isIndexSymbol(symbol)
        ? await this.getIndex(symbol)
        : await this.getQuote(symbol);
      if (result.source === "unavailable" || result.source === "mock") {
        const normalized = normalizeSymbol(symbol);
        const staleKey = isIndexSymbol(symbol)
          ? cacheKey("index", normalized.internal)
          : cacheKey("market-data", normalized.internal);
        const stale = getStaleCachedSync<MarketDataResult>(staleKey);
        if (stale && stale.source !== "mock" && stale.source !== "unavailable") {
          return marketDataToLiveQuote(stale.data);
        }
        return null;
      }
      return result.data;
    } catch {
      const normalized = normalizeSymbol(symbol);
      const staleKey = isIndexSymbol(symbol)
        ? cacheKey("index", normalized.internal)
        : cacheKey("market-data", normalized.internal);
      const stale = getStaleCachedSync<MarketDataResult>(staleKey);
      if (stale && stale.source !== "mock" && stale.source !== "unavailable") {
        return marketDataToLiveQuote(stale.data);
      }
      return null;
    }
  }

  /** Historical OHLCV candles — reuses Sprint 8A cache via ohlc-engine */
  async getOhlcCandles(
    symbol: string,
    timeframe: ChartTimeframe = "1Y"
  ): Promise<OhlcResult> {
    const normalized = normalizeSymbol(symbol);
    return getOhlcCandles(normalized.internal, timeframe);
  }

  /** Convenience accessor for candle close series */
  async getPriceHistory(
    symbol: string,
    timeframe: ChartTimeframe = "1Y"
  ): Promise<OhlcBar[]> {
    const result = await this.getOhlcCandles(symbol, timeframe);
    return result.data;
  }

  /** Active provider chain for diagnostics */
  getActiveProviders(): string[] {
    return getActiveMarketDataProviders();
  }

  getProviderChain(): string[] {
    return getProductionProviderChain();
  }

  getProviderHealth(): ProviderHealth[] {
    return getProviderHealth();
  }
}

/** Singleton — all services must use this instance */
export const marketDataService = new MarketDataServiceImpl();

// Named exports for convenience
export const getQuote = marketDataService.getQuote.bind(marketDataService);
export const getMarketData = marketDataService.getMarketData.bind(marketDataService);
export const getIndex = marketDataService.getIndex.bind(marketDataService);
export const getQuotes = marketDataService.getQuotes.bind(marketDataService);
export const getEnrichedQuote = marketDataService.getEnrichedQuote.bind(marketDataService);
export const getEnrichedQuotes = marketDataService.getEnrichedQuotes.bind(marketDataService);
export const getProviderChain = marketDataService.getProviderChain.bind(marketDataService);
export const getMarketDataProviderHealth = marketDataService.getProviderHealth.bind(marketDataService);
