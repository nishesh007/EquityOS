import { adapterFetch, hasApiKey } from "@/lib/adapters/http";
import { loadProviderConfig } from "@/lib/providers/config";
import { BaseDataAdapter, type AdapterConfig } from "@/lib/adapters/types";

export interface FinnhubQuoteParams {
  symbol: string;
}

export interface FinnhubQuoteResult {
  symbol: string;
  currentPrice: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

interface FinnhubQuoteResponse {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
}

const INDEX_SYMBOL_MAP: Record<string, string> = {
  NIFTY: "^NSEI",
  SENSEX: "^BSESN",
  BANKNIFTY: "^NSEBANK",
  INDIAVIX: "^INDIAVIX",
};

export function toFinnhubSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (INDEX_SYMBOL_MAP[upper]) return INDEX_SYMBOL_MAP[upper];
  if (upper.includes(".")) return upper;
  return `${upper}.NS`;
}

export class FinnhubAdapter extends BaseDataAdapter<
  FinnhubQuoteParams,
  FinnhubQuoteResult
> {
  readonly provider = "Finnhub";

  override get status() {
    return hasApiKey(this.config.apiKey) ? ("ready" as const) : ("stub" as const);
  }

  async healthCheck() {
    if (!hasApiKey(this.config.apiKey)) {
      return {
        status: "stub" as const,
        provider: this.provider,
        message: "Finnhub adapter requires FINNHUB_API_KEY.",
        lastChecked: new Date().toISOString(),
      };
    }
    return {
      status: "ready" as const,
      provider: this.provider,
      message: "Finnhub adapter configured and ready.",
      lastChecked: new Date().toISOString(),
    };
  }

  async fetch(params: FinnhubQuoteParams): Promise<FinnhubQuoteResult> {
    if (!hasApiKey(this.config.apiKey)) {
      this.notConnected();
    }

    const finnhubSymbol = toFinnhubSymbol(params.symbol);
    const baseUrl = this.config.baseUrl ?? "https://finnhub.io/api/v1";
    const url = `${baseUrl}/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${this.config.apiKey}`;

    const data = await adapterFetch<FinnhubQuoteResponse>(url, {
      timeout: this.config.timeout,
    });

    if (!data.c || data.c === 0) {
      throw new Error(`Finnhub: no quote for ${params.symbol}`);
    }

    return {
      symbol: params.symbol.toUpperCase(),
      currentPrice: data.c,
      change: data.d ?? 0,
      percentChange: data.dp ?? 0,
      high: data.h ?? data.c,
      low: data.l ?? data.c,
      open: data.o ?? data.c,
      previousClose: data.pc ?? data.c - (data.d ?? 0),
    };
  }
}

const config = loadProviderConfig();
export const finnhubAdapter = new FinnhubAdapter({
  apiKey: config.finnhub.apiKey,
  baseUrl: config.finnhub.baseUrl,
  timeout: 10_000,
});
