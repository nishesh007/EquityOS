/**
 * Volatility Engine — unit tests (Sprint 11B.1C).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OhlcBar } from "@/lib/providers/types";
import {
  MarketContextEngine,
  VolatilityEngine,
  buildVolatilityAnalysis,
  calculateATRExpansion,
  calculateGapRisk,
  calculateVolatilityRegime,
  calculateVolatilityScore,
  calculateVolatilityTrend,
  createFallbackVolatilityAnalysis,
  resetMarketContextEngine,
  type IndexContextSnapshot,
  type VolatilityEngineInput,
} from "./index";

function makeCandles(options: {
  start: number;
  bars: number;
  drift: number;
  rangePct?: number;
  volume?: number;
}): OhlcBar[] {
  const {
    start,
    bars,
    drift,
    rangePct = 0.008,
    volume = 1_000_000,
  } = options;
  const candles: OhlcBar[] = [];
  let price = start;

  for (let index = 0; index < bars; index++) {
    const open = price;
    const close = Math.max(open + drift, 1);
    const high = Math.max(open, close) * (1 + rangePct);
    const low = Math.min(open, close) * (1 - rangePct);
    candles.push({
      timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      open,
      high,
      low,
      close,
      volume,
    });
    price = close;
  }
  return candles;
}

/** First half quiet, second half wide ranges → ATR expansion. */
function expandingCandles(): OhlcBar[] {
  const quiet = makeCandles({
    start: 24_000,
    bars: 30,
    drift: 5,
    rangePct: 0.002,
  });
  const wild = makeCandles({
    start: quiet[quiet.length - 1].close,
    bars: 30,
    drift: 20,
    rangePct: 0.025,
  });
  return [...quiet, ...wild];
}

/** First half wild, second half quiet → ATR compression. */
function compressingCandles(): OhlcBar[] {
  const wild = makeCandles({
    start: 24_000,
    bars: 30,
    drift: 15,
    rangePct: 0.025,
  });
  const quiet = makeCandles({
    start: wild[wild.length - 1].close,
    bars: 30,
    drift: 2,
    rangePct: 0.002,
  });
  return [...wild, ...quiet];
}

function makeIndex(
  partial: Partial<IndexContextSnapshot> &
    Pick<IndexContextSnapshot, "symbol" | "name">
): IndexContextSnapshot {
  const candles = partial.candles ?? [];
  const closes =
    partial.closes ??
    candles.map((bar) => bar.close).filter((close) => close > 0);
  const last = closes[closes.length - 1] ?? partial.price ?? 0;

  return {
    symbol: partial.symbol,
    name: partial.name,
    price: partial.price ?? last,
    changePercent: partial.changePercent ?? 0,
    high: partial.high ?? last * 1.01,
    low: partial.low ?? last * 0.99,
    open: partial.open,
    previousClose: partial.previousClose,
    closes,
    candles,
    available: partial.available ?? true,
  };
}

function baseInput(
  overrides: Partial<VolatilityEngineInput> = {}
): VolatilityEngineInput {
  const candles = makeCandles({
    start: 24_000,
    bars: 60,
    drift: 8,
    rangePct: 0.01,
  });
  const nifty = makeIndex({
    symbol: "NIFTY",
    name: "Nifty 50",
    changePercent: 0.4,
    candles,
    open: candles[candles.length - 1].open,
    previousClose: candles[candles.length - 2]?.close,
  });

  return {
    indiaVix: 14,
    indiaVixChangePercent: 0.5,
    previousIndiaVix: 13.8,
    nifty,
    sensex: makeIndex({
      symbol: "SENSEX",
      name: "Sensex",
      changePercent: 0.35,
      candles: makeCandles({ start: 78_000, bars: 60, drift: 20 }),
    }),
    bankNifty: makeIndex({
      symbol: "BANKNIFTY",
      name: "Bank Nifty",
      changePercent: 0.5,
      candles: makeCandles({ start: 50_000, bars: 60, drift: 15 }),
    }),
    breadthScore: 58,
    marketStrength: 60,
    volumeChangePercent: 5,
    asOf: new Date("2026-07-18T10:00:00Z"),
    ...overrides,
  };
}

