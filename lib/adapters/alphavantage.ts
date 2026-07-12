import { adapterFetch, hasApiKey } from "@/lib/adapters/http";
import { loadProviderConfig } from "@/lib/providers/config";
import { BaseDataAdapter, type AdapterConfig } from "@/lib/adapters/types";
import type { ChartTimeframe } from "@/types";
import type { OhlcBar } from "@/lib/providers/types";

export interface AlphaVantageParams {
  symbol: string;
  function: "TIME_SERIES_DAILY" | "OVERVIEW" | "INCOME_STATEMENT";
  timeframe?: ChartTimeframe;
}

export interface AlphaVantageResult {
  symbol: string;
  data: Record<string, unknown>;
}

interface AlphaVantageDailyBar {
  "1. open"?: string;
  "2. high"?: string;
  "3. low"?: string;
  "4. close"?: string;
  "5. volume"?: string;
}

interface AlphaVantageDailyResponse {
  "Time Series (Daily)"?: Record<string, AlphaVantageDailyBar>;
  "Error Message"?: string;
  Note?: string;
}

const TIMEFRAME_POINT_LIMIT: Record<ChartTimeframe, number> = {
  "1D": 1,
  "1W": 5,
  "1M": 22,
  "3M": 66,
  "6M": 130,
  "1Y": 252,
  "5Y": 1260,
};

function toAlphaVantageSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper === "NIFTY") return "NSEI.BSE";
  if (upper === "SENSEX") return "BSESN.BSE";
  if (upper === "BANKNIFTY") return "NSEBANK.BSE";
  return `${upper}.BSE`;
}

function parseBar(date: string, bar: AlphaVantageDailyBar): OhlcBar {
  return {
    timestamp: new Date(date).toISOString(),
    open: parseFloat(bar["1. open"] ?? "0"),
    high: parseFloat(bar["2. high"] ?? "0"),
    low: parseFloat(bar["3. low"] ?? "0"),
    close: parseFloat(bar["4. close"] ?? "0"),
    volume: parseInt(bar["5. volume"] ?? "0", 10),
  };
}

export class AlphaVantageAdapter extends BaseDataAdapter<
  AlphaVantageParams,
  AlphaVantageResult
> {
  readonly provider = "AlphaVantage";

  override get status() {
    return hasApiKey(this.config.apiKey) ? ("ready" as const) : ("stub" as const);
  }

  async healthCheck() {
    if (!hasApiKey(this.config.apiKey)) {
      return {
        status: "stub" as const,
        provider: this.provider,
        message: "Alpha Vantage adapter requires ALPHA_VANTAGE_API_KEY.",
        lastChecked: new Date().toISOString(),
      };
    }
    return {
      status: "ready" as const,
      provider: this.provider,
      message: "Alpha Vantage adapter configured and ready.",
      lastChecked: new Date().toISOString(),
    };
  }

  async fetch(params: AlphaVantageParams): Promise<AlphaVantageResult> {
    if (!hasApiKey(this.config.apiKey)) {
      this.notConnected();
    }

    if (params.function === "TIME_SERIES_DAILY" && params.timeframe) {
      const bars = await this.fetchDailySeries(params.symbol, params.timeframe);
      return {
        symbol: params.symbol.toUpperCase(),
        data: { bars },
      };
    }

    if (params.function === "OVERVIEW") {
      const overview = await this.fetchOverview(params.symbol);
      return { symbol: params.symbol.toUpperCase(), data: overview };
    }

    if (params.function === "INCOME_STATEMENT") {
      const income = await this.fetchIncomeStatement(params.symbol);
      return { symbol: params.symbol.toUpperCase(), data: income };
    }

    throw new Error(`Alpha Vantage: unsupported function ${params.function}`);
  }

  async fetchOverview(symbol: string): Promise<Record<string, unknown>> {
    const avSymbol = toAlphaVantageSymbol(symbol);
    const baseUrl = this.config.baseUrl ?? "https://www.alphavantage.co/query";
    const url =
      `${baseUrl}?function=OVERVIEW&symbol=${encodeURIComponent(avSymbol)}` +
      `&apikey=${this.config.apiKey}`;

    const data = await adapterFetch<Record<string, unknown> & { "Error Message"?: string; Note?: string }>(
      url,
      { timeout: this.config.timeout ?? 15_000 }
    );

    if (data["Error Message"] || data.Note) {
      throw new Error(data["Error Message"] ?? data.Note ?? "Alpha Vantage OVERVIEW failed");
    }
    if (!data.Symbol) {
      throw new Error(`Alpha Vantage: no overview for ${symbol}`);
    }
    return data;
  }

  async fetchIncomeStatement(symbol: string): Promise<Record<string, unknown>> {
    const avSymbol = toAlphaVantageSymbol(symbol);
    const baseUrl = this.config.baseUrl ?? "https://www.alphavantage.co/query";
    const url =
      `${baseUrl}?function=INCOME_STATEMENT&symbol=${encodeURIComponent(avSymbol)}` +
      `&apikey=${this.config.apiKey}`;

    const data = await adapterFetch<Record<string, unknown> & { "Error Message"?: string; Note?: string }>(
      url,
      { timeout: this.config.timeout ?? 15_000 }
    );

    if (data["Error Message"] || data.Note) {
      throw new Error(data["Error Message"] ?? data.Note ?? "Alpha Vantage INCOME_STATEMENT failed");
    }
    return data;
  }

  async fetchDailySeries(
    symbol: string,
    timeframe: ChartTimeframe
  ): Promise<OhlcBar[]> {
    const avSymbol = toAlphaVantageSymbol(symbol);
    const baseUrl = this.config.baseUrl ?? "https://www.alphavantage.co/query";
    const url =
      `${baseUrl}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(avSymbol)}` +
      `&outputsize=full&apikey=${this.config.apiKey}`;

    const data = await adapterFetch<AlphaVantageDailyResponse>(url, {
      timeout: this.config.timeout ?? 15_000,
    });

    if (data["Error Message"] || data.Note) {
      throw new Error(
        data["Error Message"] ?? data.Note ?? "Alpha Vantage request failed"
      );
    }

    const series = data["Time Series (Daily)"];
    if (!series) {
      throw new Error(`Alpha Vantage: no daily series for ${symbol}`);
    }

    const limit = TIMEFRAME_POINT_LIMIT[timeframe];
    const bars = Object.entries(series)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-limit)
      .map(([date, bar]) => parseBar(date, bar));

    if (bars.length === 0) {
      throw new Error(`Alpha Vantage: empty series for ${symbol}`);
    }

    return bars;
  }
}

const envConfig = loadProviderConfig();
export const alphaVantageAdapter = new AlphaVantageAdapter({
  apiKey: envConfig.alphaVantage.apiKey,
  baseUrl: envConfig.alphaVantage.baseUrl,
  timeout: 15_000,
});

export { TIMEFRAME_POINT_LIMIT, toAlphaVantageSymbol };
