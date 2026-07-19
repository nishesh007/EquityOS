import { describe, expect, it } from "vitest";
import {
  classifyMoneyFlow,
  expansionRatio,
  momentumScore,
  parseMarketCapToCr,
  performanceBand,
  periodReturnPercent,
  relativeStrength,
} from "./metrics";

describe("parseMarketCapToCr", () => {
  it("parses Indian Cr labels", () => {
    expect(parseMarketCapToCr("₹19.5L Cr")).toBe(1_950_000);
    expect(parseMarketCapToCr("15000 Cr")).toBe(15000);
  });
});

describe("relativeStrength", () => {
  it("is change minus market average", () => {
    expect(relativeStrength(2, 0.5)).toBe(1.5);
    expect(relativeStrength(-1, 0.5)).toBe(-1.5);
  });
});

describe("momentumScore", () => {
  it("centers near 50 for flat names", () => {
    expect(momentumScore(0, 1)).toBeGreaterThan(40);
    expect(momentumScore(0, 1)).toBeLessThan(60);
  });
  it("rises with strong gains and volume", () => {
    expect(momentumScore(3, 2)).toBeGreaterThan(momentumScore(0, 1));
  });
});

describe("classifyMoneyFlow", () => {
  it("flags inflow on strong up + volume", () => {
    expect(classifyMoneyFlow(1.2, 1.5)).toBe("inflow");
  });
  it("flags outflow on strong down + volume", () => {
    expect(classifyMoneyFlow(-1.2, 1.5)).toBe("outflow");
  });
});

describe("performanceBand", () => {
  it("maps change bands", () => {
    expect(performanceBand(3, "change")).toBe("strongGain");
    expect(performanceBand(0, "change")).toBe("neutral");
    expect(performanceBand(-3, "change")).toBe("strongLoss");
  });
});

describe("periodReturnPercent", () => {
  it("computes lookback return", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    expect(periodReturnPercent(closes, 5)).not.toBeNull();
  });
  it("returns null when history is short", () => {
    expect(periodReturnPercent([100, 101], 5)).toBeNull();
  });
});

describe("expansionRatio", () => {
  it("ratios against median", () => {
    expect(expansionRatio(200, 100)).toBe(2);
    expect(expansionRatio(null, 100)).toBeNull();
  });
});
