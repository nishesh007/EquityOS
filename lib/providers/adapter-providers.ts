/**
 * Adapter-backed market data providers.
 * Wraps low-level adapters into the unified MarketDataProvider interface.
 */

import type { ChartTimeframe, PricePoint } from "@/types";
import { nseAdapter, type NSEQuoteResult } from "@/lib/adapters/nse";
import { bseAdapter, type BSEQuoteResult } from "@/lib/adapters/bse";
import { finnhubAdapter, type FinnhubQuoteResult } from "@/lib/adapters/finnhub";
import { polygonAdapter } from "@/lib/adapters/polygon";
import { alphaVantageAdapter } from "@/lib/adapters/alphavantage";
import type { LiveQuote, MarketDataProvider, ProviderTier } from "@/lib/providers/types";

function nseToQuote(result: NSEQuoteResult): LiveQuote {
  return {
    symbol: result.symbol,
    ltp: result.price,
    open: result.open,
    high: result.high,
    low: result.low,
    previousClose: result.previousClose,
    change: result.change,
    changePercent: result.changePercent,
    volume: result.volume,
    deliveryPercent: result.deliveryPercent,
    vwap: result.vwap,
    provider: "NSE",
    source: "live",
    fetchedAt: new Date().toISOString(),
  };
}

function bseToQuote(result: BSEQuoteResult): LiveQuote {
  return {
    symbol: result.symbol,
    ltp: result.price,
    open: result.open,
    high: result.high,
    low: result.low,
    previousClose: result.previousClose,
    change: result.change,
    changePercent: result.changePercent,
    volume: result.volume,
    provider: "BSE",
    source: "live",
    fetchedAt: new Date().toISOString(),
  };
}

function finnhubToQuote(result: FinnhubQuoteResult): LiveQuote {
  return {
    symbol: result.symbol,
    ltp: result.currentPrice,
    open: result.open,
    high: result.high,
    low: result.low,
    previousClose: result.previousClose,
    change: result.change,
    changePercent: result.percentChange,
    volume: 0,
    provider: "Finnhub",
    source: "live",
    fetchedAt: new Date().toISOString(),
  };
}

export class NSEProvider implements MarketDataProvider {
  readonly name = "NSE";
  readonly tier: ProviderTier;

  constructor(tier: ProviderTier = "primary") {
    this.tier = tier;
  }

  isAvailable(): boolean {
    return nseAdapter.status === "ready";
  }

  async fetchQuote(symbol: string): Promise<LiveQuote> {
    const result = await nseAdapter.fetch({ symbol });
    return nseToQuote(result);
  }

  async fetchIndex(indexSymbol: string): Promise<LiveQuote> {
    return this.fetchQuote(indexSymbol);
  }

  async fetchOhlc(_symbol: string, _timeframe: ChartTimeframe): Promise<PricePoint[]> {
    throw new Error("NSE provider does not serve OHLC — use Polygon or mock fallback");
  }
}

export class BSEProvider implements MarketDataProvider {
  readonly name = "BSE";
  readonly tier: ProviderTier;

  constructor(tier: ProviderTier = "secondary") {
    this.tier = tier;
  }

  isAvailable(): boolean {
    return bseAdapter.status === "ready";
  }

  async fetchQuote(symbol: string): Promise<LiveQuote> {
    const result = await bseAdapter.fetch({ symbol });
    return bseToQuote(result);
  }

  async fetchIndex(_indexSymbol: string): Promise<LiveQuote> {
    throw new Error("BSE provider does not serve index quotes");
  }

  async fetchOhlc(_symbol: string, _timeframe: ChartTimeframe): Promise<PricePoint[]> {
    throw new Error("BSE provider does not serve OHLC");
  }
}

export class FinnhubProvider implements MarketDataProvider {
  readonly name = "Finnhub";
  readonly tier: ProviderTier;

  constructor(tier: ProviderTier = "secondary") {
    this.tier = tier;
  }

  isAvailable(): boolean {
    return finnhubAdapter.status === "ready";
  }

  async fetchQuote(symbol: string): Promise<LiveQuote> {
    const result = await finnhubAdapter.fetch({ symbol });
    return finnhubToQuote(result);
  }

  async fetchIndex(indexSymbol: string): Promise<LiveQuote> {
    return this.fetchQuote(indexSymbol);
  }

  async fetchOhlc(_symbol: string, _timeframe: ChartTimeframe): Promise<PricePoint[]> {
    throw new Error("Finnhub provider does not serve OHLC in this tier");
  }
}

export class PolygonOhlcProvider implements MarketDataProvider {
  readonly name = "Polygon";
  readonly tier: ProviderTier = "primary";

  isAvailable(): boolean {
    return polygonAdapter.status === "ready";
  }

  async fetchQuote(_symbol: string): Promise<LiveQuote> {
    throw new Error("Polygon provider serves OHLC only");
  }

  async fetchIndex(_indexSymbol: string): Promise<LiveQuote> {
    throw new Error("Polygon provider serves OHLC only");
  }

  async fetchOhlc(symbol: string, timeframe: ChartTimeframe): Promise<PricePoint[]> {
    const result = await polygonAdapter.fetch({
      symbol,
      endpoint: "aggregates",
      timeframe,
    });
    return (result.data.bars as PricePoint[]) ?? [];
  }
}

export class AlphaVantageOhlcProvider implements MarketDataProvider {
  readonly name = "AlphaVantage";
  readonly tier: ProviderTier = "secondary";

  isAvailable(): boolean {
    return alphaVantageAdapter.status === "ready";
  }

  async fetchQuote(_symbol: string): Promise<LiveQuote> {
    throw new Error("Alpha Vantage provider serves OHLC only");
  }

  async fetchIndex(_indexSymbol: string): Promise<LiveQuote> {
    throw new Error("Alpha Vantage provider serves OHLC only");
  }

  async fetchOhlc(symbol: string, timeframe: ChartTimeframe): Promise<PricePoint[]> {
    const result = await alphaVantageAdapter.fetch({
      symbol,
      function: "TIME_SERIES_DAILY",
      timeframe,
    });
    return (result.data.bars as PricePoint[]) ?? [];
  }
}

export function createProviderByName(
  name: string,
  tier: ProviderTier
): MarketDataProvider | null {
  switch (name.toLowerCase()) {
    case "nse":
      return new NSEProvider(tier);
    case "bse":
      return new BSEProvider(tier);
    case "finnhub":
      return new FinnhubProvider(tier);
    case "polygon":
      return new PolygonOhlcProvider();
    case "alphavantage":
    case "alpha_vantage":
      return new AlphaVantageOhlcProvider();
    case "mock":
      return null;
    default:
      return null;
  }
}
