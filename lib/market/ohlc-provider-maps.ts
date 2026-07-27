/**
 * Polygon / AlphaVantage timeframe maps — kept complete for provider interface.
 * Live OHLC path uses Yahoo → Finnhub via ohlc-engine (not these adapters).
 */

import type { ChartTimeframe } from "@/lib/market/ohlc-timeframes";
import { CHART_TIMEFRAMES } from "@/lib/market/ohlc-timeframes";

/** Ensure Record<ChartTimeframe, T> stays exhaustive when enum grows. */
export function assertChartTimeframeRecord<T>(
  record: Record<ChartTimeframe, T>
): Record<ChartTimeframe, T> {
  for (const tf of CHART_TIMEFRAMES) {
    if (!(tf in record)) {
      throw new Error(`Missing ChartTimeframe mapping: ${tf}`);
    }
  }
  return record;
}
