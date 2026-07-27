import {
  OE_OHLC_BAR_WINDOWS,
  OE_OHLC_USAGE,
} from "@/lib/market/ohlc-timeframes";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("OE OHLC architecture", () => {
  it("scan technicals use trend=1Y only (no 6M fallback in source)", () => {
    const src = readFileSync(
      resolve(process.cwd(), "lib/opportunity-engine/engine.ts"),
      "utf8"
    );
    expect(src).toContain("OE_OHLC_USAGE.trend");
    expect(src).not.toMatch(/getOhlcCandles\(symbol,\s*"6M"/);
    expect(src).not.toMatch(/fallback = await getOhlcCandles/);
    expect(OE_OHLC_USAGE.trend).toBe("1Y");
  });

  it("buildLiveMetrics uses entry=3M", () => {
    const src = readFileSync(
      resolve(process.cwd(), "lib/opportunity-engine/live-metrics.ts"),
      "utf8"
    );
    expect(src).toContain("OE_OHLC_USAGE.entry");
    expect(OE_OHLC_USAGE.entry).toBe("3M");
  });

  it("momentum / RS use documented 6M bar window of the same series", () => {
    const src = readFileSync(
      resolve(process.cwd(), "lib/opportunity-engine/live-metrics.ts"),
      "utf8"
    );
    expect(src).toContain("OE_OHLC_BAR_WINDOWS.momentum");
    expect(OE_OHLC_BAR_WINDOWS.momentum).toBe(130);
    expect(OE_OHLC_USAGE.momentum).toBe("6M");
    expect(OE_OHLC_USAGE.shortTerm).toBe("1M");
  });

  it("scalp session never substitutes daily bars", () => {
    const src = readFileSync(
      resolve(process.cwd(), "lib/opportunity-engine/strategy-execution.ts"),
      "utf8"
    );
    expect(src).toContain("Never substitutes daily candles");
    expect(src).not.toContain("dailyCandles.slice(-40)");
  });
});
