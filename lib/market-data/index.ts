/**
 * Sprint 8A — Unified Live Market Data Architecture.
 * All market data consumption flows through MarketDataService.
 */

export {
  marketDataService,
  getQuote,
  getMarketData,
  getIndex,
  getQuotes,
  getEnrichedQuote,
  getEnrichedQuotes,
} from "@/lib/market-data/service";
export type { QuoteResult } from "@/lib/market-data/service";
export type { EnrichedQuote, QuoteAvailability } from "@/lib/market-data/enriched-quote";
export { toEnrichedQuote, createUnavailableQuote } from "@/lib/market-data/enriched-quote";
export type { OhlcResult } from "@/lib/market/ohlc-engine";

export type {
  MarketData,
  MarketDataResult,
  NormalizedSymbol,
  IMarketDataProvider,
  DataSource,
  ExchangeCode,
  SymbolFormat,
  IndexSymbol,
} from "@/lib/market-data/types";
export { INDEX_SYMBOLS } from "@/lib/market-data/types";

export {
  normalizeSymbol,
  toProviderFormat,
  isValidSymbol,
  stripExchangeSuffix,
  toYahooSymbol,
} from "@/lib/market-data/symbols";

export {
  liveQuoteToMarketData,
  marketDataToLiveQuote,
} from "@/lib/market-data/mappers";

export {
  fetchMarketDataWithFailover,
  fetchQuoteWithFailover,
  getActiveMarketDataProviders,
} from "@/lib/market-data/fallback";

export { freeProvider } from "@/lib/market-data/providers/free-provider";
