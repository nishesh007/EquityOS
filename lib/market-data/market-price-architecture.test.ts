/**
 * Market-data price path — never Mock; Live → Cache → Last Successful → Unavailable.
 */

import { describe, expect, it } from "vitest";
import {
  getStoredQuote,
  saveSuccessfulQuote,
} from "@/lib/market-data/quote-store";
import { toEnrichedQuote } from "@/lib/market-data/enriched-quote";
import type { QuoteResult } from "@/lib/market-data/quote-result";
import { resolveLiveMarketPrice } from "@/lib/fundamentals/strip-market-fields";
import { getProductionProviderChain } from "@/lib/market-data/fallback";
import { getQuoteAcquisitionPipeline } from "@/lib/market-data/quote-acquisition";

describe("market price architecture", () => {
  it("durable quote store persists successful quotes with required fields", () => {
    const saved = saveSuccessfulQuote({
      symbol: "RELIANCE",
      price: 1280,
      volume: 1_000_000,
      timestamp: "2026-07-27T10:00:00.000Z",
      provider: "Yahoo",
    });
    expect(saved.symbol).toBe("RELIANCE");
    expect(saved.price).toBe(1280);
    expect(saved.volume).toBe(1_000_000);
    expect(saved.provider).toBe("Yahoo");
    expect(saved.timestamp).toBe("2026-07-27T10:00:00.000Z");
    expect(saved.age).toBeGreaterThanOrEqual(0);

    const loaded = getStoredQuote("RELIANCE");
    expect(loaded?.price).toBe(1280);
    expect(loaded?.provider).toBe("Yahoo");
  });

  it("stale enriched quotes keep price instead of null", () => {
    const result: QuoteResult = {
      data: {
        symbol: "INFY",
        ltp: 1550,
        open: 1540,
        high: 1560,
        low: 1530,
        previousClose: 1540,
        change: 10,
        changePercent: 0.65,
        volume: 500_000,
        provider: "Yahoo",
        source: "cached",
        fetchedAt: new Date(Date.now() - 3_600_000).toISOString(),
      },
      provider: "Yahoo",
      source: "cached",
      attempted: ["Yahoo", "cache"],
      stale: true,
      quoteAge: 3_600_000,
    };
    const enriched = toEnrichedQuote("INFY", result);
    expect(enriched.price).toBe(1550);
    expect(enriched.stale).toBe(true);
    expect(enriched.quoteAge).toBeGreaterThan(0);
    expect(enriched.source).toBe("cached");
  });

  it("mock quote results become unavailable with null price", () => {
    const result: QuoteResult = {
      data: {
        symbol: "INFY",
        ltp: 9999,
        open: 9999,
        high: 9999,
        low: 9999,
        previousClose: 9999,
        change: 0,
        changePercent: 0,
        volume: 0,
        provider: "Free",
        source: "mock",
        fetchedAt: new Date().toISOString(),
      },
      provider: "Free",
      source: "mock",
      attempted: ["Free"],
    };
    const enriched = toEnrichedQuote("INFY", result);
    expect(enriched.price).toBeNull();
    expect(enriched.source).toBe("unavailable");
  });

  it("resolveLiveMarketPrice never accepts fundamentals stub prices", () => {
    expect(resolveLiveMarketPrice({ quotePrice: null, profilePrice: 2890 })).toBeNull();
    expect(resolveLiveMarketPrice({ quotePrice: 1280, profilePrice: 2890 })).toBe(1280);
  });

  it("documents production pipeline contract (no Mock)", () => {
    expect(getProductionProviderChain()).toEqual([
      "Live Provider",
      "Cache",
      "Last Successful Quote",
      "Unavailable",
    ]);
    expect(getQuoteAcquisitionPipeline().join(" ")).not.toMatch(/mock/i);
  });
});
