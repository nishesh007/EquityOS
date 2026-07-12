/**
 * Live quote engine — delegates to Sprint 8A MarketDataService.
 * UI and services must use this module, never adapters directly.
 */

import { marketDataService } from "@/lib/market-data";
import type { FailoverResult } from "@/lib/providers/failover";
import type { LiveQuote } from "@/lib/providers/types";

export type QuoteResult = FailoverResult<LiveQuote>;

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
