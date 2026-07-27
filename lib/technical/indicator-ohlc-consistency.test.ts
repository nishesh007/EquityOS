/**
 * All technical indicators must share one candle dataset — no silent TF switch.
 */

import { describe, expect, it } from "vitest";
import { buildTechnicalAnalysisFromMarketData } from "@/lib/technical/engine";
import type { OhlcBar } from "@/lib/providers/types";
import type { CompanyProfile, TradingData } from "@/types";

function makeCandles(n: number): OhlcBar[] {
  const out: OhlcBar[] = [];
  let close = 100;
  for (let i = 0; i < n; i++) {
    close += (i % 5) - 2;
    out.push({
      timestamp: new Date(Date.UTC(2024, 0, 1 + i)).toISOString(),
      open: close - 0.5,
      high: close + 1,
      low: close - 1,
      close,
      volume: 10_000 + i * 10,
    });
  }
  return out;
}

const profile = {
  symbol: "RELIANCE",
  name: "Reliance",
  price: 120,
  change: 1,
  changePercent: 0.8,
} as CompanyProfile;

const trading = {
  vwap: 119,
} as TradingData;

describe("indicator OHLC consistency", () => {
  it("computes EMA/SMA/RSI/MACD/ATR/ADX/Supertrend/VWAP/Bollinger from one series", () => {
    const candles = makeCandles(80);
    const { analysis } = buildTechnicalAnalysisFromMarketData({
      profile,
      trading,
      candles,
    });

    const names = analysis.indicators.map((i) => i.name);
    for (const required of [
      "RSI (14)",
      "MACD",
      "EMA 20",
      "SMA 20",
      "VWAP",
      "ATR",
      "ADX",
      "Supertrend",
      "Bollinger Bands",
    ]) {
      expect(names).toContain(required);
    }

    // No placeholder when enough candles — every card has a live value path.
    expect(
      analysis.indicators.every(
        (i) => !String(i.value).toLowerCase().includes("awaiting")
      )
    ).toBe(true);
  });

  it("does not invent indicators when candles are empty", () => {
    const { analysis } = buildTechnicalAnalysisFromMarketData({
      profile,
      trading,
      candles: [],
    });
    expect(
      analysis.indicators.some(
        (i) =>
          String(i.value).toLowerCase().includes("awaiting") ||
          String(i.detail).toLowerCase().includes("awaiting")
      )
    ).toBe(true);
  });
});
