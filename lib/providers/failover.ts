/**
 * Provider failover chain: Primary → Secondary → Mock.
 * Ensures the UI always receives data without runtime errors.
 */

import { loadProviderConfig } from "@/lib/providers/config";
import { mockProvider } from "@/lib/providers/mock-provider";
import { createProviderByName } from "@/lib/providers/adapter-providers";
import type { LiveQuote, MarketDataProvider } from "@/lib/providers/types";
import type { ChartTimeframe, PricePoint } from "@/types";

export interface FailoverResult<T> {
  data: T;
  provider: string;
  source: "live" | "cached" | "mock";
  attempted: string[];
}

function buildQuoteChain(): MarketDataProvider[] {
  const config = loadProviderConfig();
  const chain: MarketDataProvider[] = [];

  const primary = createProviderByName(config.primary, "primary");
  if (primary?.isAvailable()) chain.push(primary);

  const secondary = createProviderByName(config.secondary, "secondary");
  if (secondary?.isAvailable() && secondary.name !== primary?.name) {
    chain.push(secondary);
  }

  // BSE as automatic tertiary for NSE stocks when enabled
  if (config.primary === "nse" && config.bse.enabled) {
    const bse = createProviderByName("bse", "secondary");
    if (bse?.isAvailable() && !chain.some((p) => p.name === "BSE")) {
      chain.push(bse);
    }
  }

  chain.push(mockProvider);
  return chain;
}

function buildOhlcChain(): MarketDataProvider[] {
  const chain: MarketDataProvider[] = [];
  const polygon = createProviderByName("polygon", "primary");
  if (polygon?.isAvailable()) chain.push(polygon);
  const alphaVantage = createProviderByName("alphavantage", "secondary");
  if (alphaVantage?.isAvailable()) chain.push(alphaVantage);
  chain.push(mockProvider);
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
    `All providers failed (${attempted.join(" → ")}). This should not happen — mock is terminal.`
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
): Promise<FailoverResult<PricePoint[]>> {
  return executeWithFailover(buildOhlcChain(), (p) =>
    p.fetchOhlc(symbol, timeframe)
  );
}

export function getActiveProviders(): {
  quote: string[];
  ohlc: string[];
} {
  return {
    quote: buildQuoteChain().map((p) => p.name),
    ohlc: buildOhlcChain().map((p) => p.name),
  };
}
