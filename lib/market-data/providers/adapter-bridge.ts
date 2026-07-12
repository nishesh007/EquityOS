/**
 * Sprint 8A — Bridge legacy adapter-backed providers to the unified IMarketDataProvider interface.
 */

import { createProviderByName } from "@/lib/providers/adapter-providers";
import type { MarketDataProvider, ProviderTier } from "@/lib/providers/types";
import { liveQuoteToMarketData } from "@/lib/market-data/mappers";
import { normalizeSymbol } from "@/lib/market-data/symbols";
import type { IMarketDataProvider, MarketData, NormalizedSymbol } from "@/lib/market-data/types";

/** Wraps a legacy MarketDataProvider into the Sprint 8A interface */
export class AdapterBridgeProvider implements IMarketDataProvider {
  readonly name: string;
  private readonly legacy: MarketDataProvider;

  constructor(legacy: MarketDataProvider) {
    this.legacy = legacy;
    this.name = legacy.name;
  }

  isAvailable(): boolean {
    return this.legacy.isAvailable();
  }

  normalizeSymbol(symbol: string): NormalizedSymbol {
    return normalizeSymbol(symbol);
  }

  async getQuote(symbol: string): Promise<MarketData> {
    return this.getMarketData(symbol);
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    const normalized = normalizeSymbol(symbol);
    const quote = await this.legacy.fetchQuote(normalized.internal);
    return liveQuoteToMarketData(quote);
  }
}

export function createBridgeProvider(
  name: string,
  tier: ProviderTier
): IMarketDataProvider | null {
  const legacy = createProviderByName(name, tier);
  if (!legacy) return null;
  return new AdapterBridgeProvider(legacy);
}
