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

const DAILY_TIMEFRAME_LOOKBACK_DAYS: Partial<Record<ChartTimeframe, number>> = {
  "1M": 31,
  "3M": 93,
  "6M": 186,
};

function startOfUtcDay(date: Date): string {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  ).toISOString();
}

function normalizeDailyCandles(
  candles: OhlcBar[],
  timeframe: ChartTimeframe
): OhlcBar[] {
  const lookbackDays = DAILY_TIMEFRAME_LOOKBACK_DAYS[timeframe];
  if (!lookbackDays) return candles;

  const sorted = candles
    .filter(
      (candle) =>
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close)
    )
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  const dailyBars = new Map<string, OhlcBar>();
  for (const candle of sorted) {
    const date = new Date(candle.timestamp);
    if (Number.isNaN(date.getTime())) continue;

    const dayKey = date.toISOString().slice(0, 10);
    const existing = dailyBars.get(dayKey);
    if (!existing) {
      dailyBars.set(dayKey, {
        timestamp: startOfUtcDay(date),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });
      continue;
    }

    existing.high = Math.max(existing.high, candle.high);
    existing.low = Math.min(existing.low, candle.low);
    existing.close = candle.close;
    existing.volume += candle.volume;
  }

  const daily = Array.from(dailyBars.values());
  const latestTimestamp = daily.at(-1)?.timestamp;
  if (!latestTimestamp) return [];

  const cutoff = new Date(latestTimestamp);
  cutoff.setUTCDate(cutoff.getUTCDate() - lookbackDays);

  return daily.filter(
    (candle) => new Date(candle.timestamp).getTime() >= cutoff.getTime()
  );
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
    const normalized = normalizeDailyCandles(data, timeframe);
    if (normalized.length === 0) {
      throw new Error(`Yahoo: no normalized candles for ${symbol} (${timeframe})`);
    }
    return { data: normalized, provider: "Yahoo", source: "live", attempted };
  } catch {
    // Continue to Finnhub; do not reconstruct missing candles.
  }

  attempted.push("Finnhub");
  try {
    const data = await finnhubAdapter.fetchCandles(symbol, timeframe);
    const normalized = normalizeDailyCandles(data, timeframe);
    if (normalized.length === 0) {
      throw new Error(`Finnhub: no normalized candles for ${symbol} (${timeframe})`);
    }
    return { data: normalized, provider: "Finnhub", source: "live", attempted };
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
