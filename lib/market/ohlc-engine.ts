/**
 * Canonical OHLC candle engine.
 *
 * Yahoo → Finnhub → same-key cache only.
 * NEVER substitutes candles from another timeframe.
 * Unavailable timeframe → empty series (provider: unavailable).
 */

import { yahooAdapter } from "@/lib/adapters/yahoo";
import { finnhubAdapter } from "@/lib/adapters/finnhub";
import {
  CACHE_TTL,
  cacheKey,
  getCached,
  getCachedSync,
  getStaleCachedSync,
} from "@/lib/cache";
import type { OhlcBar } from "@/lib/providers/types";
import {
  CHART_TIMEFRAMES,
  OHLC_PROVIDER_SPECS,
  emptyPriceHistory,
  isOhlcTimeframe,
  type ChartTimeframe,
  type OhlcTimeframe,
} from "@/lib/market/ohlc-timeframes";

export type HistoricalDataSource = "live" | "cached" | "unavailable";

export interface OhlcResult {
  data: OhlcBar[];
  provider: "Yahoo" | "Finnhub" | "cache" | "unavailable";
  source: HistoricalDataSource;
  attempted: string[];
  timeframe: OhlcTimeframe;
  /** Provider interval used for this fetch (cache isolation). */
  interval: string;
}

function startOfUtcDay(date: Date): string {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  ).toISOString();
}

function sortAsc(candles: OhlcBar[]): OhlcBar[] {
  return [...candles].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

function collapseToDaily(candles: OhlcBar[]): OhlcBar[] {
  const sorted = sortAsc(
    candles.filter(
      (candle) =>
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close)
    )
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
  return Array.from(dailyBars.values());
}

function trimCalendarDays(candles: OhlcBar[], days: number): OhlcBar[] {
  if (candles.length === 0) return [];
  const sorted = sortAsc(candles);
  const latest = sorted[sorted.length - 1]?.timestamp;
  if (!latest) return [];
  const cutoff = new Date(latest);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return sorted.filter(
    (candle) => new Date(candle.timestamp).getTime() >= cutoff.getTime()
  );
}

/** Normalize provider bars for the requested timeframe only — never mixes TFs. */
export function normalizeOhlcCandles(
  candles: OhlcBar[],
  timeframe: OhlcTimeframe
): OhlcBar[] {
  const spec = OHLC_PROVIDER_SPECS[timeframe];
  let next = sortAsc(
    candles.filter(
      (candle) =>
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close)
    )
  );

  if (spec.collapseToDaily) {
    next = collapseToDaily(next);
  }
  if (spec.trimCalendarDays != null) {
    next = trimCalendarDays(next, spec.trimCalendarDays);
  }

  // 4H: downsample 60m bars to 4-hour buckets (Yahoo has no native 4H).
  if (timeframe === "4H") {
    next = downsampleToHours(next, 4);
  }

  return next;
}

