import { adapterFetch, hasApiKey } from "@/lib/adapters/http";
import { loadProviderConfig } from "@/lib/providers/config";
import { toFinnhubSymbol } from "@/lib/adapters/finnhub";
import { BaseDataAdapter, type AdapterConfig } from "@/lib/adapters/types";
import type { ChartTimeframe, PricePoint } from "@/types";

export interface PolygonParams {
  symbol: string;
  endpoint: "quote" | "aggregates" | "financials";
  timeframe?: ChartTimeframe;
}

export interface PolygonResult {
  symbol: string;
  data: Record<string, unknown>;
}

interface PolygonAggBar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface PolygonAggResponse {
  results?: PolygonAggBar[];
  status?: string;
}

const TIMEFRAME_TO_POLYGON: Record<
  ChartTimeframe,
  { multiplier: number; timespan: string; limit: number }
> = {
  "1D": { multiplier: 5, timespan: "minute", limit: 78 },
  "1W": { multiplier: 30, timespan: "minute", limit: 65 },
  "1M": { multiplier: 1, timespan: "hour", limit: 22 },
  "3M": { multiplier: 1, timespan: "day", limit: 66 },
  "6M": { multiplier: 1, timespan: "day", limit: 130 },
  "1Y": { multiplier: 1, timespan: "day", limit: 252 },
  "5Y": { multiplier: 1, timespan: "week", limit: 260 },
};

function toPolygonTicker(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper === "NIFTY") return "I:NIFTY50";
  if (upper === "SENSEX") return "I:BSESN";
  if (upper === "BANKNIFTY") return "I:NIFTYBANK";
  return toFinnhubSymbol(upper).replace(".NS", "");
}

export class PolygonAdapter extends BaseDataAdapter<PolygonParams, PolygonResult> {
  readonly provider = "Polygon";

  override get status() {
    return hasApiKey(this.config.apiKey) ? ("ready" as const) : ("stub" as const);
  }

  async healthCheck() {
    if (!hasApiKey(this.config.apiKey)) {
      return {
        status: "stub" as const,
        provider: this.provider,
        message: "Polygon adapter requires POLYGON_API_KEY.",
        lastChecked: new Date().toISOString(),
      };
    }
    return {
      status: "ready" as const,
      provider: this.provider,
      message: "Polygon adapter configured and ready.",
      lastChecked: new Date().toISOString(),
    };
  }

  async fetch(params: PolygonParams): Promise<PolygonResult> {
    if (!hasApiKey(this.config.apiKey)) {
      this.notConnected();
    }

    if (params.endpoint === "aggregates" && params.timeframe) {
      const bars = await this.fetchAggregates(params.symbol, params.timeframe);
      return {
        symbol: params.symbol.toUpperCase(),
        data: { bars },
      };
    }

    throw new Error(`Polygon: unsupported endpoint ${params.endpoint}`);
  }

  async fetchAggregates(
    symbol: string,
    timeframe: ChartTimeframe
  ): Promise<PricePoint[]> {
    const config = TIMEFRAME_TO_POLYGON[timeframe];
    const ticker = toPolygonTicker(symbol);
    const baseUrl = this.config.baseUrl ?? "https://api.polygon.io";
    const to = new Date().toISOString().slice(0, 10);
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - (timeframe === "5Y" ? 5 : 1));
    const from = fromDate.toISOString().slice(0, 10);

    const url =
      `${baseUrl}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/` +
      `${config.multiplier}/${config.timespan}/${from}/${to}` +
      `?adjusted=true&sort=asc&limit=${config.limit}&apiKey=${this.config.apiKey}`;

    const data = await adapterFetch<PolygonAggResponse>(url, {
      timeout: this.config.timeout ?? 15_000,
    });

    if (!data.results?.length) {
      throw new Error(`Polygon: no OHLC data for ${symbol} (${timeframe})`);
    }

    return data.results.map((bar) => ({
      timestamp: new Date(bar.t).toISOString(),
      price: bar.c,
      volume: bar.v,
    }));
  }
}

const envConfig = loadProviderConfig();
export const polygonAdapter = new PolygonAdapter({
  apiKey: envConfig.polygon.apiKey,
  baseUrl: envConfig.polygon.baseUrl,
  timeout: 15_000,
});

export { TIMEFRAME_TO_POLYGON };