describe("VolatilityUtils", () => {
  it("classifies low VIX as Low / Very Low with quiet score", () => {
    const analysis = buildVolatilityAnalysis(
      baseInput({
        indiaVix: 11.2,
        indiaVixChangePercent: -2,
        previousIndiaVix: 12,
        breadthScore: 62,
        marketStrength: 65,
        nifty: makeIndex({
          symbol: "NIFTY",
          name: "Nifty 50",
          changePercent: 0.2,
          high: 24_100,
          low: 24_000,
          price: 24_050,
          candles: makeCandles({
            start: 24_000,
            bars: 60,
            drift: 3,
            rangePct: 0.003,
          }),
        }),
      })
    );

    expect(analysis.score).toBeLessThanOrEqual(45);
    expect(["Very Low", "Low", "Normal"]).toContain(analysis.regime);
    expect(analysis.indiaVix).toBeCloseTo(11.2, 1);
    expect(analysis.reasons.some((r) => r.includes("VIX"))).toBe(true);
  });

  it("classifies high VIX as Elevated / High", () => {
    const analysis = buildVolatilityAnalysis(
      baseInput({
        indiaVix: 21.5,
        indiaVixChangePercent: 6,
        previousIndiaVix: 18,
        breadthScore: 40,
        marketStrength: 42,
      })
    );

    expect(analysis.score).toBeGreaterThanOrEqual(55);
    expect(["Elevated", "High", "Extreme"]).toContain(analysis.regime);
  });

  it("detects extreme VIX spike", () => {
    const analysis = buildVolatilityAnalysis(
      baseInput({
        indiaVix: 28,
        indiaVixChangePercent: 18,
        previousIndiaVix: 20,
        breadthScore: 30,
        marketStrength: 28,
        nifty: makeIndex({
          symbol: "NIFTY",
          name: "Nifty 50",
          changePercent: -1.8,
          candles: expandingCandles(),
        }),
      })
    );

    expect(analysis.score).toBeGreaterThanOrEqual(70);
    expect(["High", "Extreme"]).toContain(analysis.regime);
    expect(analysis.riskMode).toBe("Risk Off");
    expect(
      analysis.reasons.some(
        (r) => r.includes("rising") || r.includes("Extreme") || r.includes("High")
      )
    ).toBe(true);
  });

  it("detects ATR expansion", () => {
    const result = calculateATRExpansion(expandingCandles());
    expect(result.expanding).toBe(true);
    expect(result.compressing).toBe(false);
    expect(result.expansionRatio).not.toBeNull();
    expect(result.expansionRatio as number).toBeGreaterThan(1);
    expect(result.reasons.some((r) => r.includes("expanding"))).toBe(true);
  });

  it("detects ATR compression", () => {
    const result = calculateATRExpansion(compressingCandles());
    expect(result.compressing).toBe(true);
    expect(result.expanding).toBe(false);
    expect(result.reasons.some((r) => r.includes("contracting"))).toBe(true);
  });

  it("detects gap up", () => {
    const gap = calculateGapRisk(
      makeIndex({
        symbol: "NIFTY",
        name: "Nifty 50",
        price: 24_500,
        open: 24_600,
        previousClose: 24_200,
        candles: [],
      })
    );
    expect(gap.direction).toBe("up");
    expect(gap.gapPercent).toBeGreaterThan(0);
    expect(gap.reasons.some((r) => r.includes("gap up"))).toBe(true);
  });

  it("detects gap down", () => {
    const gap = calculateGapRisk(
      makeIndex({
        symbol: "NIFTY",
        name: "Nifty 50",
        price: 24_000,
        open: 23_700,
        previousClose: 24_300,
        candles: [],
      })
    );
    expect(gap.direction).toBe("down");
    expect(gap.gapPercent).toBeLessThan(0);
    expect(gap.reasons.some((r) => r.includes("gap down"))).toBe(true);
  });

  it("scores high intraday range higher than low range", () => {
    const highRange = buildVolatilityAnalysis(
      baseInput({
        indiaVix: 15,
        nifty: makeIndex({
          symbol: "NIFTY",
          name: "Nifty 50",
          price: 24_000,
          high: 24_600,
          low: 23_500,
          candles: makeCandles({
            start: 24_000,
            bars: 60,
            drift: 10,
            rangePct: 0.03,
          }),
        }),
      })
    );
    const lowRange = buildVolatilityAnalysis(
      baseInput({
        indiaVix: 15,
        nifty: makeIndex({
          symbol: "NIFTY",
          name: "Nifty 50",
          price: 24_000,
          high: 24_050,
          low: 23_970,
          candles: makeCandles({
            start: 24_000,
            bars: 60,
            drift: 2,
            rangePct: 0.002,
          }),
        }),
      })
    );

    expect(highRange.intradayRange).toBeGreaterThan(lowRange.intradayRange);
    expect(highRange.dailyRange).toBeGreaterThan(lowRange.dailyRange);
    expect(highRange.score).toBeGreaterThanOrEqual(lowRange.score - 5);
  });

  it("handles missing VIX with multi-factor fallback", () => {
    const analysis = buildVolatilityAnalysis(
      baseInput({
        indiaVix: null,
        indiaVixChangePercent: null,
        previousIndiaVix: null,
      })
    );

    expect(analysis.indiaVix).toBe(0);
    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(analysis.confidence).toBeLessThan(80);
    expect(analysis.reasons.some((r) => r.includes("unavailable"))).toBe(true);
  });

  it("maps score bands to regimes", () => {
    expect(calculateVolatilityRegime(10, 10)).toBe("Very Low");
    expect(calculateVolatilityRegime(35, 12.5)).toBe("Low");
    expect(calculateVolatilityRegime(50, 15)).toBe("Normal");
    expect(calculateVolatilityRegime(65, 18.5)).toBe("Elevated");
    expect(calculateVolatilityRegime(85, 23)).toBe("High");
    expect(calculateVolatilityRegime(95, 30)).toBe("Extreme");
  });

  it("classifies volatility trends", () => {
    expect(
      calculateVolatilityTrend({
        vixMomentum: 8,
        atrExpanding: true,
        atrCompressing: false,
        relativeVolatility: 1.2,
        score: 70,
      })
    ).toBe("Expanding");

    expect(
      calculateVolatilityTrend({
        vixMomentum: -8,
        atrExpanding: false,
        atrCompressing: true,
        relativeVolatility: 0.7,
        score: 30,
      })
    ).toBe("Contracting");

    expect(
      calculateVolatilityTrend({
        vixMomentum: 0.5,
        atrExpanding: false,
        atrCompressing: false,
        relativeVolatility: 1,
        score: 50,
      })
    ).toBe("Stable");
  });

  it("weights volatility score into 0–100", () => {
    const quiet = calculateVolatilityScore({
      vixScore: 15,
      atrScore: 20,
      historicalScore: 25,
      realizedScore: 22,
      rangeScore: 18,
      gapScore: 5,
    });
    const extreme = calculateVolatilityScore({
      vixScore: 90,
      atrScore: 85,
      historicalScore: 80,
      realizedScore: 88,
      rangeScore: 92,
      gapScore: 70,
    });
    expect(quiet).toBeLessThanOrEqual(40);
    expect(extreme).toBeGreaterThanOrEqual(80);
  });
});

