/**
 * Fundamentals failover chain: Primary → Secondary → Mock.
 */

import { createFundamentalsProviderByName } from "@/lib/fundamentals/adapter-providers";
import { mockFundamentalsProvider } from "@/lib/fundamentals/mock-provider";
import { loadFundamentalsConfig } from "@/lib/fundamentals/config";
import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";
import type {
  FundamentalsBundle,
  FundamentalsFailoverResult,
  FundamentalsProvider,
} from "@/lib/fundamentals/types";
import type { DataSource } from "@/lib/providers/types";

function buildFundamentalsChain(): FundamentalsProvider[] {
  const config = loadFundamentalsConfig();
  const chain: FundamentalsProvider[] = [];

  const primary = createFundamentalsProviderByName(config.primary, "primary");
  if (primary?.isAvailable()) chain.push(primary);

  const secondary = createFundamentalsProviderByName(config.secondary, "secondary");
  if (secondary?.isAvailable() && secondary.name !== primary?.name) {
    chain.push(secondary);
  }

  chain.push(mockFundamentalsProvider);
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
    `All fundamentals providers failed (${attempted.join(" → ")}). Mock is terminal.`
  );
}

export async function fetchFundamentalsWithFailover(
  symbol: string
): Promise<FundamentalsFailoverResult> {
  return executeWithFailover(buildFundamentalsChain(), normalizeNseSymbol(symbol));
}

export function getActiveFundamentalsProviders(): string[] {
  return buildFundamentalsChain().map((p) => p.name);
}

export type { FundamentalsBundle, FundamentalsFailoverResult };
