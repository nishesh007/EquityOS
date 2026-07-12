/**
 * Environment-driven provider configuration.
 * Never hardcode API keys, URLs, or secrets.
 */

import { hasApiKey } from "@/lib/adapters/http";

export interface ProviderEnvConfig {
  primary: string;
  secondary: string;
  nse: {
    enabled: boolean;
    baseUrl: string;
  };
  bse: {
    enabled: boolean;
    baseUrl: string;
  };
  finnhub: {
    apiKey?: string;
    baseUrl: string;
  };
  yahoo: {
    baseUrl: string;
  };
  polygon: {
    apiKey?: string;
    baseUrl: string;
  };
  alphaVantage: {
    apiKey?: string;
    baseUrl: string;
  };
  fmp: {
    apiKey?: string;
    baseUrl: string;
  };
  openai: {
    apiKey?: string;
    baseUrl: string;
  };
  tradingViewEnabled: boolean;
}

function env(key: string, fallback = ""): string {
  return process.env[key]?.trim() ?? fallback;
}

export function loadProviderConfig(): ProviderEnvConfig {
  return {
    primary: env("MARKET_PROVIDER_PRIMARY", "nse").toLowerCase(),
    secondary: env("MARKET_PROVIDER_SECONDARY", "finnhub").toLowerCase(),
    nse: {
      enabled: env("NSE_ENABLED", "false") === "true",
      baseUrl: env("NSE_API_BASE_URL", "https://www.nseindia.com/api"),
    },
    bse: {
      enabled: env("BSE_ENABLED", "false") === "true",
      baseUrl: env("BSE_API_BASE_URL", "https://api.bseindia.com"),
    },
    finnhub: {
      apiKey: env("FINNHUB_API_KEY") || undefined,
      baseUrl: env("FINNHUB_API_BASE_URL", "https://finnhub.io/api/v1"),
    },
    yahoo: {
      baseUrl: env("YAHOO_FINANCE_BASE_URL", "https://query1.finance.yahoo.com"),
    },
    polygon: {
      apiKey: env("POLYGON_API_KEY") || undefined,
      baseUrl: env("POLYGON_API_BASE_URL", "https://api.polygon.io"),
    },
    alphaVantage: {
      apiKey: env("ALPHA_VANTAGE_API_KEY") || undefined,
      baseUrl: env(
        "ALPHA_VANTAGE_API_BASE_URL",
        "https://www.alphavantage.co/query"
      ),
    },
    fmp: {
      apiKey: env("FMP_API_KEY") || undefined,
      baseUrl: env(
        "FMP_API_BASE_URL",
        "https://financialmodelingprep.com/api/v3"
      ),
    },
    openai: {
      apiKey: env("OPENAI_API_KEY") || undefined,
      baseUrl: env("OPENAI_API_BASE_URL", "https://api.openai.com/v1"),
    },
    tradingViewEnabled: env("NEXT_PUBLIC_ENABLE_TRADINGVIEW", "false") === "true",
  };
}

export function isProviderConfigured(provider: string): boolean {
  const config = loadProviderConfig();
  switch (provider.toLowerCase()) {
    case "nse":
      return config.nse.enabled;
    case "bse":
      return config.bse.enabled;
    case "yahoo":
      return true;
    case "finnhub":
      return hasApiKey(config.finnhub.apiKey);
    case "polygon":
      return hasApiKey(config.polygon.apiKey);
    case "alphavantage":
    case "alpha_vantage":
      return hasApiKey(config.alphaVantage.apiKey);
    case "fmp":
      return hasApiKey(config.fmp.apiKey);
    case "mock":
      return true;
    default:
      return false;
  }
}