function downsampleToHours(candles: OhlcBar[], hours: number): OhlcBar[] {
  if (candles.length === 0) return [];
  const ms = hours * 3_600_000;
  const buckets = new Map<number, OhlcBar>();
  for (const candle of sortAsc(candles)) {
    const t = new Date(candle.timestamp).getTime();
    if (Number.isNaN(t)) continue;
    const bucket = Math.floor(t / ms) * ms;
    const existing = buckets.get(bucket);
    if (!existing) {
      buckets.set(bucket, {
        timestamp: new Date(bucket).toISOString(),
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
  return Array.from(buckets.values()).sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

function unavailableResult(
  timeframe: OhlcTimeframe,
  attempted: string[]
): OhlcResult {
  const spec = OHLC_PROVIDER_SPECS[timeframe];
  return {
    data: [],
    provider: "unavailable",
    source: "unavailable",
    attempted,
    timeframe,
    interval: spec.yahooInterval,
  };
}

function isUsableResult(
  result: OhlcResult | null | undefined,
  minBars = 1
): boolean {
  return Boolean(
    result &&
      result.data.length >= minBars &&
      result.source !== "unavailable"
  );
}

/** Cache key: provider-agnostic identity includes symbol + TF + interval. */
export function ohlcCacheKey(
  symbol: string,
  timeframe: OhlcTimeframe,
  interval: string,
  provider = "canonical"
): string {
  return cacheKey("ohlc", provider, symbol.toUpperCase(), timeframe, interval);
}

async function fetchHistoricalCandles(
  symbol: string,
  timeframe: OhlcTimeframe,
  key: string
): Promise<OhlcResult> {
  const attempted: string[] = [];
  const spec = OHLC_PROVIDER_SPECS[timeframe];

  attempted.push("Yahoo");
  try {
    const data = await yahooAdapter.fetchCandles(symbol, timeframe);
    const normalized = normalizeOhlcCandles(data, timeframe);
    if (normalized.length === 0) {
      throw new Error(`Yahoo: no normalized candles for ${symbol} (${timeframe})`);
    }
    return {
      data: normalized,
      provider: "Yahoo",
      source: "live",
      attempted,
      timeframe,
      interval: spec.yahooInterval,
    };
  } catch {
    // Continue to Finnhub.
  }

  attempted.push("Finnhub");
  try {
    const data = await finnhubAdapter.fetchCandles(symbol, timeframe);
    const normalized = normalizeOhlcCandles(data, timeframe);
    if (normalized.length === 0) {
      throw new Error(
        `Finnhub: no normalized candles for ${symbol} (${timeframe})`
      );
    }
    return {
      data: normalized,
      provider: "Finnhub",
      source: "live",
      attempted,
      timeframe,
      interval: spec.yahooInterval,
    };
  } catch {
    // Continue to stale cache (same key only).
  }

  const stale = getStaleCachedSync<OhlcResult>(key);
  if (isUsableResult(stale) && stale) {
    return {
      ...stale,
      provider: "cache",
      source: "cached",
      attempted,
      timeframe,
      interval: spec.yahooInterval,
    };
  }

  return unavailableResult(timeframe, attempted);
}

/**
 * Fetch OHLC for exactly one timeframe.
 * Never returns candles belonging to a different timeframe.
 */
export async function getOhlcCandles(
  symbol: string,
  timeframe: OhlcTimeframe,
  options?: { minBars?: number }
): Promise<OhlcResult> {
  if (!isOhlcTimeframe(timeframe)) {
    return unavailableResult("1D", ["invalid-timeframe"]);
  }

  const normalized = symbol.toUpperCase();
  const spec = OHLC_PROVIDER_SPECS[timeframe];
  const key = ohlcCacheKey(normalized, timeframe, spec.yahooInterval);
  const minBars = options?.minBars ?? 1;

  const fresh = getCachedSync<OhlcResult>(key);
  if (isUsableResult(fresh, minBars) && fresh) {
    return fresh;
  }

  const result = await fetchHistoricalCandles(normalized, timeframe, key);
  const attemptedProviders = result.attempted;

  if (isUsableResult(result, minBars)) {
    return getCached({ key, ttlMs: CACHE_TTL.CANDLES }, async () => result);
  }

  const stale = getStaleCachedSync<OhlcResult>(key);
  if (isUsableResult(stale, minBars) && stale) {
    return {
      ...stale,
      provider: "cache",
      source: "cached",
      attempted: attemptedProviders,
      timeframe,
      interval: spec.yahooInterval,
    };
  }

  if (isUsableResult(result, 1)) return result;
  if (stale && stale.data.length >= 1 && stale.source !== "unavailable") {
    return {
      ...stale,
      provider: "cache",
      source: "cached",
      attempted: attemptedProviders,
      timeframe,
      interval: spec.yahooInterval,
    };
  }

  return result.data.length > 0 ? result : unavailableResult(timeframe, attemptedProviders);
}

/**
 * Fetch every chart timeframe independently.
 * Empty slots stay empty — no donor / synthesize.
 */
export async function getFullPriceHistory(
  symbol: string
): Promise<Record<ChartTimeframe, OhlcBar[]>> {
  const entries = await Promise.all(
    CHART_TIMEFRAMES.map(async (tf) => {
      const result = await getOhlcCandles(symbol, tf);
      return [tf, result.data] as const;
    })
  );

  const history = emptyPriceHistory() as Record<ChartTimeframe, OhlcBar[]>;
  for (const [tf, data] of entries) {
    history[tf] = data;
  }
  return history;
}

/** @deprecated Removed — cross-TF substitution is forbidden. */
export function coalescePriceHistory(
  history: Record<ChartTimeframe, OhlcBar[]>
): Record<ChartTimeframe, OhlcBar[]> {
  // Pass-through only — never fill from another TF.
  const next = emptyPriceHistory() as Record<ChartTimeframe, OhlcBar[]>;
  for (const tf of CHART_TIMEFRAMES) {
    next[tf] = [...(history[tf] ?? [])];
  }
  return next;
}

export {
  CHART_TIMEFRAMES,
  emptyPriceHistory,
  type ChartTimeframe,
  type OhlcTimeframe,
} from "@/lib/market/ohlc-timeframes";
