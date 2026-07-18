/**
 * Breadth & Sector Strength Engine — unit tests (Sprint 11B.1B).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SectorPerformance } from "@/types";
import {
  BreadthEngine,
  SectorStrengthEngine,
  MarketContextEngine,
  buildBreadthAnalysis,
  buildSectorStrengthAnalysis,
  calculateAdvanceDeclineRatio,
  calculateBreadthPercent,
  calculateBreadthScore,
  classifyBreadthQuality,
  classifySectorTrend,
  createFallbackBreadthAnalysis,
  createFallbackSectorStrengthAnalysis,
  resetMarketContextEngine,
  type BreadthEngineInput,
  type ConstituentSnapshot,
  type SectorEngineInput,
} from "./index";

const BULL_SECTORS: SectorPerformance[] = [
  { name: "Nifty IT", changePercent: 2.1, breadth: 84 },
  { name: "Nifty Auto", changePercent: 1.6, breadth: 74 },
  { name: "Nifty Metal", changePercent: 1.2, breadth: 69 },
  { name: "Nifty Pharma", changePercent: -0.4, breadth: 42 },
  { name: "Nifty Realty", changePercent: -0.9, breadth: 31 },
  { name: "Nifty FMCG", changePercent: 0.5, breadth: 58 },
  { name: "Nifty PSU Bank", changePercent: 1.1, breadth: 66 },
];

const BEAR_SECTORS: SectorPerformance[] = [
  { name: "Nifty IT", changePercent: -1.8, breadth: 28 },
  { name: "Nifty Auto", changePercent: -1.4, breadth: 33 },
  { name: "Nifty Metal", changePercent: -2.1, breadth: 22 },
  { name: "Nifty Pharma", changePercent: 0.3, breadth: 55 },
  { name: "Nifty FMCG", changePercent: 0.2, breadth: 52 },
  { name: "Nifty Realty", changePercent: -1.5, breadth: 30 },
  { name: "Nifty PSU Bank", changePercent: -1.2, breadth: 35 },
];

const MIXED_SECTORS: SectorPerformance[] = [
  { name: "Nifty IT", changePercent: 1.8, breadth: 78 },
  { name: "Nifty Auto", changePercent: -1.2, breadth: 34 },
  { name: "Nifty Metal", changePercent: 0.1, breadth: 51 },
  { name: "Nifty Pharma", changePercent: -0.8, breadth: 38 },
  { name: "Nifty FMCG", changePercent: 0.9, breadth: 62 },
];

function makeConstituents(
  specs: Array<{
    symbol: string;
    changePercent: number;
    capTier: "large" | "mid" | "small";
    sector?: string;
    relativeVolume?: number;
  }>
): ConstituentSnapshot[] {
  const capCr = { large: 150_000, mid: 40_000, small: 8_000 };
  return specs.map((spec) => ({
    symbol: spec.symbol,
    name: spec.symbol,
    changePercent: spec.changePercent,
    volume: 1_000_000,
    relativeVolume: spec.relativeVolume ?? 1.2,
    marketCapCr: capCr[spec.capTier],
    capTier: spec.capTier,
    sector: spec.sector ?? null,
    available: true,
  }));
}

function strongBreadthInput(): BreadthEngineInput {
  return {
    advances: 1600,
    declines: 700,
    unchanged: 80,
    newHighs: 150,
    newLows: 25,
    sectors: BULL_SECTORS,
    constituents: makeConstituents([
      { symbol: "RELIANCE", changePercent: 1.2, capTier: "large", sector: "Energy" },
      { symbol: "TCS", changePercent: 1.5, capTier: "large", sector: "IT" },
      { symbol: "HDFCBANK", changePercent: 0.9, capTier: "large", sector: "Banking" },
      { symbol: "PERSISTENT", changePercent: 2.1, capTier: "mid", sector: "IT" },
      { symbol: "COFORGE", changePercent: 1.8, capTier: "mid", sector: "IT" },
      { symbol: "DIXON", changePercent: 2.4, capTier: "small", sector: "IT" },
      { symbol: "KPITTECH", changePercent: 1.1, capTier: "small", sector: "IT" },
    ]),
    volumeChangePercent: 14,
    previousBreadthPercent: 48,
    asOf: new Date("2026-07-18T10:00:00Z"),
  };
}

function weakBreadthInput(): BreadthEngineInput {
  return {
    advances: 520,
    declines: 1700,
    unchanged: 60,
    newHighs: 18,
    newLows: 160,
    sectors: BEAR_SECTORS,
    constituents: makeConstituents([
      { symbol: "RELIANCE", changePercent: -1.4, capTier: "large", sector: "Energy" },
      { symbol: "TCS", changePercent: -1.8, capTier: "large", sector: "IT" },
      { symbol: "HDFCBANK", changePercent: -1.1, capTier: "large", sector: "Banking" },
      { symbol: "PERSISTENT", changePercent: -2.0, capTier: "mid", sector: "IT" },
      { symbol: "COFORGE", changePercent: -1.6, capTier: "mid", sector: "IT" },
      { symbol: "DIXON", changePercent: -2.5, capTier: "small", sector: "IT" },
      { symbol: "KPITTECH", changePercent: -1.9, capTier: "small", sector: "IT" },
    ]),
    volumeChangePercent: 22,
    previousBreadthPercent: 58,
    asOf: new Date("2026-07-18T10:00:00Z"),
  };
}

function sectorInput(
  sectors: SectorPerformance[],
  previousScores: Record<string, number> = {}
): SectorEngineInput {
  return {
    sectors,
    constituents: makeConstituents([
      { symbol: "TCS", changePercent: sectors[0]?.changePercent ?? 0, capTier: "large", sector: "IT" },
      { symbol: "INFY", changePercent: sectors[0]?.changePercent ?? 0, capTier: "large", sector: "IT" },
      { symbol: "MARUTI", changePercent: sectors[1]?.changePercent ?? 0, capTier: "large", sector: "Auto" },
      { symbol: "HDFCBANK", changePercent: 0.5, capTier: "large", sector: "Banking" },
    ]),
    benchmarkChangePercent: 0.2,
    marketVolumeChangePercent: 8,
    previousScores,
    asOf: new Date("2026-07-18T10:00:00Z"),
  };
}

describe("BreadthUtils", () => {
  it("computes advance/decline metrics", () => {
    expect(calculateAdvanceDeclineRatio(1600, 800)).toBe(2);
    expect(calculateBreadthPercent(1600, 800, 100)).toBeCloseTo(64, 0);
  });

  it("scores strong breadth as Very Strong / Strong", () => {
    const analysis = buildBreadthAnalysis(strongBreadthInput());
    expect(analysis.score).toBeGreaterThanOrEqual(60);
    expect(["Very Strong", "Strong"]).toContain(analysis.breadthQuality);
    expect(analysis.advanceCount).toBe(1600);
    expect(analysis.netAdvances).toBeGreaterThan(0);
    expect(analysis.equalWeightBreadth).toBeGreaterThan(50);
    expect(analysis.largeCapBreadth).toBeGreaterThan(50);
    expect(analysis.breadthMomentum).toBeGreaterThan(0);
    expect(analysis.reasons.some((r) => r.includes("advancing"))).toBe(true);
  });

  it("scores weak breadth as Weak / Very Weak", () => {
    const analysis = buildBreadthAnalysis(weakBreadthInput());
    expect(analysis.score).toBeLessThan(40);
    expect(["Weak", "Very Weak"]).toContain(analysis.breadthQuality);
    expect(analysis.netAdvances).toBeLessThan(0);
    expect(analysis.breadthMomentum).toBeLessThan(0);
  });

  it("classifies quality bands", () => {
    expect(classifyBreadthQuality(85)).toBe("Very Strong");
    expect(classifyBreadthQuality(70)).toBe("Strong");
    expect(classifyBreadthQuality(50)).toBe("Neutral");
    expect(classifyBreadthQuality(30)).toBe("Weak");
    expect(classifyBreadthQuality(10)).toBe("Very Weak");
  });

  it("handles missing constituent / sector data gracefully", () => {
    const analysis = buildBreadthAnalysis({
      advances: 1000,
      declines: 900,
      unchanged: 50,
      newHighs: 40,
      newLows: 35,
      sectors: [],
      constituents: [],
      volumeChangePercent: null,
      previousBreadthPercent: null,
      asOf: new Date("2026-07-18T10:00:00Z"),
    });
    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(analysis.equalWeightBreadth).toBe(50);
    expect(analysis.confidence).toBeLessThan(72);
  });

  it("falls back when all counts are missing", () => {
    const fallback = createFallbackBreadthAnalysis();
    expect(fallback.score).toBe(50);
    expect(fallback.breadthQuality).toBe("Neutral");
    expect(fallback.confidence).toBe(20);
  });
});

describe("BreadthEngine", () => {
  it("tracks breadth momentum across analyses", () => {
    const engine = new BreadthEngine();
    const first = engine.analyze({
      ...strongBreadthInput(),
      previousBreadthPercent: null,
    });
    const second = engine.analyze({
      ...strongBreadthInput(),
      advances: 1700,
      declines: 600,
      previousBreadthPercent: null,
    });
    expect(engine.getCurrentAnalysis()).toEqual(second);
    expect(second.breadthPercent).toBeGreaterThan(first.breadthPercent);
    expect(second.breadthMomentum).not.toBe(0);
  });

  it("survives analysis failures with neutral fallback", () => {
    const engine = new BreadthEngine();
    const broken = engine.analyze({
      advances: Number.NaN,
      declines: Number.NaN,
      unchanged: Number.NaN,
      newHighs: 0,
      newLows: 0,
      sectors: [],
      constituents: [],
      volumeChangePercent: null,
      previousBreadthPercent: null,
      asOf: new Date(),
    });
    expect(broken.score).toBeGreaterThanOrEqual(0);
    expect(broken.score).toBeLessThanOrEqual(100);
  });
});

describe("SectorStrengthUtils", () => {
  it("detects bull rotation with improving leaders", () => {
    const analysis = buildSectorStrengthAnalysis(
      sectorInput(BULL_SECTORS, {
        IT: 55,
        Auto: 52,
        Metal: 50,
        Pharma: 48,
        Realty: 45,
        FMCG: 50,
        PSU: 50,
      })
    );

    expect(analysis.leaders.length).toBe(5);
    expect(analysis.weakest.length).toBe(5);
    expect(analysis.leaders[0].score).toBeGreaterThanOrEqual(
      analysis.weakest[0].score
    );
    expect(analysis.rotation.improving.length).toBeGreaterThan(0);
    expect(
      analysis.sectors.every((s) =>
        ["Strong Bull", "Bull", "Neutral", "Bear", "Strong Bear"].includes(s.trend)
      )
    ).toBe(true);
  });

  it("detects bear rotation with weakening sectors", () => {
    const analysis = buildSectorStrengthAnalysis(
      sectorInput(BEAR_SECTORS, {
        IT: 62,
        Auto: 60,
        Metal: 58,
        Pharma: 55,
        FMCG: 54,
        Realty: 50,
        PSU: 52,
      })
    );

    expect(analysis.rotation.weakening.length).toBeGreaterThan(0);
    expect(analysis.weakest[0].score).toBeLessThan(55);
  });

  it("detects mixed rotation", () => {
    const analysis = buildSectorStrengthAnalysis(sectorInput(MIXED_SECTORS));
    expect(analysis.rotation.improving.length + analysis.rotation.weakening.length).toBeGreaterThan(0);
    expect(analysis.rotation.stable.length).toBeGreaterThanOrEqual(0);
    expect(analysis.reasons.length).toBeGreaterThan(0);
  });

  it("handles missing sector data with neutral fallback", () => {
    const analysis = buildSectorStrengthAnalysis({
      sectors: [],
      constituents: [],
      benchmarkChangePercent: null,
      marketVolumeChangePercent: null,
      previousScores: {},
      asOf: new Date("2026-07-18T10:00:00Z"),
    });
    expect(analysis.confidence).toBeLessThanOrEqual(25);
    expect(analysis.sectors.length).toBeGreaterThan(0);
    expect(analysis.sectors.every((s) => s.score === 50)).toBe(true);
  });

  it("isolates single sector failure without aborting the batch", () => {
    const sectors: SectorPerformance[] = [
      { name: "Nifty IT", changePercent: 1.5, breadth: 70 },
      { name: "Nifty Auto", changePercent: Number.NaN, breadth: Number.NaN },
      { name: "Nifty Metal", changePercent: 0.8, breadth: 60 },
    ];
    const analysis = buildSectorStrengthAnalysis(sectorInput(sectors));
    expect(analysis.sectors.length).toBeGreaterThanOrEqual(2);
    expect(analysis.leaders.length).toBeGreaterThan(0);
  });

  it("classifies sector trends by score bands", () => {
    expect(classifySectorTrend(80)).toBe("Strong Bull");
    expect(classifySectorTrend(65)).toBe("Bull");
    expect(classifySectorTrend(50)).toBe("Neutral");
    expect(classifySectorTrend(35)).toBe("Bear");
    expect(classifySectorTrend(15)).toBe("Strong Bear");
  });
});

describe("SectorStrengthEngine", () => {
  it("persists prior scores for rotation detection", () => {
    const engine = new SectorStrengthEngine();
    engine.analyze(sectorInput(MIXED_SECTORS));
    const second = engine.analyze(sectorInput(BULL_SECTORS));
    expect(engine.getCurrentAnalysis()).toEqual(second);
    expect(second.rotation.leaders.length).toBe(5);
  });

  it("returns fallback sector strength package", () => {
    const fallback = createFallbackSectorStrengthAnalysis();
    expect(fallback.leaders.length).toBe(5);
    expect(fallback.weakest.length).toBe(5);
    expect(fallback.rotation.stable.length).toBeGreaterThan(0);
  });
});

describe("MarketContextEngine 11B.1B integration", () => {
  beforeEach(() => {
    resetMarketContextEngine();
  });

  afterEach(() => {
    resetMarketContextEngine();
  });

  it("exposes breadthAnalysis and sectorAnalysis without breaking analyze()", () => {
    const engine = new MarketContextEngine();
    const context = engine.analyze({
      nifty: {
        symbol: "NIFTY",
        name: "Nifty 50",
        price: 24500,
        changePercent: 0.8,
        high: 24600,
        low: 24300,
        closes: [24000, 24100, 24200, 24300, 24500],
        candles: [],
        available: true,
      },
      sensex: {
        symbol: "SENSEX",
        name: "Sensex",
        price: 80000,
        changePercent: 0.7,
        high: 80200,
        low: 79500,
        closes: [],
        candles: [],
        available: true,
      },
      bankNifty: {
        symbol: "BANKNIFTY",
        name: "Bank Nifty",
        price: 52000,
        changePercent: 1.0,
        high: 52200,
        low: 51500,
        closes: [],
        candles: [],
        available: true,
      },
      indiaVix: { level: 12.5, changePercent: -1.2, available: true },
      breadth: {
        advances: 1400,
        declines: 800,
        unchanged: 90,
        newHighs: 120,
        newLows: 30,
        sectors: BULL_SECTORS,
        available: true,
      },
      volumeChangePercent: 10,
      asOf: new Date("2026-07-18T10:00:00Z"),
    });

    expect(context.marketStrength).toBeGreaterThanOrEqual(0);
    expect(engine.getCurrentContext()).toEqual(context);

    const breadth = engine.analyzeBreadth(strongBreadthInput());
    const sectors = engine.analyzeSectorStrength(sectorInput(BULL_SECTORS));

    expect(engine.getBreadthAnalysis()).toEqual(breadth);
    expect(engine.getSectorAnalysis()).toEqual(sectors);
    expect(breadth.score).toBeGreaterThanOrEqual(60);
    expect(sectors.leaders.length).toBe(5);
  });

  it("handles API-style total failure via fallbacks", () => {
    const breadth = createFallbackBreadthAnalysis(
      new Date(),
      "API failure — neutral breadth"
    );
    const sectors = createFallbackSectorStrengthAnalysis(
      new Date(),
      "API failure — neutral sectors"
    );
    expect(breadth.reasons[0]).toContain("API failure");
    expect(sectors.reasons[0]).toContain("API failure");
  });
});

describe("calculateBreadthScore weighting", () => {
  it("returns 0–100 for edge inputs", () => {
    const score = calculateBreadthScore({
      advanceDeclineRatio: 2.5,
      participationPercent: 95,
      equalWeightBreadth: 90,
      largeCapBreadth: 88,
      midCapBreadth: 85,
      smallCapBreadth: 80,
      breadthMomentum: 12,
      newHighs: 200,
      newLows: 10,
    });
    expect(score).toBeGreaterThanOrEqual(80);
    expect(score).toBeLessThanOrEqual(100);
  });
});
