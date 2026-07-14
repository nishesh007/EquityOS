import { adapterFetch } from "@/lib/adapters/http";
import { BaseDataAdapter, type AdapterConfig } from "@/lib/adapters/types";
import { toYahooSymbol } from "@/lib/market-data/symbols";
import type { ChartTimeframe } from "@/types";
import type { OhlcBar } from "@/lib/providers/types";

export interface YahooQuoteParams {
  symbol: string;
}

export interface YahooQuoteResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
}

interface YahooChartMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketVolume?: number;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: YahooChartMeta;
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string };
  };
}

const TIMEFRAME_TO_YAHOO: Record<ChartTimeframe, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "1W": { range: "5d", interval: "15m" },
  "1M": { range: "1mo", interval: "1d" },
  "3M": { range: "3mo", interval: "1d" },
  "6M": { range: "6mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
  "5Y": { range: "5y", interval: "1wk" },
};

export class YahooAdapter extends BaseDataAdapter<YahooQuoteParams, YahooQuoteResult> {
  readonly provider = "Yahoo";

  override get status() {
    return "ready" as const;
  }

  async healthCheck() {
    return {
      status: "ready" as const,
      provider: this.provider,
      message: "Yahoo Finance adapter configured and ready.",
      lastChecked: new Date().toISOString(),
    };
  }

  async fetch(params: YahooQuoteParams): Promise<YahooQuoteResult> {
    const yahooSymbol = toYahooSymbol(params.symbol);
    const baseUrl = this.config.baseUrl ?? "https://query1.finance.yahoo.com";
    const url = `${baseUrl}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1m`;

    const data = await adapterFetch<YahooChartResponse>(url, {
      timeout: this.config.timeout,
    });

    const error = data.chart?.error?.description;
    if (error) {
      throw new Error(`Yahoo: ${error}`);
    }

    const meta = data.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    if (!price || price <= 0) {
      throw new Error(`Yahoo: no quote for ${params.symbol}`);
    }

    const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: params.symbol.toUpperCase(),
      price,
      change,
      changePercent,
      open: meta.regularMarketOpen ?? price,
      high: meta.regularMarketDayHigh ?? price,
      low: meta.regularMarketDayLow ?? price,
      previousClose,
      volume: meta.regularMarketVolume ?? 0,
    };
  }

  async fetchCandles(symbol: string, timeframe: ChartTimeframe): Promise<OhlcBar[]> {
    const yahooSymbol = toYahooSymbol(symbol);
    const config = TIMEFRAME_TO_YAHOO[timeframe];
    const baseUrl = this.config.baseUrl ?? "https://query1.finance.yahoo.com";
    const url =
      `${baseUrl}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}` +
      `?range=${config.range}&interval=${config.interval}&includePrePost=false`;

    const data = await adapterFetch<YahooChartResponse>(url, {
      timeout: this.config.timeout,
    });

    const error = data.chart?.error?.description;
    if (error) {
      throw new Error(`Yahoo: ${error}`);
    }

    const result = data.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const timestamps = result?.timestamp ?? [];
    if (!quote || timestamps.length === 0) {
      throw new Error(`Yahoo: no historical candles for ${symbol}`);
    }

    const candles = timestamps.flatMap((timestamp, index) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      const volume = quote.volume?.[index];

      if (
        open === null ||
        open === undefined ||
        high === null ||
        high === undefined ||
        low === null ||
        low === undefined ||
        close === null ||
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
          volume: volume ?? 0,
        },
      ];
    });

    if (candles.length === 0) {
      throw new Error(`Yahoo: no complete historical candles for ${symbol}`);
    }

    return candles;
  }
}

export const yahooAdapter = new YahooAdapter({
  baseUrl: process.env.YAHOO_FINANCE_BASE_URL ?? "https://query1.finance.yahoo.com",
  timeout: 10_000,
});
