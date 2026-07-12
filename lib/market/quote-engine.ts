/**
 * Live quote engine — delegates to Sprint 8A MarketDataService.
 * UI and services must use this module, never adapters directly.
 */

import { marketDataService, type QuoteResult } from "@/lib/market-data";

export type { QuoteResult };

export async function getLiveQuote(symbol: string): Promise<QuoteResult> {
  return marketDataService.getQuote(symbol);
}

export async function getLiveIndex(indexSymbol: string): Promise<QuoteResult> {
  return marketDataService.getIndex(indexSymbol);
}

export async function getLiveQuotes(
  symbols: string[]
): Promise<Map<string, QuoteResult>> {
  return marketDataService.getQuotes(symbols);
}
