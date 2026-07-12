/**
 * Sprint 8A — Provider fallback engine with cache degradation.
 * Provider A → Provider B → Free Provider → Cached data → Never crash UI.
 */

import { loadProviderConfig } from "@/lib/providers/config";
import { cacheKey, getStaleCachedSync } from "@/lib/cache";
import { createBridgeProvider } from "@/lib/market-data/providers/adapter-bridge";
import { freeProvider } from "@/lib/market-data/providers/free-provider";
import { normalizeSymbol } from "@/lib/market-data/symbols";
import type {
  IMarketDataProvider,
  MarketData,
  MarketDataResult,
} from "@/lib/market-data/types";

function buildProviderChain(includeFree = true): IMarketDataProvider[] {
  const config = loadProviderConfig();
  const chain: IMarketDataProvider[] = [];

  const primary = createBridgeProvider(config.primary, "primary");
  if (primary?.isAvailable()) chain.push(primary);

  const secondary = createBridgeProvider(config.secondary, "secondary");
  if (secondary?.isAvailable() && secondary.name !== primary?.name) {
    chain.push(secondary);
  }

  if (config.primary === "nse" && config.bse.enabled) {
    const bse = createBridgeProvider("bse", "secondary");
    if (bse?.isAvailable() && !chain.some((p) => p.name === "BSE")) {
      chain.push(bse);
    }
  }

  if (includeFree) {
    chain.push(freeProvider);
  }
  return chain;
}

function buildUnavailableMarketData(symbol: string): MarketData {
  const normalized = normalizeSymbol(symbol);
  const now = new Date().toISOString();
  return {
    symbol: normalized.internal,
    companyName: normalized.companyName ?? normalized.internal,
    exchange: normalized.exchange,
    currency: normalized.currency,
    ltp: 0,
    previousClose: 0,
    open: 0,
    high: 0,
    low: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    provider: "unavailable",
    lastUpdated: now,
    source: "unavailable",
  };
}

async function executeWithFailover(
  symbol: string,
  operation: (provider: IMarketDataProvider) => Promise<MarketData>,
  options: { allowMock?: boolean } = {}
): Promise<MarketDataResult> {
  const { allowMock = true } = options;
  const normalized = normalizeSymbol(symbol);
  const cacheKeyStr = cacheKey("market-data", normalized.internal);
  const chain = buildProviderChain(allowMock);
  const attempted: string[] = [];

  for (const provider of chain) {
    attempted.push(provider.name);
    try {
      const data = await operation(provider);
      return {
        data,
        provider: provider.name,
        source: provider.name === "Free" ? "mock" : "live",
        attempted,
      };
    } catch {
      continue;
    }
  }

  // All providers failed — return stale cached data
  const stale = getStaleCachedSync<MarketDataResult>(cacheKeyStr);
  if (stale) {
    return {
      data: { ...stale.data, source: "cached" },
      provider: stale.provider,
      source: "cached",
      attempted,
    };
  }

  if (allowMock) {
    const fallback = await freeProvider.getMarketData(normalized.internal);
    return {
      data: fallback,
      provider: "Free",
      source: "mock",
      attempted: [...attempted, "Free (terminal)"],
    };
  }

  return {
    data: buildUnavailableMarketData(symbol),
    provider: "unavailable",
    source: "unavailable",
    attempted,
  };
}

export async function fetchMarketDataWithFailover(
  symbol: string
): Promise<MarketDataResult> {
  return executeWithFailover(symbol, (p) => p.getMarketData(symbol));
}

export async function fetchQuoteWithFailover(
  symbol: string
): Promise<MarketDataResult> {
  return executeWithFailover(symbol, (p) => p.getQuote(symbol), {
    allowMock: false,
  });
}

export function getActiveMarketDataProviders(): string[] {
  return buildProviderChain().map((p) => p.name);
}
