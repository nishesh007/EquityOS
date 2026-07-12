/**
 * Sprint 8A — Provider fallback engine with cache degradation.
 * Provider A → Provider B → Free Provider → Cached data → Never crash UI.
 */

import { loadProviderConfig } from "@/lib/providers/config";
import { cacheKey, getStaleCachedSync } from "@/lib/cache";
import { createBridgeProvider } from "@/lib/market-data/providers/adapter-bridge";
import { freeProvider } from "@/lib/market-data/providers/free-provider";
import type {
  IMarketDataProvider,
  MarketData,
  MarketDataResult,
} from "@/lib/market-data/types";
import { normalizeSymbol } from "@/lib/market-data/symbols";

function buildProviderChain(): IMarketDataProvider[] {
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

  chain.push(freeProvider);
  return chain;
}

async function executeWithFailover(
  symbol: string,
  operation: (provider: IMarketDataProvider) => Promise<MarketData>
): Promise<MarketDataResult> {
  const normalized = normalizeSymbol(symbol);
  const cacheKeyStr = cacheKey("market-data", normalized.internal);
  const chain = buildProviderChain();
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

  // Terminal fallback — Free provider should never throw, but guard anyway
  const fallback = await freeProvider.getMarketData(normalized.internal);
  return {
    data: fallback,
    provider: "Free",
    source: "mock",
    attempted: [...attempted, "Free (terminal)"],
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
  return executeWithFailover(symbol, (p) => p.getQuote(symbol));
}

export function getActiveMarketDataProviders(): string[] {
  return buildProviderChain().map((p) => p.name);
}
