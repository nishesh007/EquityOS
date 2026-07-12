/**
 * Sprint 8A — Free Provider (default).
 * Deterministic seed data — no API keys required.
 * Future paid providers plug in alongside this without UI changes.
 */

import { getMockQuote } from "@/lib/providers/mock-data";
import { liveQuoteToMarketData } from "@/lib/market-data/mappers";
import { normalizeSymbol } from "@/lib/market-data/symbols";
import type { IMarketDataProvider, MarketData, NormalizedSymbol } from "@/lib/market-data/types";
import { mockProvider } from "@/lib/providers/mock-provider";
import { createRng, hashSeed } from "@/lib/random";

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function enrichMarketData(base: MarketData): MarketData {
  const rng = createRng(hashSeed(`free-${base.symbol}`));

  return {
    ...base,
    weekHigh52: base.weekHigh52 ?? round(base.ltp * (1.12 + rng() * 0.25)),
    weekLow52: base.weekLow52 ?? round(base.ltp * (0.65 + rng() * 0.15)),
    pe: base.pe ?? round(12 + rng() * 30, 1),
    pb: base.pb ?? round(1 + rng() * 8, 1),
    dividendYield: base.dividendYield ?? round(rng() * 2.5, 2),
    roe: base.roe ?? round(8 + rng() * 22, 1),
    roce: base.roce ?? round(10 + rng() * 20, 1),
    eps: base.eps ?? round(base.ltp / (12 + rng() * 20), 2),
    beta: base.beta ?? round(0.6 + rng() * 1.2, 2),
    enterpriseValue: base.enterpriseValue ?? base.marketCap,
    provider: "Free",
    source: "mock",
  };
}

export class FreeProvider implements IMarketDataProvider {
  readonly name = "Free";

  isAvailable(): boolean {
    return true;
  }

  normalizeSymbol(symbol: string): NormalizedSymbol {
    return normalizeSymbol(symbol);
  }

  async getQuote(symbol: string): Promise<MarketData> {
    return this.getMarketData(symbol);
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    const normalized = normalizeSymbol(symbol);

    // Prefer mock seed when available
    const seed = getMockQuote(normalized.internal);
    if (seed) {
      const quote = await mockProvider.fetchQuote(normalized.internal);
      return enrichMarketData(liveQuoteToMarketData(quote));
    }

    // Synthesize for unknown valid symbols
    const quote = await mockProvider.fetchQuote(normalized.internal);
    return enrichMarketData(liveQuoteToMarketData(quote));
  }
}

export const freeProvider = new FreeProvider();
