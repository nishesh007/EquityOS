import { describe, expect, it } from "vitest";
import { selectDirectionalMovers } from "./researchDashboardData";
import type { MarketMover } from "@/types";

const movers: MarketMover[] = [
  { symbol: "UP1", name: "Up One", price: 100, changePercent: 1.2, volume: "1M" },
  { symbol: "DOWN1", name: "Down One", price: 90, changePercent: -1.1, volume: "1M" },
  { symbol: "FLAT", name: "Flat", price: 80, changePercent: 0, volume: "1M" },
  { symbol: "UP2", name: "Up Two", price: 110, changePercent: 3.4, volume: "1M" },
  { symbol: "DOWN2", name: "Down Two", price: 70, changePercent: -4.2, volume: "1M" },
];

describe("selectDirectionalMovers", () => {
  it("returns only positive gainers in descending order", () => {
    const result = selectDirectionalMovers(movers, "gainers");
    expect(result.map((item) => item.symbol)).toEqual(["UP2", "UP1"]);
    expect(result.every((item) => item.changePercent > 0)).toBe(true);
  });

  it("returns only negative losers in ascending order", () => {
    const result = selectDirectionalMovers(movers, "losers");
    expect(result.map((item) => item.symbol)).toEqual(["DOWN2", "DOWN1"]);
    expect(result.every((item) => item.changePercent < 0)).toBe(true);
  });
});
