/**
 * Historical OHLC candle engine.
 * Yahoo Finance → Finnhub → cached historical candles → synthesize gaps.
 */

import { yahooAdapter } from "@/lib/adapters/yahoo";
import { finnhubAdapter } from "@/lib/adapters/finnhub";
import type { ChartTimeframe } from "@/types";
import type { OhlcBar } from "@/lib/providers/types";
import {
  CACHE_TTL,
  cacheKey,
  getCached,
  getCachedSync,
  getStaleCachedSync,
} from "@/lib/cache";

export type HistoricalDataSource = "live" | "cached" | "unavailable";

export interface OhlcResult {
  data: OhlcBar[];
  provider: "Yahoo" | "Finnhub" | "cache" | "unavailable";
  source: HistoricalDataSource;
  attempted: string[];
}

const ALL_TIMEFRAMES: ChartTimeframe[] = [
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "5Y",
];

/** Shortest → longest — used when synthesizing missing 1D / filling gaps. */
const TIMEFRAME_RANK: ChartTimeframe[] = ALL_TIMEFRAMES;

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

function isUsableResult(
  result: OhlcResult | null | undefined
): result is OhlcResult {
  return Boolean(
    result && result.data.length > 0 && result.source !== "unavailable"
  );
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
    // Continue to Finnhub.
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
    // Continue to stale cache.
  }

  const stale = getStaleCachedSync<OhlcResult>(key);
  if (isUsableResult(stale)) {
    return {
      data: stale.data,
      provider: "cache",
      source: "cached",
      attempted,
    };
  }

  return unavailableResult(attempted);
}

/**
 * Prefer fresh usable cache; never overwrite a good candle series with [].
 */
export async function getOhlcCandles(
  symbol: string,
  timeframe: ChartTimeframe
): Promise<OhlcResult> {
  const normalized = symbol.toUpperCase();
  const key = cacheKey("ohlc", normalized, timeframe);

  const fresh = getCachedSync<OhlcResult>(key);
  if (isUsableResult(fresh)) {
    return fresh;
  }

  const result = await fetchHistoricalCandles(normalized, timeframe, key);
  const attemptedProviders = result.attempted;

  if (isUsableResult(result)) {
    // Only persist non-empty series so blank misses cannot clobber good history.
    return getCached({ key, ttlMs: CACHE_TTL.CANDLES }, async () => result);
  }

  const stale = getStaleCachedSync<OhlcResult>(key);
  if (isUsableResult(stale)) {
    return {
      data: stale.data,
      provider: "cache",
      source: "cached",
      attempted: attemptedProviders,
    };
  }

  return result;
}

/** Take the most recent session from a longer series to stand in for 1D. */
export function synthesizeIntradayFromSeries(bars: OhlcBar[]): OhlcBar[] {
  if (bars.length === 0) return [];

  const sorted = [...bars].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const lastDay = sorted[sorted.length - 1].timestamp.slice(0, 10);
  const sameDay = sorted.filter((bar) => bar.timestamp.slice(0, 10) === lastDay);
  if (sameDay.length >= 2) return sameDay;

  // Daily/weekly source — still surface recent bars so charts are never blank.
  return sorted.slice(-Math.min(24, sorted.length));
}

function shortestPopulatedTimeframe(
  history: Record<ChartTimeframe, OhlcBar[]>
): ChartTimeframe | null {
  for (const timeframe of TIMEFRAME_RANK) {
    if ((history[timeframe] ?? []).length > 0) return timeframe;
  }
  return null;
}

/**
 * Fill empty timeframe slots from nearest populated series.
 * 1D always synthesizes from the shortest available timeframe when cache/live miss.
 */
export function coalescePriceHistory(
  history: Record<ChartTimeframe, OhlcBar[]>
): Record<ChartTimeframe, OhlcBar[]> {
  const next: Record<ChartTimeframe, OhlcBar[]> = {
    "1D": [...(history["1D"] ?? [])],
    "1W": [...(history["1W"] ?? [])],
    "1M": [...(history["1M"] ?? [])],
    "3M": [...(history["3M"] ?? [])],
    "6M": [...(history["6M"] ?? [])],
    "1Y": [...(history["1Y"] ?? [])],
    "5Y": [...(history["5Y"] ?? [])],
  };

  const seedTf = shortestPopulatedTimeframe(next);
  if (!seedTf) return next;

  if (next["1D"].length === 0) {
    next["1D"] = synthesizeIntradayFromSeries(next[seedTf]);
  }

  for (let index = 0; index < TIMEFRAME_RANK.length; index++) {
    const timeframe = TIMEFRAME_RANK[index];
    if (next[timeframe].length > 0) continue;

    let donor: OhlcBar[] | null = null;
    for (let dist = 1; dist < TIMEFRAME_RANK.length; dist++) {
      const left = TIMEFRAME_RANK[index - dist];
      const right = TIMEFRAME_RANK[index + dist];
      if (left && next[left].length > 0) {
        donor = next[left];
        break;
      }
      if (right && next[right].length > 0) {
        donor = next[right];
        break;
      }
    }
    if (donor) {
      next[timeframe] =
        timeframe === "1D" ? synthesizeIntradayFromSeries(donor) : [...donor];
    }
  }

  return next;
}

export async function getFullPriceHistory(
  symbol: string
): Promise<Record<ChartTimeframe, OhlcBar[]>> {
  const entries = await Promise.all(
    ALL_TIMEFRAMES.map(async (tf) => {
      const result = await getOhlcCandles(symbol, tf);
      return [tf, result.data] as const;
    })
  );

  const raw = Object.fromEntries(entries) as Record<ChartTimeframe, OhlcBar[]>;
  return coalescePriceHistory(raw);
}
