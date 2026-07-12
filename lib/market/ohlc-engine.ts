/**
 * Historical OHLC candle engine.
 * Yahoo Finance → Finnhub → cached historical candles → unavailable.
 */

import { yahooAdapter } from "@/lib/adapters/yahoo";
import { finnhubAdapter } from "@/lib/adapters/finnhub";
import type { ChartTimeframe } from "@/types";
import type { OhlcBar } from "@/lib/providers/types";
import {
  CACHE_TTL,
  cacheKey,
  getCached,
  getStaleCachedSync,
} from "@/lib/cache";

export type HistoricalDataSource = "live" | "cached" | "unavailable";

export interface OhlcResult {
  data: OhlcBar[];
  provider: "Yahoo" | "Finnhub" | "cache" | "unavailable";
  source: HistoricalDataSource;
  attempted: string[];
}

function unavailableResult(attempted: string[]): OhlcResult {
  return {
    data: [],
    provider: "unavailable",
    source: "unavailable",
    attempted,
  };
}

async function fetchHistoricalCandles(
  symbol: string,
  timeframe: ChartTimeframe,
  key: string
): Promise<OhlcResult> {
  const attempted: string[] = [];

  attempted.push("Yahoo");
  try {
    const data = await yahooAdapter.fetchCandles(symbol, timeframe);
    return { data, provider: "Yahoo", source: "live", attempted };
  } catch {
    // Continue to Finnhub; do not reconstruct missing candles.
  }

  attempted.push("Finnhub");
  try {
    const data = await finnhubAdapter.fetchCandles(symbol, timeframe);
    return { data, provider: "Finnhub", source: "live", attempted };
  } catch {
    // Continue to stale cache; do not reconstruct missing candles.
  }

  const stale = getStaleCachedSync<OhlcResult>(key);
  if (stale && stale.data.length > 0 && stale.source !== "unavailable") {
    return {
      data: stale.data,
      provider: "cache",
      source: "cached",
      attempted,
    };
  }

  return unavailableResult(attempted);
}

export async function getOhlcCandles(
  symbol: string,
  timeframe: ChartTimeframe
): Promise<OhlcResult> {
  const normalized = symbol.toUpperCase();
  const key = cacheKey("ohlc", normalized, timeframe);
  return getCached(
    {
      key,
      ttlMs: CACHE_TTL.CANDLES,
    },
    () => fetchHistoricalCandles(normalized, timeframe, key)
  );
}

export async function getFullPriceHistory(
  symbol: string
): Promise<Record<ChartTimeframe, OhlcBar[]>> {
  const timeframes: ChartTimeframe[] = [
    "1D",
    "1W",
    "1M",
    "3M",
    "6M",
    "1Y",
    "5Y",
  ];

  const entries = await Promise.all(
    timeframes.map(async (tf) => {
      const result = await getOhlcCandles(symbol, tf);
      return [tf, result.data] as const;
    })
  );

  return Object.fromEntries(entries) as Record<ChartTimeframe, OhlcBar[]>;
}
