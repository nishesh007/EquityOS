/**
 * Sprint 8A — Provider fallback engine with cache degradation.
 * NSE → Yahoo → Finnhub → Last successful cache → Unavailable.
 */

import { cacheKey, getStaleCachedSync } from "@/lib/cache";
import { createBridgeProvider } from "@/lib/market-data/providers/adapter-bridge";
import { normalizeSymbol } from "@/lib/market-data/symbols";
import {
  recordProviderFailure,
  recordProviderSuccess,
  setProviderAvailable,
} from "@/lib/market-data/provider-health";
import type {
  IMarketDataProvider,
  MarketData,
  MarketDataResult,
} from "@/lib/market-data/types";

const PRODUCTION_PROVIDER_ORDER = ["nse", "yahoo", "finnhub"] as const;

function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === "development";
}

function buildProviderChain(includeDevelopmentMock = false): IMarketDataProvider[] {
  const chain: IMarketDataProvider[] = [];

  PRODUCTION_PROVIDER_ORDER.forEach((name, index) => {
    const provider = createBridgeProvider(name, index === 0 ? "primary" : "secondary");
    if (!provider) return;
    const available = provider.isAvailable();
    setProviderAvailable(provider.name, available);
    if (available) {
      chain.push(provider);
    }
  });

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
  options: { allowMock?: boolean; cacheNamespace?: "market-data" | "quote" | "index" } = {}
): Promise<MarketDataResult> {
  const { allowMock = true, cacheNamespace = "market-data" } = options;
  const normalized = normalizeSymbol(symbol);
  const cacheKeyStr = cacheKey(cacheNamespace, normalized.internal);
  const chain = buildProviderChain(allowMock);
  const attempted: string[] = [];

  for (const provider of chain) {
    attempted.push(provider.name);
    const startedAt = Date.now();
    try {
      const data = await operation(provider);
      const latency = Date.now() - startedAt;
      recordProviderSuccess(provider.name, latency);
      return {
        data,
        provider: provider.name,
        source: provider.name === "Free" ? "mock" : "live",
        attempted,
      };
    } catch {
      const latency = Date.now() - startedAt;
      recordProviderFailure(provider.name, latency);
      continue;
    }
  }

  // All providers failed — return prior real provider data, never mock/unavailable.
  const stale = getStaleCachedSync<MarketDataResult>(cacheKeyStr);
  if (stale && stale.source !== "mock" && stale.source !== "unavailable") {
    return {
      data: { ...stale.data, source: "cached" },
      provider: stale.provider,
      source: "cached",
      attempted,
    };
  }

  if (allowMock) {
    const { freeProvider } = await import("@/lib/market-data/providers/free-provider");
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
  return executeWithFailover(symbol, (p) => p.getMarketData(symbol), {
    allowMock: isDevelopmentMode(),
  });
}

export async function fetchQuoteWithFailover(
  symbol: string
): Promise<MarketDataResult> {
  return executeWithFailover(symbol, (p) => p.getQuote(symbol), {
    allowMock: false,
    cacheNamespace: "quote",
  });
}

export async function fetchIndexWithFailover(
  symbol: string
): Promise<MarketDataResult> {
  return executeWithFailover(symbol, (p) => p.getQuote(symbol), {
    allowMock: false,
    cacheNamespace: "index",
  });
}

export function getActiveMarketDataProviders(): string[] {
  return buildProviderChain(false).map((p) => p.name);
}

export function getProductionProviderChain(): string[] {
  return ["NSE", "Yahoo", "Finnhub", "Last Successful Cache", "Unavailable"];
}
