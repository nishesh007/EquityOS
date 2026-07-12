/**
 * OHLC candle engine — serves historical price data for local chart fallback.
 * TradingView remains isolated; this engine powers the local candlestick chart.
 */

import type { ChartTimeframe, PricePoint } from "@/types";
import {
  CACHE_TTL,
  cacheKey,
  getCached,
} from "@/lib/cache";
import {
  fetchOhlcWithFailover,
  type FailoverResult,
} from "@/lib/providers/failover";

export type OhlcResult = FailoverResult<PricePoint[]>;

export async function getOhlcCandles(
  symbol: string,
  timeframe: ChartTimeframe
): Promise<OhlcResult> {
  const normalized = symbol.toUpperCase();
  return getCached(
    {
      key: cacheKey("ohlc", normalized, timeframe),
      ttlMs: CACHE_TTL.CANDLES,
    },
    () => fetchOhlcWithFailover(normalized, timeframe)
  );
}

export async function getFullPriceHistory(
  symbol: string
): Promise<Record<ChartTimeframe, PricePoint[]>> {
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

  return Object.fromEntries(entries) as Record<ChartTimeframe, PricePoint[]>;
}
