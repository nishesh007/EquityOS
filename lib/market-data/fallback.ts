/**
 * Market data failover — institutional price path.
 *
 * Production (and all environments for prices):
 *   Live Provider → Cache → Last Successful Quote → Unavailable
 *
 * NEVER falls through to Mock / Free synthetic prices.
 * Live providers (in order): Yahoo → Finnhub → Polygon → NSE
 * (see also lib/market-data/quote-acquisition.ts for batch OE acquisition)
 *
 * Server-only — quote persistence uses node:fs via quote-store.
 */

import "server-only";

import { cacheKey, getStaleCachedSync } from "@/lib/cache";
import { createBridgeProvider } from "@/lib/market-data/providers/adapter-bridge";
import { normalizeSymbol } from "@/lib/market-data/symbols";
import {
  recordProviderFailure,
  recordProviderSuccess,
  setProviderAvailable,
} from "@/lib/market-data/provider-health";
import {
  getStoredQuote,
  saveSuccessfulQuote,
} from "@/lib/market-data/quote-store";
import type {
  IMarketDataProvider,
  MarketData,
  MarketDataResult,
} from "@/lib/market-data/types";

const LIVE_PROVIDER_ORDER = ["yahoo", "finnhub", "polygon", "nse"] as const;

function isMockProviderName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized === "free" || normalized === "mock";
}

function buildLiveProviderChain(): IMarketDataProvider[] {
  const chain: IMarketDataProvider[] = [];

  LIVE_PROVIDER_ORDER.forEach((name, index) => {
    const provider = createBridgeProvider(
      name,
      index === 0 ? "primary" : "secondary"
    );
    if (!provider || isMockProviderName(provider.name)) return;
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

function storedQuoteToMarketData(symbol: string): MarketData | null {
  const stored = getStoredQuote(symbol);
  if (!stored || !(stored.price > 0)) return null;
  if (isMockProviderName(stored.provider)) return null;
  const normalized = normalizeSymbol(symbol);
  return {
    symbol: normalized.internal,
    companyName: normalized.companyName ?? normalized.internal,
    exchange: normalized.exchange,
    currency: normalized.currency,
    ltp: stored.price,
    previousClose: stored.price,
    open: stored.price,
    high: stored.price,
    low: stored.price,
    change: 0,
    changePercent: 0,
    volume: stored.volume,
    provider: stored.provider,
    lastUpdated: stored.timestamp,
    source: "cached",
  };
}

/**
 * Live → Cache → Last Successful → Unavailable.
 * Mock / Free prices are never returned.
 */
async function executeWithFailover(
  symbol: string,
  operation: (provider: IMarketDataProvider) => Promise<MarketData>,
  options: { cacheNamespace?: "market-data" | "quote" | "index" } = {}
): Promise<MarketDataResult> {
  const { cacheNamespace = "market-data" } = options;
  const normalized = normalizeSymbol(symbol);
  const cacheKeyStr = cacheKey(cacheNamespace, normalized.internal);
  const chain = buildLiveProviderChain();
  const attempted: string[] = [];

  for (const provider of chain) {
    attempted.push(provider.name);
    const startedAt = Date.now();
    try {
      const data = await operation(provider);
      const latency = Date.now() - startedAt;

      // Hard reject mock / Free even if a misconfigured provider returns them.
      if (isMockProviderName(provider.name) || data.source === "mock") {
        recordProviderFailure(provider.name, latency);
        continue;
      }
      if (!(data.ltp > 0)) {
        recordProviderFailure(provider.name, latency);
        continue;
      }

      recordProviderSuccess(provider.name, latency);
      saveSuccessfulQuote({
        symbol: normalized.internal,
        price: data.ltp,
        volume: data.volume,
        timestamp: data.lastUpdated,
        provider: provider.name,
      });
      return {
        data: { ...data, source: "live" },
        provider: provider.name,
        source: "live",
        attempted,
      };
    } catch {
      const latency = Date.now() - startedAt;
      recordProviderFailure(provider.name, latency);
      continue;
    }
  }

  // Cache (in-memory TTL) — never accept mock entries.
  const stale = getStaleCachedSync<MarketDataResult>(cacheKeyStr);
  if (
    stale &&
    stale.source !== "mock" &&
    stale.source !== "unavailable" &&
    !isMockProviderName(stale.provider) &&
    stale.data.ltp > 0
  ) {
    return {
      data: { ...stale.data, source: "cached" },
      provider: stale.provider,
      source: "cached",
      attempted: [...attempted, "cache"],
    };
  }

  // Last successful durable quote.
  const durable = storedQuoteToMarketData(normalized.internal);
  if (durable) {
    return {
      data: durable,
      provider: durable.provider,
      source: "cached",
      attempted: [...attempted, "last_successful"],
    };
  }

  // Terminal: Unavailable — never Mock.
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
    cacheNamespace: "market-data",
  });
}

export async function fetchQuoteWithFailover(
  symbol: string
): Promise<MarketDataResult> {
  return executeWithFailover(symbol, (p) => p.getQuote(symbol), {
    cacheNamespace: "quote",
  });
}

export async function fetchIndexWithFailover(
  symbol: string
): Promise<MarketDataResult> {
  return executeWithFailover(symbol, (p) => p.getQuote(symbol), {
    cacheNamespace: "index",
  });
}

export function getActiveMarketDataProviders(): string[] {
  return buildLiveProviderChain().map((p) => p.name);
}

export function getProductionProviderChain(): string[] {
  return [
    "Live Provider",
    "Cache",
    "Last Successful Quote",
    "Unavailable",
  ];
}
