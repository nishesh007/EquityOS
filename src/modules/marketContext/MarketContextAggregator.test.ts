/**
 * Market Context Aggregator — unit tests (Sprint 11B.1D).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OhlcBar } from "@/lib/providers/types";
import type { SectorPerformance } from "@/types";
import {
  MarketContextAggregator,
  MarketContextEngine,
  aggregateInstitutionalMarketContext,
  buildAggregatorFingerprint,
  buildBreadthAnalysis,
  buildSectorStrengthAnalysis,
  buildVolatilityAnalysis,
  calculateAggregatorConfidence,
  calculateHealthScore,
  classifyQualityGrade,
  createFallbackBreadthAnalysis,
  createFallbackMarketContext,
  createFallbackSectorStrengthAnalysis,
  createFallbackVolatilityAnalysis,
  resetMarketContextEngine,
  type AggregatorInput,
  type BreadthAnalysis,
  type BreadthEngineInput,
  type IndexContextSnapshot,
  type MarketContext,
  type SectorEngineInput,
  type VolatilityEngineInput,
} from "./index";

function makeCandles(start: number, bars: number, drift: number): OhlcBar[] {
  const candles: OhlcBar[] = [];
  let price = start;
  for (let i = 0; i < bars; i++) {
    const open = price;
    const close = Math.max(open + drift, 1);
    candles.push({
      timestamp: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
      open,
      high: Math.max(open, close) * 1.01,
      low: Math.min(open, close) * 0.99,
      close,
      volume: 1_000_000,
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
    candles.map((c) => c.close).filter((c) => c > 0);
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

const BULL_SECTORS: SectorPerformance[] = [
  { name: "Nifty IT", changePercent: 2.1, breadth: 84 },
  { name: "Nifty Auto", changePercent: 1.6, breadth: 74 },
  { name: "Nifty Metal", changePercent: 1.2, breadth: 69 },
  { name: "Nifty Pharma", changePercent: -0.3, breadth: 42 },
  { name: "Nifty FMCG", changePercent: 0.5, breadth: 58 },
];

const BEAR_SECTORS: SectorPerformance[] = [
  { name: "Nifty IT", changePercent: -1.8, breadth: 28 },
  { name: "Nifty Auto", changePercent: -1.4, breadth: 33 },
  { name: "Nifty Metal", changePercent: -2.1, breadth: 22 },
  { name: "Nifty Pharma", changePercent: 0.2, breadth: 52 },
  { name: "Nifty FMCG", changePercent: -0.8, breadth: 40 },
];

function bullBreadth(): BreadthAnalysis {
  const input: BreadthEngineInput = {
    advances: 1600,
    declines: 700,
    unchanged: 80,
    newHighs: 140,
    newLows: 30,
    sectors: BULL_SECTORS,
    constituents: [
      {
        symbol: "RELIANCE",
        name: "Reliance",
        changePercent: 1.2,
        volume: 1e6,
        relativeVolume: 1.2,
        marketCapCr: 150_000,
        capTier: "large",
        sector: "Energy",
        available: true,
      },
      {
        symbol: "TCS",
        name: "TCS",
        changePercent: 1.5,
        volume: 1e6,
        relativeVolume: 1.1,
        marketCapCr: 140_000,
        capTier: "large",
        sector: "IT",
        available: true,
      },
    ],
    volumeChangePercent: 10,
    previousBreadthPercent: 48,
    asOf: new Date("2026-07-18T10:00:00Z"),
  };
  return buildBreadthAnalysis(input);
}

function bearBreadth(): BreadthAnalysis {
  return buildBreadthAnalysis({
    advances: 500,
    declines: 1700,
    unchanged: 60,
    newHighs: 20,
    newLows: 150,
    sectors: BEAR_SECTORS,
    constituents: [
      {
        symbol: "RELIANCE",
        name: "Reliance",
        changePercent: -1.4,
        volume: 1e6,
        relativeVolume: 1.4,
        marketCapCr: 150_000,
        capTier: "large",
        sector: "Energy",
        available: true,
      },
    ],
    volumeChangePercent: 18,
    previousBreadthPercent: 58,
    asOf: new Date("2026-07-18T10:00:00Z"),
  });
}

function sectorInput(sectors: SectorPerformance[]): SectorEngineInput {
  return {
    sectors,
    constituents: [],
    benchmarkChangePercent: 0.2,
    marketVolumeChangePercent: 5,
    previousScores: {},
    asOf: new Date("2026-07-18T10:00:00Z"),
  };
}

function volInput(vix: number, change = 0): VolatilityEngineInput {
  const candles = makeCandles(24_000, 60, vix > 20 ? 20 : 5);
  return {
    indiaVix: vix,
    indiaVixChangePercent: change,
    previousIndiaVix: vix - change / 10,
    nifty: makeIndex({
      symbol: "NIFTY",
      name: "Nifty 50",
      changePercent: vix > 20 ? -1.2 : 0.5,
      candles,
    }),
    sensex: makeIndex({
      symbol: "SENSEX",
      name: "Sensex",
      changePercent: 0.3,
      candles: makeCandles(78_000, 60, 10),
    }),
    bankNifty: makeIndex({
      symbol: "BANKNIFTY",
      name: "Bank Nifty",
      changePercent: 0.4,
      candles: makeCandles(50_000, 60, 12),
    }),
    breadthScore: vix > 20 ? 35 : 62,
    marketStrength: vix > 20 ? 35 : 65,
    volumeChangePercent: 8,
    asOf: new Date("2026-07-18T10:00:00Z"),
  };
}

function bullContext(): MarketContext {
  return {
    marketTrend: "Strong Bull",
    marketStrength: 78,
    marketBreadth: 72,
    volatility: 28,
    riskMode: "Risk On",
    leadingSectors: ["IT", "Auto"],
    weakSectors: ["Pharma"],
    confidence: 82,
    reasons: ["Nifty above 20EMA", "Market breadth positive"],
    lastUpdated: new Date("2026-07-18T10:00:00Z"),
  };
}

function bearContext(): MarketContext {
  return {
    marketTrend: "Strong Bear",
    marketStrength: 28,
    marketBreadth: 30,
    volatility: 75,
    riskMode: "Risk Off",
    leadingSectors: [],
    weakSectors: ["IT", "Metal"],
    confidence: 80,
    reasons: ["Nifty below 20EMA", "Market breadth negative"],
    lastUpdated: new Date("2026-07-18T10:00:00Z"),
  };
}

function sidewaysContext(): MarketContext {
  return {
    marketTrend: "Sideways",
    marketStrength: 50,
    marketBreadth: 50,
    volatility: 45,
    riskMode: "Neutral",
    leadingSectors: ["FMCG"],
    weakSectors: ["Realty"],
    confidence: 70,
    reasons: ["Balanced tape"],
    lastUpdated: new Date("2026-07-18T10:00:00Z"),
  };
}

function fullBullInput(): AggregatorInput {
  return {
    context: bullContext(),
    breadth: bullBreadth(),
    sector: buildSectorStrengthAnalysis(sectorInput(BULL_SECTORS)),
    volatility: buildVolatilityAnalysis(volInput(12, -1)),
    timestamp: new Date("2026-07-18T10:00:00Z"),
  };
}

describe("AggregatorUtils", () => {
  it("aggregates a bull market into a healthy institutional context", () => {
    const result = aggregateInstitutionalMarketContext(fullBullInput());
    expect(["Strong Bull", "Weak Bull"]).toContain(result.marketTrend);
    expect(result.marketStrength).toBeGreaterThan(60);
    expect(result.healthScore).toBeGreaterThan(55);
    expect(["A+", "A", "B"]).toContain(result.qualityGrade);
    expect(result.summary.length).toBeGreaterThanOrEqual(5);
    expect(result.summary.length).toBeLessThanOrEqual(8);
    expect(result.marketBreadth.score).toBeGreaterThan(55);
    expect(result.sectorStrength.length).toBeGreaterThan(0);
    expect(result.volatility.indiaVix).toBeGreaterThan(0);
  });

  it("aggregates a bear market with defensive risk mode", () => {
    const result = aggregateInstitutionalMarketContext({
      context: bearContext(),
      breadth: bearBreadth(),
      sector: buildSectorStrengthAnalysis(sectorInput(BEAR_SECTORS)),
      volatility: buildVolatilityAnalysis(volInput(24, 8)),
      timestamp: new Date("2026-07-18T10:00:00Z"),
    });
    expect(["Strong Bear", "Weak Bear"]).toContain(result.marketTrend);
    expect(result.healthScore).toBeLessThan(55);
    expect(["Risk Off", "Neutral"]).toContain(result.riskMode);
  });

  it("aggregates sideways markets as neutral", () => {
    const result = aggregateInstitutionalMarketContext({
      context: sidewaysContext(),
      breadth: buildBreadthAnalysis({
        advances: 1050,
        declines: 1000,
        unchanged: 100,
        newHighs: 50,
        newLows: 48,
        sectors: [
          { name: "Nifty IT", changePercent: 0.2, breadth: 52 },
          { name: "Nifty Auto", changePercent: -0.1, breadth: 48 },
        ],
        constituents: [],
        volumeChangePercent: 0,
        previousBreadthPercent: 50,
        asOf: new Date("2026-07-18T10:00:00Z"),
      }),
      sector: buildSectorStrengthAnalysis(
        sectorInput([
          { name: "Nifty IT", changePercent: 0.2, breadth: 52 },
          { name: "Nifty Auto", changePercent: -0.1, breadth: 48 },
        ])
      ),
      volatility: buildVolatilityAnalysis(volInput(15, 0.2)),
      timestamp: new Date("2026-07-18T10:00:00Z"),
    });
    expect(result.marketTrend).toBe("Sideways");
    expect(result.riskMode).toBe("Neutral");
  });

  it("handles high volatility regimes", () => {
    const result = aggregateInstitutionalMarketContext({
      context: bearContext(),
      breadth: bearBreadth(),
      sector: buildSectorStrengthAnalysis(sectorInput(BEAR_SECTORS)),
      volatility: buildVolatilityAnalysis(volInput(28, 15)),
      timestamp: new Date("2026-07-18T10:00:00Z"),
    });
    expect(result.volatility.score).toBeGreaterThan(55);
    expect(result.summary.some((s) => /volatility|VIX|defensive|Risk/i.test(s))).toBe(
      true
    );
  });

  it("reduces confidence on mixed / conflicting signals", () => {
    const aligned = calculateAggregatorConfidence(
      { context: true, breadth: true, sector: true, volatility: true },
      bullContext(),
      bullBreadth(),
      buildSectorStrengthAnalysis(sectorInput(BULL_SECTORS)),
      buildVolatilityAnalysis(volInput(12, -1))
    );
    const mixed = calculateAggregatorConfidence(
      { context: true, breadth: true, sector: true, volatility: true },
      bullContext(),
      bearBreadth(),
      buildSectorStrengthAnalysis(sectorInput(BEAR_SECTORS)),
      buildVolatilityAnalysis(volInput(26, 10))
    );
    expect(mixed.confidence).toBeLessThan(aligned.confidence);
    expect(mixed.warnings.some((w) => w.includes("Conflicting"))).toBe(true);
  });

  it("handles missing breadth with warning and lower confidence", () => {
    const result = aggregateInstitutionalMarketContext({
      context: bullContext(),
      breadth: null,
      sector: buildSectorStrengthAnalysis(sectorInput(BULL_SECTORS)),
      volatility: buildVolatilityAnalysis(volInput(13)),
      timestamp: new Date("2026-07-18T10:00:00Z"),
    });
    expect(result.warnings.some((w) => /breadth/i.test(w))).toBe(true);
    expect(result.confidence).toBeLessThan(bullContext().confidence);
    expect(result.marketBreadth.score).toBe(50);
  });

  it("handles missing sector data", () => {
    const result = aggregateInstitutionalMarketContext({
      context: bullContext(),
      breadth: bullBreadth(),
      sector: null,
      volatility: buildVolatilityAnalysis(volInput(13)),
      timestamp: new Date("2026-07-18T10:00:00Z"),
    });
    expect(result.warnings.some((w) => /sector/i.test(w))).toBe(true);
    expect(result.sectorStrength.length).toBeGreaterThan(0);
  });

  it("handles missing VIX / volatility subsystem", () => {
    const result = aggregateInstitutionalMarketContext({
      context: bullContext(),
      breadth: bullBreadth(),
      sector: buildSectorStrengthAnalysis(sectorInput(BULL_SECTORS)),
      volatility: null,
      timestamp: new Date("2026-07-18T10:00:00Z"),
    });
    expect(result.warnings.some((w) => /volatility/i.test(w))).toBe(true);
    expect(result.volatility.regime).toBe("Normal");
  });

  it("handles complete API failure", () => {
    const result = aggregateInstitutionalMarketContext({
      context: null,
      breadth: null,
      sector: null,
      volatility: null,
      timestamp: new Date("2026-07-18T10:00:00Z"),
    });
    expect(result.marketTrend).toBe("Sideways");
    expect(result.riskMode).toBe("Neutral");
    expect(result.qualityGrade).toBe("C");
    expect(result.warnings.some((w) => /Complete API failure/i.test(w))).toBe(
      true
    );
  });

  it("handles partial API failure without crashing", () => {
    const result = aggregateInstitutionalMarketContext({
      context: bullContext(),
      breadth: null,
      sector: null,
      volatility: buildVolatilityAnalysis(volInput(14)),
      timestamp: new Date("2026-07-18T10:00:00Z"),
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(70);
    expect(result.summary.length).toBeGreaterThanOrEqual(5);
  });

  it("classifies quality grades by health bands", () => {
    expect(classifyQualityGrade(96)).toBe("A+");
    expect(classifyQualityGrade(88)).toBe("A");
    expect(classifyQualityGrade(75)).toBe("B");
    expect(classifyQualityGrade(60)).toBe("C");
  });

  it("computes weighted health score in 0–100", () => {
    const score = calculateHealthScore(
      bullContext(),
      bullBreadth(),
      buildSectorStrengthAnalysis(sectorInput(BULL_SECTORS)),
      buildVolatilityAnalysis(volInput(12))
    );
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("MarketContextAggregator caching", () => {
  it("returns cached result when fingerprints are unchanged", () => {
    const aggregator = new MarketContextAggregator();
    const input = fullBullInput();
    const first = aggregator.aggregate(input);
    const second = aggregator.aggregate(input);
    expect(second).toBe(first);
    expect(buildAggregatorFingerprint(input)).toBe(
      buildAggregatorFingerprint(input)
    );
  });

  it("recomputes when a subsystem section changes", () => {
    const aggregator = new MarketContextAggregator();
    const input = fullBullInput();
    const first = aggregator.aggregate(input);
    const changed: AggregatorInput = {
      ...input,
      breadth: bearBreadth(),
    };
    const second = aggregator.aggregate(changed);
    expect(second).not.toBe(first);
    expect(second.marketBreadth.score).not.toBe(first.marketBreadth.score);
  });
});

describe("MarketContextEngine 11B.1D integration", () => {
  beforeEach(() => {
    resetMarketContextEngine();
  });

  afterEach(() => {
    resetMarketContextEngine();
  });

  it("exposes getInstitutionalContext without breaking prior APIs", () => {
    const engine = new MarketContextEngine();
    const context = engine.analyze({
      nifty: makeIndex({
        symbol: "NIFTY",
        name: "Nifty 50",
        changePercent: 1.0,
        candles: makeCandles(24_000, 60, 30),
      }),
      sensex: makeIndex({
        symbol: "SENSEX",
        name: "Sensex",
        changePercent: 0.9,
        candles: makeCandles(78_000, 60, 40),
      }),
      bankNifty: makeIndex({
        symbol: "BANKNIFTY",
        name: "Bank Nifty",
        changePercent: 1.2,
        candles: makeCandles(50_000, 60, 35),
      }),
      indiaVix: { level: 12.5, changePercent: -1, available: true },
      breadth: {
        advances: 1500,
        declines: 800,
        unchanged: 80,
        newHighs: 120,
        newLows: 30,
        sectors: BULL_SECTORS,
        available: true,
      },
      volumeChangePercent: 8,
      asOf: new Date("2026-07-18T10:00:00Z"),
    });

    engine.analyzeBreadth({
      advances: 1500,
      declines: 800,
      unchanged: 80,
      newHighs: 120,
      newLows: 30,
      sectors: BULL_SECTORS,
      constituents: [],
      volumeChangePercent: 8,
      previousBreadthPercent: null,
      asOf: new Date("2026-07-18T10:00:00Z"),
    });
    engine.analyzeSectorStrength(sectorInput(BULL_SECTORS));
    engine.analyzeVolatility(volInput(12.5, -1));

    const institutional = engine.getInstitutionalContext();
    expect(engine.getCurrentContext()).toEqual(context);
    expect(institutional.marketTrend).toBe(context.marketTrend);
    expect(institutional.healthScore).toBeGreaterThanOrEqual(0);
    expect(institutional.qualityGrade).toMatch(/^(A\+|A|B|C)$/);
    expect(institutional.summary.length).toBeGreaterThanOrEqual(5);
  });

  it("still returns institutional context when subsystems are empty", () => {
    const engine = new MarketContextEngine();
    const institutional = engine.getInstitutionalContext();
    expect(institutional.warnings.length).toBeGreaterThan(0);
    expect(institutional.qualityGrade).toBe("C");
  });
});

describe("fallback helpers remain usable by aggregator", () => {
  it("provides neutral fallbacks for each subsystem", () => {
    expect(createFallbackMarketContext().marketTrend).toBe("Sideways");
    expect(createFallbackBreadthAnalysis().breadthQuality).toBe("Neutral");
    expect(createFallbackSectorStrengthAnalysis().confidence).toBe(20);
    expect(createFallbackVolatilityAnalysis().regime).toBe("Normal");
  });
});
