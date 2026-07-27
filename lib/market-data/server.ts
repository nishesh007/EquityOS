/**
 * Server-only market-data surface.
 * Safe for Route Handlers, Server Components, Server Actions, and backend services.
 * Never import this module from Client Components.
 */

import "server-only";

export {
  marketDataService,
  getQuote,
  getMarketData,
  getIndex,
  getQuotes,
  getEnrichedQuote,
  getEnrichedQuotes,
  getProviderChain,
  getMarketDataProviderHealth,
} from "@/lib/market-data/service";
export type { QuoteResult } from "@/lib/market-data/quote-result";

export {
  fetchMarketDataWithFailover,
  fetchIndexWithFailover,
  fetchQuoteWithFailover,
  getProductionProviderChain,
  getActiveMarketDataProviders,
} from "@/lib/market-data/fallback";

export { getProviderHealth } from "@/lib/market-data/provider-health";
export type { ProviderHealth } from "@/lib/market-data/provider-health";

export {
  acquireQuotes,
  getQuoteMaxAgeMs,
  printQuoteFreshnessStats,
  getQuoteAcquisitionPipeline,
} from "@/lib/market-data/quote-acquisition";
export type {
  AcquiredQuote,
  QuoteFreshnessStats,
  QuoteAcquisitionResult,
} from "@/lib/market-data/quote-acquisition";

export {
  saveSuccessfulQuote,
  getStoredQuote,
  flushQuoteStore,
} from "@/lib/market-data/quote-store";
export type { StoredQuote } from "@/lib/market-data/quote-store";

// Client-safe types/helpers remain available via the parent barrel for convenience
// in server modules that already import from this entry.
export type { EnrichedQuote, QuoteAvailability } from "@/lib/market-data/enriched-quote";
export {
  toEnrichedQuote,
  createUnavailableQuote,
  buildInitialQuotesMap,
} from "@/lib/market-data/enriched-quote";
