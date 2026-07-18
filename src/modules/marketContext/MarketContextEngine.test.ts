/**
 * Market Context Engine — unit tests (Sprint 11B.1A).
 * Covers bull / bear / sideways, high / low volatility, missing data, fallback.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OhlcBar } from "@/lib/providers/types";
import type { SectorPerformance } from "@/types";
import {
  MarketContextEngine,
  buildMarketContextFromInput,
  calculateBreadth,
  calculateConfidence,
  calculateMarketStrength,
  calculateRiskMode,
  calculateTrend,
  calculateVolatility,
  createFallbackMarketContext,
  getMarketContextEngine,
  resetMarketContextEngine,
  type BreadthContextSnapshot,
  type IndexContextSnapshot,
  type MarketContextInput,
  type VixContextSnapshot,
} from "./index";

function makeCandles(options: {
  start: number;
  bars: number;
  drift: number;
  volatility?: number;
  volume?: number;
}): OhlcBar[] {
  const { start, bars, drift, volatility = 0.004, volume = 1_000_000 } = options;
  const candles: OhlcBar[] = [];
  let price = start;

  for (let index = 0; index < bars; index++) {
    const open = price;
    const move = drift + Math.sin(index / 3) * volatility * price;
    const close = Math.max(open + move, 1);
    const high = Math.max(open, close) * (1 + volatility * 0.5);
    const low = Math.min(open, close) * (1 - volatility * 0.5);
    candles.push({
      timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      open,
      high,
      low,
      close,
      volume: volume * (1 + (index % 5) * 0.02),
    });
    price = close;
  }

  return candles;
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
    high: partial.high ?? last,
    low: partial.low ?? last,
    open: partial.open,
    previousClose: partial.previousClose,
    closes,
    candles,
    available: partial.available ?? true,
  };
}

const BULL_SECTORS: SectorPerformance[] = [
  { name: "Nifty IT", changePercent: 2.1, breadth: 82 },
  { name: "Nifty Auto", changePercent: 1.6, breadth: 74 },
  { name: "Nifty Metal", changePercent: 1.2, breadth: 69 },
  { name: "Nifty Pharma", changePercent: -0.4, breadth: 42 },
  { name: "Nifty Media", changePercent: -0.9, breadth: 31 },
];

const BEAR_SECTORS: SectorPerformance[] = [
  { name: "Nifty IT", changePercent: -1.8, breadth: 28 },
  { name: "Nifty Auto", changePercent: -1.4, breadth: 33 },
  { name: "Nifty Metal", changePercent: -2.1, breadth: 22 },
  { name: "Nifty Pharma", changePercent: 0.3, breadth: 55 },
  { name: "Nifty FMCG", changePercent: 0.2, breadth: 52 },
];

function bullInput(asOf = new Date("2026-07-18T10:00:00Z")): MarketContextInput {
  const niftyCandles = makeCandles({ start: 22_000, bars: 80, drift: 35 });
  const bankCandles = makeCandles({ start: 48_000, bars: 80, drift: 55 });
  const sensexCandles = makeCandles({ start: 72_000, bars: 80, drift: 90 });

  return {
    nifty: makeIndex({
      symbol: "NIFTY",
      name: "Nifty 50",
      changePercent: 1.15,
      candles: niftyCandles,
    }),
    sensex: makeIndex({
      symbol: "SENSEX",
      name: "Sensex",
      changePercent: 1.05,
      candles: sensexCandles,
    }),
    bankNifty: makeIndex({
      symbol: "BANKNIFTY",
      name: "Bank Nifty",
      changePercent: 1.45,
      candles: bankCandles,
    }),
    indiaVix: { level: 11.8, changePercent: -2.4, available: true },
    breadth: {
      advances: 1450,
      declines: 780,
      unchanged: 90,
      newHighs: 140,
      newLows: 28,
      sectors: BULL_SECTORS,
      available: true,
    },
    volumeChangePercent: 12,
    asOf,
  };
}

function bearInput(asOf = new Date("2026-07-18T10:00:00Z")): MarketContextInput {
  const niftyCandles = makeCandles({ start: 24_500, bars: 80, drift: -40 });
  const bankCandles = makeCandles({ start: 52_000, bars: 80, drift: -70 });
  const sensexCandles = makeCandles({ start: 80_000, bars: 80, drift: -110 });

  return {
    nifty: makeIndex({
      symbol: "NIFTY",
      name: "Nifty 50",
      changePercent: -1.35,
      candles: niftyCandles,
    }),
    sensex: makeIndex({
      symbol: "SENSEX",
      name: "Sensex",
      changePercent: -1.2,
      candles: sensexCandles,
    }),
    bankNifty: makeIndex({
      symbol: "BANKNIFTY",
      name: "Bank Nifty",
      changePercent: -1.6,
      candles: bankCandles,
    }),
    indiaVix: { level: 26.4, changePercent: 9.2, available: true },
    breadth: {
      advances: 620,
      declines: 1580,
      unchanged: 70,
      newHighs: 22,
      newLows: 160,
      sectors: BEAR_SECTORS,
      available: true,
    },
    volumeChangePercent: 18,
    asOf,
  };
}

function sidewaysInput(asOf = new Date("2026-07-18T10:00:00Z")): MarketContextInput {
  const niftyCandles = makeCandles({
    start: 24_000,
    bars: 80,
    drift: 0.5,
    volatility: 0.002,
  });

  return {
    nifty: makeIndex({
      symbol: "NIFTY",
      name: "Nifty 50",
      changePercent: 0.08,
      candles: niftyCandles,
    }),
    sensex: makeIndex({
      symbol: "SENSEX",
      name: "Sensex",
      changePercent: -0.05,
      candles: makeCandles({ start: 78_000, bars: 80, drift: 0.2, volatility: 0.002 }),
    }),
    bankNifty: makeIndex({
      symbol: "BANKNIFTY",
      name: "Bank Nifty",
      changePercent: 0.12,
      candles: makeCandles({ start: 50_000, bars: 80, drift: -0.3, volatility: 0.002 }),
    }),
    indiaVix: { level: 14.5, changePercent: 0.4, available: true },
    breadth: {
      advances: 1050,
      declines: 1020,
      unchanged: 110,
      newHighs: 55,
      newLows: 48,
      sectors: [
        { name: "Nifty IT", changePercent: 0.2, breadth: 52 },
        { name: "Nifty Auto", changePercent: -0.15, breadth: 48 },
        { name: "Nifty Metal", changePercent: 0.1, breadth: 51 },
        { name: "Nifty Pharma", changePercent: -0.05, breadth: 49 },
      ],
      available: true,
    },
    volumeChangePercent: -2,
    asOf,
  };
}

function emptyInput(asOf = new Date("2026-07-18T10:00:00Z")): MarketContextInput {
  const emptyIndex = (symbol: string, name: string): IndexContextSnapshot => ({
    symbol,
    name,
    price: 0,
    changePercent: 0,
    high: 0,
    low: 0,
    closes: [],
    candles: [],
    available: false,
  });

  return {
    nifty: emptyIndex("NIFTY", "Nifty 50"),
    sensex: emptyIndex("SENSEX", "Sensex"),
    bankNifty: emptyIndex("BANKNIFTY", "Bank Nifty"),
    indiaVix: { level: 0, changePercent: 0, available: false },
    breadth: {
      advances: 0,
      declines: 0,
      unchanged: 0,
      newHighs: 0,
      newLows: 0,
      sectors: [],
      available: false,
    },
    volumeChangePercent: null,
    asOf,
  };
}

describe("MarketContextUtils", () => {
  it("detects bullish trend with EMA, momentum, and HH/HL structure", () => {
    const input = bullInput();
    const trend = calculateTrend(input.nifty, input.bankNifty);

    expect(["Strong Bull", "Weak Bull"]).toContain(trend.trend);
    expect(trend.score).toBeGreaterThan(0);
    expect(trend.emaFast).not.toBeNull();
    expect(trend.reasons.some((reason) => reason.includes("EMA"))).toBe(true);
  });

  it("detects bearish trend under declining structure", () => {
    const input = bearInput();
    const trend = calculateTrend(input.nifty, input.bankNifty);

    expect(["Strong Bear", "Weak Bear"]).toContain(trend.trend);
    expect(trend.score).toBeLessThan(0);
  });

  it("classifies sideways markets near equilibrium", () => {
    const input = sidewaysInput();
    const trend = calculateTrend(input.nifty, input.bankNifty);

    expect(trend.trend).toBe("Sideways");
    expect(Math.abs(trend.score)).toBeLessThan(60);
  });

  it("scores positive breadth from advance/decline and sector participation", () => {
    const breadth = calculateBreadth(bullInput().breadth);

    expect(breadth.score).toBeGreaterThan(55);
    expect(breadth.leadingSectors.length).toBeGreaterThan(0);
    expect(breadth.reasons.some((reason) => reason.includes("breadth"))).toBe(true);
  });

  it("scores weak breadth in selloffs", () => {
    const breadth = calculateBreadth(bearInput().breadth);

    expect(breadth.score).toBeLessThan(45);
    expect(breadth.weakSectors.length).toBeGreaterThan(0);
  });

  it("marks low volatility when India VIX is subdued", () => {
    const input = bullInput();
    const volatility = calculateVolatility(input.indiaVix, input.nifty);

    expect(volatility.score).toBeLessThan(45);
    expect(volatility.regime).toBe("low");
    expect(volatility.reasons.some((reason) => reason.includes("VIX"))).toBe(true);
  });

  it("marks high volatility when India VIX spikes", () => {
    const input = bearInput();
    const volatility = calculateVolatility(input.indiaVix, input.nifty);

    expect(volatility.score).toBeGreaterThan(55);
    expect(["elevated", "extreme"]).toContain(volatility.regime);
  });

  it("weights market strength components to a 0–100 score", () => {
    const input = bullInput();
    const trend = calculateTrend(input.nifty, input.bankNifty);
    const breadth = calculateBreadth(input.breadth);
    const volatility = calculateVolatility(input.indiaVix, input.nifty);
    const strength = calculateMarketStrength(
      trend,
      breadth,
      volatility,
      input.breadth.sectors
    );

    expect(strength.marketStrength).toBeGreaterThanOrEqual(0);
    expect(strength.marketStrength).toBeLessThanOrEqual(100);
    expect(strength.components.trend).toBeGreaterThan(50);
  });

  it("raises confidence when factors agree", () => {
    const input = bullInput();
    const trend = calculateTrend(input.nifty, input.bankNifty);
    const breadth = calculateBreadth(input.breadth);
    const volatility = calculateVolatility(input.indiaVix, input.nifty);
    const strength = calculateMarketStrength(
      trend,
      breadth,
      volatility,
      input.breadth.sectors
    );
    const risk = calculateRiskMode(
      trend,
      breadth,
      volatility,
      strength.marketStrength
    );
    const confidence = calculateConfidence(
      trend,
      breadth,
      volatility,
      risk,
      strength.marketStrength
    );

    expect(confidence.confidence).toBeGreaterThan(50);
    expect(confidence.missingFactorCount).toBe(0);
  });

  it("handles missing breadth gracefully", () => {
    const missing: BreadthContextSnapshot = {
      advances: 0,
      declines: 0,
      unchanged: 0,
      newHighs: 0,
      newLows: 0,
      sectors: [],
      available: false,
    };
    const breadth = calculateBreadth(missing);

    expect(breadth.score).toBe(50);
    expect(breadth.reasons.some((reason) => reason.includes("unavailable"))).toBe(
      true
    );
  });

  it("handles missing VIX gracefully", () => {
    const vix: VixContextSnapshot = {
      level: 0,
      changePercent: 0,
      available: false,
    };
    const index = makeIndex({
      symbol: "NIFTY",
      name: "Nifty 50",
      changePercent: 0.2,
      candles: makeCandles({ start: 24_000, bars: 40, drift: 5 }),
      available: true,
    });
    const volatility = calculateVolatility(vix, index);

    expect(volatility.score).toBeGreaterThanOrEqual(0);
    expect(volatility.score).toBeLessThanOrEqual(100);
    expect(volatility.indiaVix).toBeNull();
  });
});

describe("MarketContextEngine", () => {
  beforeEach(() => {
    resetMarketContextEngine();
  });

  afterEach(() => {
    resetMarketContextEngine();
  });

  it("returns a fully populated MarketContext for bull markets", () => {
    const engine = new MarketContextEngine();
    const context = engine.analyze(bullInput());

    expect(["Strong Bull", "Weak Bull"]).toContain(context.marketTrend);
    expect(context.marketStrength).toBeGreaterThan(55);
    expect(context.marketBreadth).toBeGreaterThan(55);
    expect(context.volatility).toBeLessThan(50);
    expect(context.riskMode).toBe("Risk On");
    expect(context.leadingSectors.length).toBeGreaterThan(0);
    expect(context.confidence).toBeGreaterThan(40);
    expect(context.reasons.length).toBeGreaterThan(2);
    expect(context.lastUpdated).toBeInstanceOf(Date);
    expect(engine.getCurrentContext()).toEqual(context);
  });

  it("returns bearish context for selloff conditions", () => {
    const engine = getMarketContextEngine();
    const context = engine.analyze(bearInput());

    expect(["Strong Bear", "Weak Bear"]).toContain(context.marketTrend);
    expect(context.marketStrength).toBeLessThan(50);
    expect(context.volatility).toBeGreaterThan(50);
    expect(context.riskMode).toBe("Risk Off");
    expect(context.weakSectors.length).toBeGreaterThan(0);
  });

  it("returns sideways / neutral context in balanced markets", () => {
    const engine = new MarketContextEngine();
    const context = engine.analyze(sidewaysInput());

    expect(context.marketTrend).toBe("Sideways");
    expect(context.riskMode).toBe("Neutral");
    expect(context.marketStrength).toBeGreaterThanOrEqual(35);
    expect(context.marketStrength).toBeLessThanOrEqual(65);
  });

  it("applies graceful fallback when all data is missing", () => {
    const engine = new MarketContextEngine();
    const context = engine.analyze(emptyInput());

    expect(context.marketTrend).toBe("Sideways");
    expect(context.marketStrength).toBe(50);
    expect(context.marketBreadth).toBe(50);
    expect(context.volatility).toBe(50);
    expect(context.riskMode).toBe("Neutral");
    expect(context.confidence).toBeLessThanOrEqual(40);
    expect(context.reasons.length).toBeGreaterThan(0);
  });

  it("exposes createFallbackMarketContext for service-level recovery", () => {
    const fallback = createFallbackMarketContext(new Date("2026-07-18T12:00:00Z"));

    expect(fallback.marketTrend).toBe("Sideways");
    expect(fallback.confidence).toBe(25);
    expect(fallback.leadingSectors).toEqual([]);
  });

  it("buildMarketContextFromInput matches engine.analyze output shape", () => {
    const input = bullInput();
    const built = buildMarketContextFromInput(input);
    const analyzed = new MarketContextEngine().analyze(input);

    expect(built.marketTrend).toBe(analyzed.marketTrend);
    expect(built.riskMode).toBe(analyzed.riskMode);
    expect(typeof built.marketStrength).toBe("number");
    expect(typeof built.confidence).toBe("number");
    expect(Array.isArray(built.reasons)).toBe(true);
  });

  it("getCurrentContext is null before first analyze", () => {
    const engine = new MarketContextEngine();
    expect(engine.getCurrentContext()).toBeNull();
  });
});

describe("MarketContextService contracts", () => {
  it("map helpers remain reachable via module barrel", async () => {
    const { mapRawDataToMarketContextInput, MarketContextService } = await import(
      "./MarketContextService"
    );

    const raw = {
      indices: [],
      breadth: {
        advances: 0,
        declines: 0,
        unchanged: 0,
        newHighs: 0,
        newLows: 0,
        sectors: [],
        gainers: [],
        losers: [],
        weekHighs: [],
        weekLows: [],
        mostActive: [],
      },
      pulse: {
        indiaVix: 0,
        indiaVixChange: 0,
        institutionalFlow: { fii: 0, dii: 0, asOf: "" },
        putCallRatio: 0,
        marketTrend: "Neutral" as const,
        breadthScore: 50,
      },
      niftyCandles: [],
      bankNiftyCandles: [],
      sensexCandles: [],
      fetchedAt: new Date("2026-07-18T10:00:00Z"),
    };

    const input = mapRawDataToMarketContextInput(raw);
    expect(input.nifty.available).toBe(false);
    expect(input.indiaVix.available).toBe(false);

    const service = new MarketContextService();
    const received: string[] = [];
    const unsubscribe = service.subscribe((context) => {
      received.push(context.marketTrend);
    });
    unsubscribe();
    expect(received).toEqual([]);
  });
});
