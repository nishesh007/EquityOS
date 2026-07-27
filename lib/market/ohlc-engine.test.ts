/**
 * OHLC integrity regression tests — no cross-TF contamination.
 */

import { describe, expect, it } from "vitest";
import {
  coalescePriceHistory,
  emptyPriceHistory,
  normalizeOhlcCandles,
  ohlcCacheKey,
} from "@/lib/market/ohlc-engine";
import {
  CHART_TIMEFRAMES,
  INTRADAY_INTERVALS,
  OE_OHLC_USAGE,
  OHLC_PROVIDER_SPECS,
  isOhlcTimeframe,
  type ChartTimeframe,
} from "@/lib/market/ohlc-timeframes";
import type { OhlcBar } from "@/lib/providers/types";

function bar(day: string, close = 100): OhlcBar {
  return {
    timestamp: `${day}T00:00:00.000Z`,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1_000,
  };
}

describe("OHLC timeframe SSOT", () => {
  it("includes 5D and 3Y as first-class chart timeframes", () => {
    expect(CHART_TIMEFRAMES).toContain("5D");
    expect(CHART_TIMEFRAMES).toContain("3Y");
    expect(CHART_TIMEFRAMES).toHaveLength(9);
  });

  it("includes true intraday intervals", () => {
    expect(INTRADAY_INTERVALS).toEqual([
      "1m",
      "5m",
      "15m",
      "30m",
      "1H",
      "4H",
    ]);
  });

  it("documents OE usage without hidden fallbacks", () => {
    expect(OE_OHLC_USAGE.trend).toBe("1Y");
    expect(OE_OHLC_USAGE.momentum).toBe("6M");
    expect(OE_OHLC_USAGE.entry).toBe("3M");
    expect(OE_OHLC_USAGE.shortTerm).toBe("1M");
    expect(OE_OHLC_USAGE.session).toBe("1D");
  });

  it("has provider specs for every OhlcTimeframe", () => {
    for (const tf of [...INTRADAY_INTERVALS, ...CHART_TIMEFRAMES]) {
      expect(isOhlcTimeframe(tf)).toBe(true);
      expect(OHLC_PROVIDER_SPECS[tf].yahooRange).toBeTruthy();
      expect(OHLC_PROVIDER_SPECS[tf].yahooInterval).toBeTruthy();
    }
  });
});

describe("ohlcCacheKey isolation", () => {
  it("includes provider, symbol, timeframe, and interval", () => {
    const a = ohlcCacheKey("RELIANCE", "1Y", "1d");
    const b = ohlcCacheKey("RELIANCE", "3M", "1d");
    const c = ohlcCacheKey("RELIANCE", "1Y", "1wk");
    const d = ohlcCacheKey("TCS", "1Y", "1d");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
    expect(a).toContain("1Y");
    expect(a).toContain("RELIANCE");
    expect(a).toContain("1d");
  });
});

describe("coalescePriceHistory — no cross-TF contamination", () => {
  it("does not copy 1Y into empty 3M", () => {
    const history = emptyPriceHistory() as Record<ChartTimeframe, OhlcBar[]>;
    history["1Y"] = [bar("2026-01-01"), bar("2026-07-01")];
    const next = coalescePriceHistory(history);
    expect(next["1Y"]).toHaveLength(2);
    expect(next["3M"]).toHaveLength(0);
    expect(next["1D"]).toHaveLength(0);
    expect(next["5D"]).toHaveLength(0);
    expect(next["3Y"]).toHaveLength(0);
  });

  it("preserves independent series without synthesis", () => {
    const history = emptyPriceHistory() as Record<ChartTimeframe, OhlcBar[]>;
    history["1D"] = [bar("2026-07-27", 10)];
    history["1M"] = [bar("2026-06-01", 20), bar("2026-07-01", 21)];
    const next = coalescePriceHistory(history);
    expect(next["1D"]).toHaveLength(1);
    expect(next["1M"]).toHaveLength(2);
    expect(next["1D"][0].close).toBe(10);
    expect(next["1W"]).toHaveLength(0);
  });
});

describe("normalizeOhlcCandles", () => {
  it("trims 3Y to ~3 calendar years from a longer series", () => {
    const candles: OhlcBar[] = [];
    // ~5 years of daily bars
    const start = Date.UTC(2021, 6, 27);
    for (let i = 0; i < 1300; i++) {
      const d = new Date(start + i * 86_400_000);
      candles.push(
        bar(d.toISOString().slice(0, 10), 100 + (i % 10))
      );
    }
    const normalized = normalizeOhlcCandles(candles, "3Y");
    expect(normalized.length).toBeGreaterThan(500);
    expect(normalized.length).toBeLessThan(1200);
    const spanDays =
      (new Date(normalized.at(-1)!.timestamp).getTime() -
        new Date(normalized[0].timestamp).getTime()) /
      86_400_000;
    expect(spanDays).toBeLessThanOrEqual(365 * 3 + 14);
    expect(spanDays).toBeGreaterThan(365 * 2.5);
  });

  it("keeps series sorted oldest → newest", () => {
    const mixed = [bar("2026-07-03"), bar("2026-07-01"), bar("2026-07-02")];
    const normalized = normalizeOhlcCandles(mixed, "1W");
    for (let i = 1; i < normalized.length; i++) {
      expect(
        new Date(normalized[i].timestamp).getTime()
      ).toBeGreaterThanOrEqual(new Date(normalized[i - 1].timestamp).getTime());
    }
  });
});
