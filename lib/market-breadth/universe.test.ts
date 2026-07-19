import { describe, expect, it } from "vitest";
import {
  getEntireNseEquityUniverse,
  isTradableNseEquity,
  resolveBreadthUniverse,
} from "@/lib/market-breadth/universe";
import { getNifty50, getNifty100 } from "@/lib/market-breadth/nifty-constituents";

describe("market breadth universe", () => {
  it("filters to tradable INE equities for Entire NSE", () => {
    const nse = getEntireNseEquityUniverse();
    expect(nse.length).toBeGreaterThan(1000);
    expect(nse.every((record) => isTradableNseEquity(record))).toBe(true);
    expect(nse.every((record) => record.isin.startsWith("INE"))).toBe(true);
    expect(nse.some((record) => /^\d/.test(record.symbol))).toBe(false);
  });

  it("resolves Nifty 50 / 100 from curated constituents present in master", () => {
    const nifty50 = resolveBreadthUniverse("nifty50");
    const nifty100 = resolveBreadthUniverse("nifty100");
    expect(nifty50.symbols.length).toBeGreaterThan(40);
    expect(nifty100.symbols.length).toBeGreaterThan(nifty50.symbols.length);
    expect(getNifty50()).toContain("RELIANCE");
    expect(getNifty100()).toContain("RELIANCE");
  });

  it("uses injected portfolio / watchlist symbols", () => {
    const portfolio = resolveBreadthUniverse("portfolio", {
      portfolioSymbols: ["RELIANCE", "INFY"],
    });
    expect(portfolio.symbols).toEqual(["RELIANCE", "INFY"]);
  });
});
