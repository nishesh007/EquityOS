/**
 * Fundamentals must never carry live market prices.
 * Display prices come only from @/lib/market-data.
 */

import { describe, expect, it } from "vitest";
import { mockSeedToBundle } from "@/lib/fundamentals/mock-provider";
import { getMockSeed } from "@/lib/fundamentals/mock-data";
import { resolveFundamentalsSeed } from "@/lib/fundamentals/dynamic-seed";
import { bundleToCompanyProfile } from "@/lib/fundamentals/engine";
import { emptyPriceHistory } from "@/lib/market/ohlc-timeframes";
import {
  FUNDAMENTALS_FORBIDDEN_MARKET_KEYS,
  assertNoMarketPricesOnFundamentals,
  findForbiddenMarketKeys,
  fundamentalsPeersToDisplay,
  resolveLiveMarketPrice,
  stripPeerMarketPrices,
} from "@/lib/fundamentals/strip-market-fields";

describe("fundamentals market-price boundary", () => {
  it("mock RELIANCE seed has no LTP / change fields", () => {
    const seed = getMockSeed("RELIANCE");
    expect(seed).toBeTruthy();
    expect(seed).not.toHaveProperty("price");
    expect(seed).not.toHaveProperty("change");
    expect(seed).not.toHaveProperty("changePercent");
    expect(JSON.stringify(seed)).not.toContain("2890");
    for (const peer of seed!.peers) {
      expect(peer).not.toHaveProperty("price");
      expect(peer).not.toHaveProperty("changePercent");
    }
  });

  it("mock bundle never emits market prices", () => {
    const bundle = mockSeedToBundle("RELIANCE");
    expect(bundle).not.toHaveProperty("price");
    expect(bundle).not.toHaveProperty("change");
    expect(bundle).not.toHaveProperty("changePercent");
    expect(bundle.financials.pe).toBeGreaterThan(0);
    expect(bundle.financials.roe).toBeGreaterThan(0);
    for (const peer of bundle.peers) {
      expect(peer).not.toHaveProperty("price");
      expect(peer).not.toHaveProperty("changePercent");
      expect(peer.pe).toBeGreaterThanOrEqual(0);
    }
    expect(() => assertNoMarketPricesOnFundamentals(bundle)).not.toThrow();
  });

  it("bundleToCompanyProfile starts at zero prices until market-data attach", () => {
    const bundle = mockSeedToBundle("RELIANCE");
    const profile = bundleToCompanyProfile(bundle, emptyPriceHistory());
    expect(profile.price).toBe(0);
    expect(profile.change).toBe(0);
    expect(profile.changePercent).toBe(0);
    for (const peer of profile.peers) {
      expect(peer.price).toBe(0);
      expect(peer.changePercent).toBe(0);
    }
  });

  it("dynamic seed never synthesizes LTP", () => {
    const seed = resolveFundamentalsSeed("UNKNOWNXYZ");
    expect(seed).not.toHaveProperty("price");
    expect(seed).not.toHaveProperty("changePercent");
    expect(seed.financials.pe).toBeGreaterThan(0);
  });

  it("stripPeerMarketPrices removes LTP fields", () => {
    const stripped = stripPeerMarketPrices([
      {
        symbol: "TCS",
        name: "TCS",
        price: 4125,
        changePercent: 1.2,
        pe: 30,
        marketCap: "₹15L Cr",
      },
    ]);
    expect(stripped[0]).not.toHaveProperty("price");
    expect(stripped[0]).not.toHaveProperty("changePercent");
    expect(stripped[0]!.pe).toBe(30);
    expect(fundamentalsPeersToDisplay(stripped)[0]!.price).toBe(0);
  });

  it("resolveLiveMarketPrice never trusts profile stub prices", () => {
    expect(
      resolveLiveMarketPrice({ quotePrice: null, profilePrice: 2890.5 })
    ).toBeNull();
    expect(
      resolveLiveMarketPrice({
        quotePrice: null,
        profilePrice: 2890.5,
        hasLiveQuote: true,
      })
    ).toBeNull();
    expect(resolveLiveMarketPrice({ quotePrice: 1280 })).toBe(1280);
  });

  it("documents forbidden market keys and detects them", () => {
    expect(FUNDAMENTALS_FORBIDDEN_MARKET_KEYS).toContain("price");
    expect(FUNDAMENTALS_FORBIDDEN_MARKET_KEYS).toContain("volume");
    expect(FUNDAMENTALS_FORBIDDEN_MARKET_KEYS).toContain("ohlc");
    expect(findForbiddenMarketKeys({ price: 1, pe: 20 })).toEqual(["price"]);
  });
});
