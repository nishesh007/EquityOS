import { describe, expect, it } from "vitest";
import {
  classifyMarketMood,
  scoreAverageRsi,
  scoreCenteredPercent,
  scoreHighLowRatio,
} from "./mood";

describe("scoreCenteredPercent", () => {
  it("maps extremes and mid-band", () => {
    expect(scoreCenteredPercent(75)).toBe(2);
    expect(scoreCenteredPercent(60)).toBe(1);
    expect(scoreCenteredPercent(50)).toBe(0);
    expect(scoreCenteredPercent(40)).toBe(-1);
    expect(scoreCenteredPercent(20)).toBe(-2);
  });
});

describe("scoreHighLowRatio", () => {
  it("scores highs vs lows without dividing by zero", () => {
    expect(scoreHighLowRatio(0, 0)).toBe(0);
    expect(scoreHighLowRatio(30, 5)).toBe(2);
    expect(scoreHighLowRatio(5, 30)).toBe(-2);
  });
});

describe("scoreAverageRsi", () => {
  it("maps RSI bands", () => {
    expect(scoreAverageRsi(70)).toBe(2);
    expect(scoreAverageRsi(50)).toBe(0);
    expect(scoreAverageRsi(30)).toBe(-2);
  });
});

describe("classifyMarketMood", () => {
  it("returns Insufficient Data when coverage is low", () => {
    const result = classifyMarketMood({
      breadthPercent: 80,
      quoteCoverage: 0.1,
      emaParticipationPercent: 70,
      newHighs52w: 40,
      newLows52w: 5,
      sectorAdvanceSharePercent: 80,
      averageRsi: 62,
    });
    expect(result.mood).toBe("Insufficient Data");
  });

  it("never classifies from breadth alone", () => {
    const result = classifyMarketMood({
      breadthPercent: 80,
      quoteCoverage: 0.9,
      emaParticipationPercent: null,
      newHighs52w: 0,
      newLows52w: 0,
      sectorAdvanceSharePercent: null,
      averageRsi: null,
    });
    // breadth + high/low (even 0/0 → score 0) = 2 factors → Neutral-ish
    expect(result.factors.length).toBeGreaterThanOrEqual(2);
    expect(result.mood).not.toBe("Insufficient Data");
  });

  it("returns Extremely Bullish when all factors align", () => {
    const result = classifyMarketMood({
      breadthPercent: 72,
      quoteCoverage: 0.85,
      emaParticipationPercent: 75,
      newHighs52w: 50,
      newLows52w: 5,
      sectorAdvanceSharePercent: 78,
      averageRsi: 68,
    });
    expect(result.mood).toBe("Extremely Bullish");
    expect(result.factors.map((f) => f.id)).toEqual(
      expect.arrayContaining([
        "breadth",
        "emaParticipation",
        "highLowRatio",
        "sectorBreadth",
        "averageRsi",
      ])
    );
  });

  it("returns Extremely Bearish when all factors weaken", () => {
    const result = classifyMarketMood({
      breadthPercent: 22,
      quoteCoverage: 0.85,
      emaParticipationPercent: 25,
      newHighs52w: 3,
      newLows52w: 40,
      sectorAdvanceSharePercent: 20,
      averageRsi: 28,
    });
    expect(result.mood).toBe("Extremely Bearish");
  });
});
