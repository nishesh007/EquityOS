import type { PricePoint } from "@/types";
import type { OhlcBar } from "@/lib/providers/types";

/**
 * Converts close-only PricePoint series into synthetic OHLC bars.
 * Uses the same reconstruction logic as the local candlestick chart fallback.
 */
export function pricePointsToCandles(
  points: PricePoint[],
  currentPrice: number,
  maxBars = 260
): OhlcBar[] {
  const series = points.slice(-maxBars);
  if (series.length === 0) return [];

  const closes = new Array<number>(series.length);
  closes[series.length - 1] = currentPrice;

  for (let index = series.length - 2; index >= 0; index--) {
    const rawCurrent = series[index].price;
    const rawNext = series[index + 1].price;
    const rawMove = rawNext > 0 ? (rawCurrent - rawNext) / rawNext : 0;
    const cappedMove = Math.max(-0.045, Math.min(0.045, rawMove));
    closes[index] = closes[index + 1] * (1 + cappedMove);
  }

  return series.map((point, index) => {
    const previousClose = index > 0 ? closes[index - 1] : closes[index] * 0.996;
    const open = previousClose;
    const close = closes[index];
    const wick = Math.max(Math.abs(close - open) * 0.45, close * 0.004);

    return {
      timestamp: point.timestamp,
      open,
      high: Math.max(open, close) + wick,
      low: Math.min(open, close) - wick,
      close,
      volume: point.volume ?? 0,
    };
  });
}

export function candleCloses(candles: OhlcBar[]): number[] {
  return candles.map((c) => c.close);
}
