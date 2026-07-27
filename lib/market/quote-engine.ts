/**
 * Thin quote helpers — server-only (delegates to MarketDataService).
 */

import "server-only";

import { marketDataService, type QuoteResult } from "@/lib/market-data/server";

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
