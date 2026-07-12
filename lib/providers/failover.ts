/**
 * Provider failover chain for legacy consumers.
 * Production quotes use NSE → Yahoo → Finnhub only.
 */

import { createProviderByName } from "@/lib/providers/adapter-providers";
import type { LiveQuote, MarketDataProvider } from "@/lib/providers/types";
import type { ChartTimeframe } from "@/types";
import type { OhlcBar } from "@/lib/providers/types";

export interface FailoverResult<T> {
  data: T;
  provider: string;
  source: "live" | "cached" | "mock";
  attempted: string[];
}

function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === "development";
}

function buildQuoteChain(): MarketDataProvider[] {
  const chain: MarketDataProvider[] = [];

  const nse = createProviderByName("nse", "primary");
  if (nse?.isAvailable()) chain.push(nse);
  const yahoo = createProviderByName("yahoo", "secondary");
  if (yahoo?.isAvailable()) chain.push(yahoo);
  const finnhub = createProviderByName("finnhub", "secondary");
  if (finnhub?.isAvailable()) chain.push(finnhub);

  return chain;
}

async function buildOhlcChain(): Promise<MarketDataProvider[]> {
  const chain: MarketDataProvider[] = [];
  const polygon = createProviderByName("polygon", "primary");
  if (polygon?.isAvailable()) chain.push(polygon);
  const alphaVantage = createProviderByName("alphavantage", "secondary");
  if (alphaVantage?.isAvailable()) chain.push(alphaVantage);
  if (isDevelopmentMode()) {
    const { mockProvider } = await import("@/lib/providers/mock-provider");
    chain.push(mockProvider);
  }
  return chain;
}

async function executeWithFailover<T>(
  chain: MarketDataProvider[],
  operation: (provider: MarketDataProvider) => Promise<T>
): Promise<FailoverResult<T>> {
  const attempted: string[] = [];

  for (const provider of chain) {
    attempted.push(provider.name);
    try {
      const data = await operation(provider);
      return {
        data,
        provider: provider.name,
        source: provider.name === "Mock" ? "mock" : "live",
        attempted,
      };
    } catch {
      continue;
    }
  }

  throw new Error(
    `All providers failed (${attempted.join(" → ")}).`
  );
}

export async function fetchQuoteWithFailover(
  symbol: string
): Promise<FailoverResult<LiveQuote>> {
  return executeWithFailover(buildQuoteChain(), (p) => p.fetchQuote(symbol));
}

export async function fetchIndexWithFailover(
  indexSymbol: string
): Promise<FailoverResult<LiveQuote>> {
  return executeWithFailover(buildQuoteChain(), (p) => p.fetchIndex(indexSymbol));
}

export async function fetchOhlcWithFailover(
  symbol: string,
  timeframe: ChartTimeframe
): Promise<FailoverResult<OhlcBar[]>> {
  return executeWithFailover(await buildOhlcChain(), (p) =>
    p.fetchOhlc(symbol, timeframe)
  );
}

export function getActiveProviders(): {
  quote: string[];
  ohlc: string[];
} {
  return {
    quote: buildQuoteChain().map((p) => p.name),
    ohlc: [],
  };
}
