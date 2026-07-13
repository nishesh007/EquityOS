import { adapterFetch, hasApiKey } from "@/lib/adapters/http";
import { resolveMarketDataSymbol } from "@/lib/fundamentals/symbols";
import { loadProviderConfig } from "@/lib/providers/config";
import { BaseDataAdapter, type AdapterConfig } from "@/lib/adapters/types";
import type { ChartTimeframe } from "@/types";
import type { OhlcBar } from "@/lib/providers/types";

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

interface FinnhubCandleResponse {
  s?: string;
  t?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
}

const TIMEFRAME_TO_FINNHUB: Record<
  ChartTimeframe,
  { resolution: string; lookbackDays: number }
> = {
  "1D": { resolution: "5", lookbackDays: 1 },
  "1W": { resolution: "15", lookbackDays: 7 },
  "1M": { resolution: "D", lookbackDays: 31 },
  "3M": { resolution: "D", lookbackDays: 93 },
  "6M": { resolution: "D", lookbackDays: 186 },
  "1Y": { resolution: "D", lookbackDays: 370 },
  "5Y": { resolution: "W", lookbackDays: 365 * 5 + 7 },
};

const INDEX_SYMBOL_MAP: Record<string, string> = {
  NIFTY: "^NSEI",
  SENSEX: "^BSESN",
  BANKNIFTY: "^NSEBANK",
  INDIAVIX: "^INDIAVIX",
};

export function toFinnhubSymbol(symbol: string): string {
  const upper = resolveMarketDataSymbol(symbol);
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

  async fetchCandles(symbol: string, timeframe: ChartTimeframe): Promise<OhlcBar[]> {
    if (!hasApiKey(this.config.apiKey)) {
      this.notConnected();
    }

    const finnhubSymbol = toFinnhubSymbol(symbol);
    const config = TIMEFRAME_TO_FINNHUB[timeframe];
    const to = Math.floor(Date.now() / 1000);
    const from = to - config.lookbackDays * 86_400;
    const baseUrl = this.config.baseUrl ?? "https://finnhub.io/api/v1";
    const url =
      `${baseUrl}/stock/candle?symbol=${encodeURIComponent(finnhubSymbol)}` +
      `&resolution=${config.resolution}&from=${from}&to=${to}&token=${this.config.apiKey}`;

    const data = await adapterFetch<FinnhubCandleResponse>(url, {
      timeout: this.config.timeout,
    });

    if (data.s !== "ok" || !data.t?.length) {
      throw new Error(`Finnhub: no historical candles for ${symbol}`);
    }

    const candles = data.t.flatMap((timestamp, index) => {
      const open = data.o?.[index];
      const high = data.h?.[index];
      const low = data.l?.[index];
      const close = data.c?.[index];
      if (
        open === undefined ||
        high === undefined ||
        low === undefined ||
        close === undefined
      ) {
        return [];
      }

      return [
        {
          timestamp: new Date(timestamp * 1000).toISOString(),
          open,
          high,
          low,
          close,
          volume: data.v?.[index] ?? 0,
        },
      ];
    });

    if (candles.length === 0) {
      throw new Error(`Finnhub: no complete historical candles for ${symbol}`);
    }

    return candles;
  }
}

const config = loadProviderConfig();
export const finnhubAdapter = new FinnhubAdapter({
  apiKey: config.finnhub.apiKey,
  baseUrl: config.finnhub.baseUrl,
  timeout: 10_000,
});
