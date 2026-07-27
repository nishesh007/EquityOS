import { describe, expect, it } from "vitest";
import { classifyMarketMood } from "@/lib/market-breadth/mood";
import {
  computeBreadthCoreMetrics,
  computeSectorBreadthMetrics,
  sectorAdvanceSharePercent,
  validateBreadthCorePublication,
} from "@/lib/market-breadth/metrics";

/**
 * Fixture: 6 quoted names with known day changes.
 * +2.0, +0.5, +0.005 (flat via ε), 0, −0.5, −1.2
 * → Advances 2, Declines 2, Unchanged 2
 */
const FIXTURE_CHANGES = [2.0, 0.5, 0.005, 0, -0.5, -1.2];

describe("Market Internals metric validation", () => {
  it("validates Advances, Declines, Unchanged, A/D, Breadth %, Net Advances", () => {
    const rows = FIXTURE_CHANGES.map((changePercent) => ({ changePercent }));
    const core = computeBreadthCoreMetrics(rows);

    expect(core).toEqual({
      advances: 2,
      declines: 2,
      unchanged: 2,
      quotedStocks: 6,
      advanceDeclineRatio: 1,
      breadthPercent: 33.3,
      netAdvances: 0,
      moverParticipationPercent: 66.7,
    });

    const report = validateBreadthCorePublication({
      published: {
        advances: core.advances,
        declines: core.declines,
        unchanged: core.unchanged,
        advanceDeclineRatio: core.advanceDeclineRatio,
        breadthPercent: core.breadthPercent,
        netAdvances: core.netAdvances,
        participationPercent: core.moverParticipationPercent,
      },
      rows,
    });

    for (const row of report) {
      expect(row.correct, `${row.metric}: ${row.currentValue} ≠ ${row.expectedValue}`).toBe(
        true
      );
    }

    // Audit table for institutional sign-off (printed on failure via expect messages).
    expect(
      report.map((r) => ({
        metric: r.metric,
        formula: r.formula,
        source: r.sourceData,
        current: r.currentValue,
        expected: r.expectedValue,
        correct: r.correct,
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "correct": true,
          "current": 2,
          "expected": 2,
          "formula": "count(change% > 0.01)",
          "metric": "Advances",
          "source": "Quoted day change %",
        },
        {
          "correct": true,
          "current": 2,
          "expected": 2,
          "formula": "count(change% < −0.01)",
          "metric": "Declines",
          "source": "Quoted day change %",
        },
        {
          "correct": true,
          "current": 2,
          "expected": 2,
          "formula": "quoted − advances − declines (|change%| ≤ 0.01)",
          "metric": "Unchanged",
          "source": "Quoted day change %",
        },
        {
          "correct": true,
          "current": 1,
          "expected": 1,
          "formula": "advances ÷ declines (if declines>0; else advances)",
          "metric": "A/D Ratio",
          "source": "Advances, Declines",
        },
        {
          "correct": true,
          "current": 33.3,
          "expected": 33.3,
          "formula": "advances ÷ quoted × 100",
          "metric": "Breadth %",
          "source": "Advances, quoted stocks",
        },
        {
          "correct": true,
          "current": 0,
          "expected": 0,
          "formula": "advances − declines",
          "metric": "Net Advances",
          "source": "Advances, Declines",
        },
        {
          "correct": true,
          "current": 66.7,
          "expected": 66.7,
          "formula": "EMA ready → mean(above EMA20/50/200 %); else (A+D)/quoted × 100",
          "metric": "Participation",
          "source": "OHLC EMA sample or mover A/D",
        },
      ]
    `);
  });

  it("validates Sector Breadth formula", () => {
    const sectorRows = [
      { changePercent: 1.2, sector: "IT" },
      { changePercent: 0.8, sector: "IT" },
      { changePercent: -0.5, sector: "IT" },
      { changePercent: -1.0, sector: "Banks" },
      { changePercent: -0.2, sector: "Banks" },
    ];
    const sectors = computeSectorBreadthMetrics(sectorRows);
    // IT: 2/3 = 66.7%, Banks: 0/2 = 0%
    expect(sectors[0]).toMatchObject({
      name: "IT",
      advances: 2,
      declines: 1,
      unchanged: 0,
      total: 3,
      breadth: 66.7,
    });
    expect(sectors[1]).toMatchObject({
      name: "Banks",
      advances: 0,
      declines: 2,
      breadth: 0,
    });
    expect(sectorAdvanceSharePercent(sectors)).toBe(50);

    const report = validateBreadthCorePublication({
      published: {
        advances: 2,
        declines: 3,
        unchanged: 0,
        advanceDeclineRatio: 0.67,
        breadthPercent: 40,
        netAdvances: -1,
        sectorBreadth: sectors.map((s) => ({
          name: s.name,
          breadth: s.breadth,
        })),
      },
      rows: sectorRows,
      sectorRows,
    });
    const sectorRow = report.find((r) => r.metric === "Sector Breadth");
    expect(sectorRow?.correct).toBe(true);
  });

  it("validates Market Mood multi-factor classification", () => {
    const mood = classifyMarketMood({
      breadthPercent: 72,
      quoteCoverage: 0.8,
      emaParticipationPercent: 68,
      newHighs52w: 40,
      newLows52w: 10,
      sectorAdvanceSharePercent: 70,
      averageRsi: 58,
    });
    expect(mood.mood).toBe("Extremely Bullish");
    expect(mood.factors.length).toBeGreaterThanOrEqual(2);

    const thin = classifyMarketMood({
      breadthPercent: 80,
      quoteCoverage: 0.2,
      emaParticipationPercent: null,
      newHighs52w: 0,
      newLows52w: 0,
      sectorAdvanceSharePercent: null,
      averageRsi: null,
    });
    expect(thin.mood).toBe("Insufficient Data");

    const report = validateBreadthCorePublication({
      published: {
        advances: 100,
        declines: 50,
        unchanged: 10,
        advanceDeclineRatio: 2,
        breadthPercent: 62.5,
        netAdvances: 50,
        marketMood: mood.mood,
      },
      rows: Array.from({ length: 160 }, (_, i) => ({
        changePercent: i < 100 ? 1 : i < 150 ? -1 : 0,
      })),
      expectedMood: "Extremely Bullish",
    });
    expect(report.find((r) => r.metric === "Market Mood")?.correct).toBe(true);
  });

  it("documents Market Regime source (pipeline Context → Regime engine)", () => {
    // Regime is not recomputed from A/D counts. It classifies InstitutionalMarketContext
    // via modular rules (trend, volatility, breadth score, risk mode).
    const regimeContract = {
      metric: "Market Regime",
      formula:
        "argmax priority among MarketRegimeRules(InstitutionalMarketContext features)",
      sourceData:
        "Market Intelligence → Trading Pipeline / MarketContext + MarketRegimeEngine",
      note: "Displayed regime label comes from serializeMarketRegime(pipeline), not Market Mood",
    };
    expect(regimeContract.sourceData).toContain("MarketRegimeEngine");
    expect(regimeContract.formula).toContain("MarketRegimeRules");
  });
});
