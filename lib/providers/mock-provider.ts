/**
 * Mock market data provider — development fallback.
 * Returns deterministic seed data so the UI never breaks.
 */

import type { ChartTimeframe, PricePoint } from "@/types";
import {
  buildMockOhlc,
  getMockQuote,
  type MockQuoteSeed,
} from "@/lib/providers/mock-data";
import type { LiveQuote, MarketDataProvider } from "@/lib/providers/types";

function seedToQuote(seed: MockQuoteSeed): LiveQuote {
  return {
    symbol: seed.symbol,
    ltp: seed.ltp,
    open: seed.open,
    high: seed.high,
    low: seed.low,
    previousClose: seed.previousClose,
    change: seed.change,
    changePercent: seed.changePercent,
    volume: seed.volume,
    deliveryPercent: seed.deliveryPercent,
    vwap: seed.vwap,
    marketCap: seed.marketCap,
    sector: seed.sector,
    industry: seed.industry,
    provider: "Mock",
    source: "mock",
    fetchedAt: new Date().toISOString(),
  };
}

export class MockProvider implements MarketDataProvider {
  readonly name = "Mock";
  readonly tier = "mock" as const;

  isAvailable(): boolean {
    return true;
  }

  async fetchQuote(symbol: string): Promise<LiveQuote> {
    const seed = getMockQuote(symbol);
    if (!seed) {
      throw new Error(`Mock provider: unknown symbol ${symbol}`);
    }
    return seedToQuote(seed);
  }

  async fetchIndex(indexSymbol: string): Promise<LiveQuote> {
    return this.fetchQuote(indexSymbol);
  }

  async fetchOhlc(symbol: string, timeframe: ChartTimeframe): Promise<PricePoint[]> {
    const seed = getMockQuote(symbol);
    if (!seed) {
      throw new Error(`Mock provider: unknown symbol ${symbol}`);
    }
    const history = buildMockOhlc(seed.ltp, seed.changePercent);
    return history[timeframe] ?? history["1D"];
  }
}

export const mockProvider = new MockProvider();
