/**
 * Sprint 8A — Unified Market Data Service.
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
  fetchMarketDataWithFailover,
  fetchQuoteWithFailover,
  getActiveMarketDataProviders,
} from "@/lib/market-data/fallback";
import { marketDataToLiveQuote } from "@/lib/market-data/mappers";
import { normalizeSymbol, isValidSymbol } from "@/lib/market-data/symbols";
import type {
  MarketData,
  MarketDataResult,
  NormalizedSymbol,
} from "@/lib/market-data/types";
import { getOhlcCandles, type OhlcResult } from "@/lib/market/ohlc-engine";
import type { ChartTimeframe, PricePoint } from "@/types";
import type { LiveQuote } from "@/lib/providers/types";

export interface QuoteResult {
  data: LiveQuote;
  provider: string;
  source: "live" | "cached" | "mock";
  attempted: string[];
}

function toQuoteResult(result: MarketDataResult): QuoteResult {
  return {
    data: marketDataToLiveQuote(result.data),
    provider: result.provider,
    source: result.source === "unavailable" ? "mock" : result.source,
    attempted: result.attempted,
  };
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
        ttlMs: CACHE_TTL.QUOTE,
      },
      () => fetchQuoteWithFailover(normalized.internal)
    );
    return toQuoteResult(result);
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

  /** Index quote (NIFTY, SENSEX, BANKNIFTY, INDIAVIX) */
  async getIndex(indexSymbol: string): Promise<QuoteResult> {
    const normalized = indexSymbol.toUpperCase();
    const result = await getCached(
      {
        key: cacheKey("index", normalized),
        ttlMs: CACHE_TTL.QUOTE,
      },
      () => fetchQuoteWithFailover(normalized)
    );
    return toQuoteResult(result);
  }

  /** Batch quotes for multiple symbols */
  async getQuotes(symbols: string[]): Promise<Map<string, QuoteResult>> {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const result = await this.getQuote(symbol);
        return [normalizeSymbol(symbol).internal, result] as const;
      })
    );
    return new Map(results);
  }

  /** Batch full market data */
  async getMarketDataBatch(
    symbols: string[]
  ): Promise<Map<string, MarketDataResult>> {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const result = await this.getMarketData(symbol);
        return [normalizeSymbol(symbol).internal, result] as const;
      })
    );
    return new Map(results);
  }

  /** Graceful stale read — never throws */
  async getQuoteSafe(symbol: string): Promise<LiveQuote | null> {
    try {
      const result = await this.getQuote(symbol);
      return result.data;
    } catch {
      const normalized = normalizeSymbol(symbol);
      const stale = getStaleCachedSync<MarketDataResult>(
        cacheKey("market-data", normalized.internal)
      );
      if (stale) return marketDataToLiveQuote(stale.data);
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
  ): Promise<PricePoint[]> {
    const result = await this.getOhlcCandles(symbol, timeframe);
    return result.data;
  }

  /** Active provider chain for diagnostics */
  getActiveProviders(): string[] {
    return getActiveMarketDataProviders();
  }
}

/** Singleton — all services must use this instance */
export const marketDataService = new MarketDataServiceImpl();

// Named exports for convenience
export const getQuote = marketDataService.getQuote.bind(marketDataService);
export const getMarketData = marketDataService.getMarketData.bind(marketDataService);
export const getIndex = marketDataService.getIndex.bind(marketDataService);
export const getQuotes = marketDataService.getQuotes.bind(marketDataService);
