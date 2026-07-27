/**
 * Client-safe market-data surface.
 *
 * Do NOT re-export quote-store, quote-acquisition, failover, or MarketDataService
 * from this barrel — those pull node:fs and are server-only.
 *
 * Server code: import from `@/lib/market-data/server`.
 */

export type { QuoteResult } from "@/lib/market-data/quote-result";
export type { EnrichedQuote, QuoteAvailability } from "@/lib/market-data/enriched-quote";
export {
  toEnrichedQuote,
  createUnavailableQuote,
  buildInitialQuotesMap,
} from "@/lib/market-data/enriched-quote";

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
