/**
 * Fundamentals failover chain: Primary → Secondary, with dev-only mock fallback.
 */

import { createFundamentalsProviderByName } from "@/lib/fundamentals/adapter-providers";
import { loadFundamentalsConfig } from "@/lib/fundamentals/config";
import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";
import type {
  FundamentalsBundle,
  FundamentalsFailoverResult,
  FundamentalsProvider,
} from "@/lib/fundamentals/types";
import type { DataSource } from "@/lib/providers/types";

function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === "development";
}

async function buildFundamentalsChain(): Promise<FundamentalsProvider[]> {
  const config = loadFundamentalsConfig();
  const chain: FundamentalsProvider[] = [];

  const primary = createFundamentalsProviderByName(config.primary, "primary");
  if (primary?.isAvailable()) chain.push(primary);

  const secondary = createFundamentalsProviderByName(config.secondary, "secondary");
  if (secondary?.isAvailable() && secondary.name !== primary?.name) {
    chain.push(secondary);
  }

  if (isDevelopmentMode()) {
    const { mockFundamentalsProvider } = await import("@/lib/fundamentals/mock-provider");
    chain.push(mockFundamentalsProvider);
  }

  return chain;
}

async function executeWithFailover(
  chain: FundamentalsProvider[],
  symbol: string
): Promise<FundamentalsFailoverResult> {
  const attempted: string[] = [];

  for (const provider of chain) {
    attempted.push(provider.name);
    try {
      const data = await provider.fetchFundamentals(symbol);
      const source: DataSource =
        provider.name === "Mock" ? "mock" : "live";
      return { data, provider: provider.name, source, attempted };
    } catch {
      continue;
    }
  }

  throw new Error(
    `All fundamentals providers failed (${attempted.join(" → ")}).`
  );
}

export async function fetchFundamentalsWithFailover(
  symbol: string
): Promise<FundamentalsFailoverResult> {
  return executeWithFailover(await buildFundamentalsChain(), normalizeNseSymbol(symbol));
}

export async function getActiveFundamentalsProviders(): Promise<string[]> {
  return (await buildFundamentalsChain()).map((p) => p.name);
}

export type { FundamentalsBundle, FundamentalsFailoverResult };
