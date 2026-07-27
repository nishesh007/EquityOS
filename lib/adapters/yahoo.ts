import { adapterFetch } from "@/lib/adapters/http";
import { BaseDataAdapter, type AdapterConfig } from "@/lib/adapters/types";
import { toYahooSymbol } from "@/lib/market-data/symbols";
import {
  OHLC_PROVIDER_SPECS,
  isOhlcTimeframe,
  type OhlcTimeframe,
} from "@/lib/market/ohlc-timeframes";
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

const TIMEFRAME_TO_YAHOO: Record<OhlcTimeframe, { range: string; interval: string }> =
  Object.fromEntries(
    (
      Object.entries(OHLC_PROVIDER_SPECS) as Array<
        [OhlcTimeframe, (typeof OHLC_PROVIDER_SPECS)[OhlcTimeframe]]
      >
    ).map(([tf, spec]) => [
      tf,
      { range: spec.yahooRange, interval: spec.yahooInterval },
    ])
  ) as Record<OhlcTimeframe, { range: string; interval: string }>;

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
      headers: {
        // Same browser UA as candle fetches — EquityOS/1.0 is frequently rate-limited.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
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

  async fetchCandles(symbol: string, timeframe: OhlcTimeframe): Promise<OhlcBar[]> {
    if (!isOhlcTimeframe(timeframe)) {
      throw new Error(`Yahoo: unsupported timeframe ${String(timeframe)}`);
    }
    const yahooSymbol = toYahooSymbol(symbol);
    const config = TIMEFRAME_TO_YAHOO[timeframe];
    const primary =
      this.config.baseUrl ?? "https://query1.finance.yahoo.com";
    const bases = [
      primary,
      "https://query2.finance.yahoo.com",
      "https://query1.finance.yahoo.com",
    ].filter((url, index, all) => all.indexOf(url) === index);

    let lastError: Error | null = null;
    for (const baseUrl of bases) {
      try {
        const url =
          `${baseUrl}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}` +
          `?range=${config.range}&interval=${config.interval}&includePrePost=false`;

        const data = await adapterFetch<YahooChartResponse>(url, {
          timeout: this.config.timeout,
          headers: {
            // Yahoo chart endpoints often reject non-browser UAs from datacenter IPs.
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
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
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError ?? new Error(`Yahoo: no historical candles for ${symbol}`);
  }
}

export const yahooAdapter = new YahooAdapter({
  baseUrl: process.env.YAHOO_FINANCE_BASE_URL ?? "https://query1.finance.yahoo.com",
  timeout: 10_000,
});
