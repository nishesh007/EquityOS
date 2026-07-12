/**
 * Fundamentals provider factory — maps env config to provider instances.
 */

import { createAlphaVantageFundamentalsProvider } from "@/lib/fundamentals/providers/alphavantage-provider";
import { createFMPFundamentalsProvider } from "@/lib/fundamentals/providers/fmp-provider";
import type { FundamentalsProvider } from "@/lib/fundamentals/types";
import type { ProviderTier } from "@/lib/providers/types";

export function createFundamentalsProviderByName(
  name: string,
  tier: ProviderTier
): FundamentalsProvider | null {
  switch (name.toLowerCase()) {
    case "fmp":
    case "financialmodelingprep":
      return createFMPFundamentalsProvider(tier === "mock" ? "primary" : tier);
    case "alphavantage":
    case "alpha_vantage":
    case "av":
      return createAlphaVantageFundamentalsProvider(tier === "mock" ? "secondary" : tier);
    default:
      return null;
  }
}
