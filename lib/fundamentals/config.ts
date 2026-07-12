/**
 * Fundamentals engine configuration.
 */

import { hasApiKey } from "@/lib/adapters/http";
import { loadProviderConfig } from "@/lib/providers/config";

export interface FundamentalsEnvConfig {
  primary: string;
  secondary: string;
}

export function loadFundamentalsConfig(): FundamentalsEnvConfig {
  const config = loadProviderConfig();
  const primary = process.env.FUNDAMENTALS_PROVIDER_PRIMARY?.trim().toLowerCase() ?? "fmp";
  const secondary =
    process.env.FUNDAMENTALS_PROVIDER_SECONDARY?.trim().toLowerCase() ?? "alphavantage";

  const fmpReady = hasApiKey(config.fmp.apiKey);
  const avReady = hasApiKey(config.alphaVantage.apiKey);

  let resolvedPrimary = primary;
  let resolvedSecondary = secondary;

  if (primary === "fmp" && !fmpReady) {
    resolvedPrimary = avReady ? "alphavantage" : "mock";
  }
  if (secondary === "alphavantage" && !avReady) {
    resolvedSecondary = fmpReady ? "fmp" : "mock";
  }

  return {
    primary: resolvedPrimary,
    secondary: resolvedSecondary,
  };
}

export function isFundamentalsProviderConfigured(provider: string): boolean {
  const config = loadProviderConfig();
  switch (provider.toLowerCase()) {
    case "fmp":
      return hasApiKey(config.fmp.apiKey);
    case "alphavantage":
    case "alpha_vantage":
      return hasApiKey(config.alphaVantage.apiKey);
    case "mock":
      return true;
    default:
      return false;
  }
}