describe("VolatilityEngine", () => {
  it("exposes analyze and getCurrentAnalysis", () => {
    const engine = new VolatilityEngine();
    expect(engine.getCurrentAnalysis()).toBeNull();
    const analysis = engine.analyze(baseInput({ indiaVix: 13 }));
    expect(engine.getCurrentAnalysis()).toEqual(analysis);
    expect(analysis.confidence).toBeGreaterThan(0);
  });

  it("threads prior VIX for momentum across runs", () => {
    const engine = new VolatilityEngine();
    engine.analyze(baseInput({ indiaVix: 14, indiaVixChangePercent: null }));
    const second = engine.analyze(
      baseInput({
        indiaVix: 16,
        indiaVixChangePercent: null,
        previousIndiaVix: null,
      })
    );
    expect(second.vixMomentum).not.toBe(0);
  });

  it("returns fallback on total input failure", () => {
    const fallback = createFallbackVolatilityAnalysis(
      new Date(),
      "API failure — neutral volatility"
    );
    expect(fallback.regime).toBe("Normal");
    expect(fallback.riskMode).toBe("Neutral");
    expect(fallback.reasons[0]).toContain("API failure");
  });
});

describe("MarketContextEngine 11B.1C integration", () => {
  beforeEach(() => {
    resetMarketContextEngine();
  });

  afterEach(() => {
    resetMarketContextEngine();
  });

  it("exposes volatilityAnalysis without breaking existing APIs", () => {
    const engine = new MarketContextEngine();
    const context = engine.analyze({
      nifty: makeIndex({
        symbol: "NIFTY",
        name: "Nifty 50",
        changePercent: 0.5,
        candles: makeCandles({ start: 24_000, bars: 60, drift: 8 }),
      }),
      sensex: makeIndex({
        symbol: "SENSEX",
        name: "Sensex",
        changePercent: 0.4,
        candles: [],
      }),
      bankNifty: makeIndex({
        symbol: "BANKNIFTY",
        name: "Bank Nifty",
        changePercent: 0.6,
        candles: [],
      }),
      indiaVix: { level: 13.5, changePercent: -1, available: true },
      breadth: {
        advances: 1300,
        declines: 900,
        unchanged: 80,
        newHighs: 100,
        newLows: 40,
        sectors: [],
        available: true,
      },
      volumeChangePercent: 4,
      asOf: new Date("2026-07-18T10:00:00Z"),
    });

    expect(context.marketStrength).toBeGreaterThanOrEqual(0);
    expect(engine.getCurrentContext()).toEqual(context);

    const volatility = engine.analyzeVolatility(baseInput({ indiaVix: 13.5 }));
    expect(engine.getVolatilityAnalysis()).toEqual(volatility);
    expect(volatility.score).toBeGreaterThanOrEqual(0);
    expect(volatility.score).toBeLessThanOrEqual(100);
  });

  it("handles empty market snapshot gracefully", () => {
    const analysis = buildVolatilityAnalysis({
      indiaVix: null,
      indiaVixChangePercent: null,
      previousIndiaVix: null,
      nifty: {
        symbol: "NIFTY",
        name: "Nifty 50",
        price: 0,
        changePercent: 0,
        high: 0,
        low: 0,
        closes: [],
        candles: [],
        available: false,
      },
      sensex: {
        symbol: "SENSEX",
        name: "Sensex",
        price: 0,
        changePercent: 0,
        high: 0,
        low: 0,
        closes: [],
        candles: [],
        available: false,
      },
      bankNifty: {
        symbol: "BANKNIFTY",
        name: "Bank Nifty",
        price: 0,
        changePercent: 0,
        high: 0,
        low: 0,
        closes: [],
        candles: [],
        available: false,
      },
      breadthScore: null,
      marketStrength: null,
      volumeChangePercent: null,
      asOf: new Date("2026-07-18T10:00:00Z"),
    });

    expect(analysis.regime).toBe("Normal");
    expect(analysis.confidence).toBeLessThanOrEqual(30);
  });
});
