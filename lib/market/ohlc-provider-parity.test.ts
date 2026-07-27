/**
 * Live Yahoo provider parity — skipped automatically when Yahoo is unreachable.
 */

import { describe, expect, it } from "vitest";
import { yahooAdapter } from "@/lib/adapters/yahoo";
import {
  getOhlcCandles,
  normalizeOhlcCandles,
} from "@/lib/market/ohlc-engine";
import { CHART_TIMEFRAMES } from "@/lib/market/ohlc-timeframes";

const SYMBOLS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"] as const;

function isSorted(bars: { timestamp: string }[]): boolean {
  for (let i = 1; i < bars.length; i++) {
    if (
      new Date(bars[i].timestamp).getTime() <
      new Date(bars[i - 1].timestamp).getTime()
    ) {
      return false;
    }
  }
  return true;
}

describe("Yahoo provider parity (live)", () => {
  it(
    "engine matches Yahoo for chart timeframes on blue-chip NSE names",
    async () => {
      let reachable = true;
      try {
        await yahooAdapter.fetchCandles("RELIANCE", "1M");
      } catch {
        reachable = false;
      }
      if (!reachable) {
        console.warn("[ohlc-parity] Yahoo unreachable — skipping live parity");
        return;
      }

      for (const symbol of SYMBOLS) {
        for (const tf of CHART_TIMEFRAMES) {
          const raw = await yahooAdapter.fetchCandles(symbol, tf);
          const expected = normalizeOhlcCandles(raw, tf);
          const engine = await getOhlcCandles(symbol, tf);

          expect(engine.timeframe).toBe(tf);
          expect(engine.data.length).toBe(expected.length);
          expect(engine.data.length).toBeGreaterThan(0);
          expect(isSorted(engine.data)).toBe(true);

          const lastEngine = engine.data.at(-1)!;
          const lastExpected = expected.at(-1)!;
          expect(lastEngine.close).toBeCloseTo(lastExpected.close, 4);
          expect(lastEngine.high).toBeCloseTo(lastExpected.high, 4);
          expect(lastEngine.low).toBeCloseTo(lastExpected.low, 4);
          expect(lastEngine.high).toBeGreaterThanOrEqual(lastEngine.low);
          expect(lastEngine.timestamp).toBe(lastExpected.timestamp);

          // Spot-check first bar too (ordering + no TF contamination).
          expect(engine.data[0].close).toBeCloseTo(expected[0].close, 4);
          expect(engine.data[0].timestamp).toBe(expected[0].timestamp);
        }
      }
    },
    180_000
  );
});
