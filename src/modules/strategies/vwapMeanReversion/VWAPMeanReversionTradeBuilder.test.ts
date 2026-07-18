/**
 * VWAP Mean Reversion Trade Construction — unit tests (Sprint 11B.3D.2).
 * Does not modify detection logic; consumes VWAPMeanReversionDetection fixtures.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  BreadthAnalysis,
  InstitutionalMarketContext,
  SectorAnalysis,
  SectorRotationSummary,
  VolatilityAnalysis,
} from "@/src/modules/marketContext";
import type {
  MarketRegime,
  RegimeConfidenceAnalysis,
} from "@/src/modules/marketRegime";
import type { EligibleStrategy } from "@/src/modules/strategyEligibility";
import type { StrategyExecutionContext } from "../StrategyTypes";
import {
  VWAPMeanReversionStrategy,
  VWAPMeanReversionTradeBuilder,
  calculateAtrStop,
  calculateSwingStop,
  calculateVWAPMeanReversionEntry,
  calculateVWAPMeanReversionTradeQuality,
  generateVWAPMeanReversionTargets,
  resetVWAPMeanReversionTradeBuilder,
  resolveStopLoss,
  type VWAPMeanReversionCandle,
  type VWAPMeanReversionDetection,
  type VWAPMeanReversionStrategyInput,
  type VWAPMeanReversionTradeConfig,
} from "./index";
import {
  DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG,
  resolveVWAPMeanReversionTradeConfig,
} from "./VWAPMeanReversionTradeTypes";

function atIST(hour: number, minute: number): Date {
  return new Date(Date.UTC(2026, 6, 18, hour, minute, 0) - 330 * 60_000);
}

function candle(
  hour: number,
  minute: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): VWAPMeanReversionCandle {
  return {
    timestamp: atIST(hour, minute),
    open,
    high,
    low,
    close,
    volume,
  };
}

function makeBreadth(score: number): BreadthAnalysis {
  return {
    advanceCount: 1000,
    declineCount: 800,
    unchangedCount: 50,
    advanceDeclineRatio: 1.25,
    netAdvances: 200,
    breadthPercent: score,
    participationPercent: score,
    equalWeightBreadth: score,
    largeCapBreadth: score,
    midCapBreadth: score,
    smallCapBreadth: score,
    breadthMomentum: 1,
    breadthQuality: score >= 60 ? "Strong" : "Weak",
    score,
    confidence: 80,
    reasons: ["Breadth"],
    lastUpdated: atIST(10, 0),
  };
}

function makeSectors(score: number): SectorAnalysis[] {
  return [
    {
      sector: "IT",
      score,
      trend: score >= 60 ? "Bull" : "Bear",
      relativeStrength: score,
      breadth: score,
      volume: 55,
      momentum: score,
      participation: score,
      confidence: 75,
      reasons: ["Sector"],
    },
  ];
}

function makeRotation(sectors: SectorAnalysis[]): SectorRotationSummary {
  return {
    improving: sectors.map((s) => s.sector),
    weakening: [],
    stable: [],
    leaders: sectors.map((s) => s.sector),
    laggards: [],
    reasons: ["Rotation"],
  };
}

function makeVolatility(): VolatilityAnalysis {
  return {
    score: 40,
    regime: "Normal",
    trend: "Stable",
    indiaVix: 14,
    atr: 0.5,
    historicalVolatility: 14,
    realizedVolatility: 13,
    gapPercent: 0.2,
    dailyRange: 1,
    intradayRange: 0.8,
    riskMode: "Neutral",
    confidence: 80,
    reasons: ["Vol"],
    vixTrend: "Stable",
    vixMomentum: 0,
    atrExpansion: false,
    atrCompression: false,
    relativeVolatility: 1,
    volatilityExpansion: false,
    volatilityCompression: false,
    gapDirection: "flat",
    lastUpdated: atIST(10, 0),
  };
}

function makeConfidence(score: number): RegimeConfidenceAnalysis {
  return {
    score,
    grade: score >= 85 ? "High" : score >= 70 ? "Good" : "Moderate",
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    contributions: [],
    summary: [`Confidence ${score}`],
  };
}

function makeRegime(
  regime: MarketRegime["regime"] = "Sideways",
  confidence = 75
): MarketRegime {
  return {
    regime,
    confidence,
    priority: 70,
    reasons: [regime],
    triggeredRules: [regime],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(confidence),
  };
}

function makeMarketContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectors = overrides.sectorStrength ?? makeSectors(55);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Sideways",
    marketStrength: 55,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(55),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(),
    riskMode: overrides.riskMode ?? "Neutral",
    confidence: 80,
    healthScore: 65,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
    ...overrides,
  };
}

function bullCandles(): VWAPMeanReversionCandle[] {
  return [
    candle(9, 20, 99.8, 100.0, 99.0, 99.2, 110_000),
    candle(9, 25, 99.2, 99.4, 98.4, 98.6, 115_000),
    candle(9, 30, 98.6, 98.8, 97.8, 98.0, 120_000),
    candle(9, 35, 98.0, 98.2, 97.5, 97.7, 110_000),
    candle(9, 40, 97.7, 97.95, 97.45, 97.7, 100_000),
    candle(9, 45, 97.7, 97.9, 97.5, 97.75, 95_000),
    candle(9, 50, 97.75, 97.95, 97.55, 97.8, 92_000),
    candle(9, 55, 97.8, 98.25, 97.55, 98.05, 98_000),
  ];
}

function bearCandles(): VWAPMeanReversionCandle[] {
  return [
    candle(9, 20, 100.2, 101.0, 100.0, 100.8, 110_000),
    candle(9, 25, 100.8, 101.6, 100.6, 101.4, 115_000),
    candle(9, 30, 101.4, 102.2, 101.2, 102.0, 120_000),
    candle(9, 35, 102.0, 102.5, 101.8, 102.3, 110_000),
    candle(9, 40, 102.3, 102.55, 102.05, 102.3, 100_000),
    candle(9, 45, 102.3, 102.5, 102.1, 102.25, 95_000),
    candle(9, 50, 102.25, 102.45, 102.05, 102.2, 92_000),
    candle(9, 55, 102.2, 102.55, 101.85, 101.95, 98_000),
  ];
}

function bullDetection(
  overrides: Partial<VWAPMeanReversionDetection> = {}
): VWAPMeanReversionDetection {
  return {
    detected: true,
    direction: "BUY",
    vwap: 100,
    deviation: -1.95,
    deviationBand: 1,
    rsi: 22,
    reversalConfirmed: true,
    volumeStable: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    confidence: 78,
    reasons: ["VWAP BUY mean reversion detected."],
    warnings: [],
    ...overrides,
  };
}

function bearDetection(
  overrides: Partial<VWAPMeanReversionDetection> = {}
): VWAPMeanReversionDetection {
  return {
    detected: true,
    direction: "SELL",
    vwap: 100,
    deviation: 1.95,
    deviationBand: 1,
    rsi: 78,
    reversalConfirmed: true,
    volumeStable: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    confidence: 76,
    reasons: ["VWAP SELL mean reversion detected."],
    warnings: [],
    ...overrides,
  };
}

function makeInput(
  candles: VWAPMeanReversionCandle[],
  overrides: Partial<VWAPMeanReversionStrategyInput["vwapMeanReversion"]> = {}
): VWAPMeanReversionStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 0.5,
    vwapMeanReversion: {
      candles5m: candles,
      vwap: 100,
      vwapStdDev: 1,
      bands: { upper: 102, lower: 98, sigma: 1 },
      relativeVolume: 1.0,
      atr: 0.5,
      averageVolume: 100_000,
      rsi: 25,
      recentSwingHigh: 101.5,
      recentSwingLow: 97.45,
      ...overrides,
    },
  };
}

function makeEligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "vwap-mean-reversion",
      name: "VWAP Mean Reversion",
      category: "Scalp",
      eligible: true,
      priority: 84,
      score: 75,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function makeContext(
  candles: VWAPMeanReversionCandle[]
): StrategyExecutionContext {
  const regime = makeRegime();
  const marketContext = makeMarketContext();
  return {
    input: makeInput(candles),
    marketContext,
    regime,
    confidence: regime.confidenceAnalysis,
    eligibleStrategies: makeEligible(),
    riskMode: marketContext.riskMode,
    timestamp: atIST(10, 0),
  };
}

function tradeConfig(
  partial?: Partial<VWAPMeanReversionTradeConfig>
): VWAPMeanReversionTradeConfig {
  return resolveVWAPMeanReversionTradeConfig({
    maxRiskPercentOfPrice: 0.05,
    ...partial,
  });
}

describe("VWAP Mean Reversion entry / stop / targets", () => {
  it("uses confirmation candle close as primary BUY entry", () => {
    const entry = calculateVWAPMeanReversionEntry({
      detection: bullDetection(),
      candles: bullCandles(),
      vwap: 100,
      mode: "confirmation_close",
    });
    expect(entry).toBe(98.05);
  });

  it("computes ATR Stop", () => {
    const stop = calculateAtrStop(bullDetection(), 98.05, 0.5, {
      ...DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG,
      atrStopMultiple: 1,
    });
    expect(stop).toBe(97.55);
  });

  it("computes Swing Stop", () => {
    const stop = calculateSwingStop(
      bullDetection(),
      bullCandles(),
      tradeConfig(),
      101.5,
      97.45
    );
    expect(stop).toBe(97.45);
  });

  it("selects Hybrid Stop as safest within risk limit", () => {
    const resolved = resolveStopLoss({
      detection: bullDetection(),
      entry: 98.05,
      atr: 0.5,
      candles: bullCandles(),
      recentSwingLow: 97.45,
      method: "hybrid",
      config: tradeConfig(),
    });
    expect(resolved.stopLoss).not.toBeNull();
    expect(resolved.stopLoss!).toBeLessThan(98.05);
    expect(resolved.candidates.length).toBeGreaterThan(0);
  });

  it("generates VWAP Target with RR >= 2", () => {
    const result = generateVWAPMeanReversionTargets({
      detection: bullDetection(),
      entry: 98.05,
      stopLoss: 97.55,
      vwap: 100,
      atr: 0.5,
      candles: bullCandles(),
      recentSwingHigh: 101.5,
      config: tradeConfig(),
    });
    expect(result.targets).not.toBeNull();
    expect(result.targets!.finalRr).toBeGreaterThanOrEqual(2);
    expect(result.targets!.finalTarget).toBeGreaterThan(98.05);
  });

  it("supports Measured Move targets", () => {
    const result = generateVWAPMeanReversionTargets({
      detection: bullDetection(),
      entry: 98.05,
      stopLoss: 97.55,
      vwap: 100,
      atr: 0.5,
      candles: bullCandles(),
      config: tradeConfig(),
    });
    expect(result.targets).not.toBeNull();
    expect(
      ["vwap_mean_reversion", "mean_reversion_completion", "measured_move", "vwap_plus_atr", "previous_resistance", "dynamic_projection"].includes(
        result.targets!.method
      )
    ).toBe(true);
  });
});

describe("VWAPMeanReversionTradeBuilder", () => {
  beforeEach(() => {
    resetVWAPMeanReversionTradeBuilder();
  });
  afterEach(() => {
    resetVWAPMeanReversionTradeBuilder();
  });

  it("builds Bullish Reversal trade", () => {
    const builder = new VWAPMeanReversionTradeBuilder(tradeConfig());
    const setup = builder.build({
      detection: bullDetection(),
      marketContext: makeMarketContext(),
      input: makeInput(bullCandles()),
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.stopLoss).toBeLessThan(setup.entry);
    expect(setup.riskReward).toBeGreaterThanOrEqual(2);
    expect(setup.target1).toBeGreaterThan(setup.entry);
    expect(setup.detection.direction).toBe("BUY");
    expect(setup.qualityScore).toBeGreaterThan(0);
  });

  it("builds Bearish Reversal trade", () => {
    const builder = new VWAPMeanReversionTradeBuilder(tradeConfig());
    const setup = builder.build({
      detection: bearDetection(),
      marketContext: makeMarketContext({
        marketBreadth: makeBreadth(45),
        sectorStrength: makeSectors(45),
      }),
      input: makeInput(bearCandles(), {
        recentSwingHigh: 102.55,
        recentSwingLow: 100.0,
        rsi: 78,
      }),
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.stopLoss).toBeGreaterThan(setup.entry);
    expect(setup.riskReward).toBeGreaterThanOrEqual(2);
    expect(setup.detection.direction).toBe("SELL");
  });

  it("rejects Low RR", () => {
    const builder = new VWAPMeanReversionTradeBuilder(
      tradeConfig({ minimumRiskReward: 10 })
    );
    const setup = builder.build({
      detection: bullDetection(),
      marketContext: makeMarketContext(),
      input: makeInput(bullCandles()),
    });
    expect(setup.entry).toBe(0);
    expect(setup.warnings.some((w) => /RR below threshold/i.test(w))).toBe(
      true
    );
  });

  it("rejects Invalid Entry when candles missing", () => {
    const builder = new VWAPMeanReversionTradeBuilder(tradeConfig());
    const setup = builder.build({
      detection: bullDetection(),
      marketContext: makeMarketContext(),
      input: {
        symbol: "RELIANCE",
        lastPrice: 98,
        atr: 0.5,
        vwapMeanReversion: {
          candles5m: [],
          vwap: 100,
          relativeVolume: 1,
          atr: 0.5,
        },
      },
    });
    expect(setup.entry).toBe(0);
    expect(setup.warnings.some((w) => /Invalid entry/i.test(w))).toBe(true);
  });

  it("rejects Invalid Stop when atr/swings unavailable", () => {
    const builder = new VWAPMeanReversionTradeBuilder(
      tradeConfig({
        stopMethod: "atr",
        maxRiskPercentOfPrice: 0.00001,
      })
    );
    const setup = builder.build({
      detection: bullDetection(),
      marketContext: makeMarketContext(),
      input: makeInput(bullCandles(), { atr: null }),
    });
    expect(setup.entry).toBe(0);
    expect(
      setup.warnings.some((w) => /Invalid stop|ATR stop|Risk exceeds/i.test(w))
    ).toBe(true);
  });

  it("scores Excellent Setup quality", () => {
    const quality = calculateVWAPMeanReversionTradeQuality({
      detection: bullDetection({ confidence: 95, deviation: -2.2 }),
      marketContext: makeMarketContext({
        marketStrength: 70,
        marketBreadth: makeBreadth(70),
        sectorStrength: makeSectors(70),
      }),
      riskReward: 3,
    });
    expect(quality.score).toBeGreaterThanOrEqual(70);
    expect(["Exceptional", "High", "Good"]).toContain(quality.grade);
  });

  it("scores Weak Setup quality", () => {
    const quality = calculateVWAPMeanReversionTradeQuality({
      detection: bullDetection({
        confidence: 40,
        reversalConfirmed: false,
        volumeStable: false,
        breadthConfirmed: false,
        sectorConfirmed: false,
        marketConfirmed: false,
        deviation: -1.5,
      }),
      marketContext: makeMarketContext({
        marketStrength: 30,
        marketBreadth: makeBreadth(30),
        sectorStrength: makeSectors(30),
      }),
      riskReward: 2,
    });
    expect(quality.grade).toBe("Poor");
    expect(quality.score).toBeLessThan(45);
  });

  it("reflects High Confidence in quality", () => {
    const high = calculateVWAPMeanReversionTradeQuality({
      detection: bullDetection({ confidence: 92 }),
      marketContext: makeMarketContext(),
      riskReward: 3,
    });
    const low = calculateVWAPMeanReversionTradeQuality({
      detection: bullDetection({ confidence: 45 }),
      marketContext: makeMarketContext(),
      riskReward: 3,
    });
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("reflects Low Confidence in quality", () => {
    const quality = calculateVWAPMeanReversionTradeQuality({
      detection: bullDetection({ confidence: 40 }),
      marketContext: makeMarketContext(),
      riskReward: 2,
    });
    expect(quality.score).toBeLessThan(80);
  });
});

describe("VWAPMeanReversionStrategy trade construction", () => {
  it("generateSignal uses trade validity", () => {
    const strategy = new VWAPMeanReversionStrategy();
    const analysis = {
      bias: "Bullish" as const,
      score: 80,
      notes: [],
      metrics: { tradeValid: 1, detected: 1 },
    };
    expect(strategy.generateSignal(makeContext(bullCandles()), analysis)).toBe(
      "BUY"
    );
    expect(
      strategy.generateSignal(makeContext(bullCandles()), {
        ...analysis,
        metrics: { tradeValid: 0, detected: 1 },
      })
    ).toBe("IGNORE");
  });

  it("returns trade setup shape via buildTradeSetup", () => {
    const builder = new VWAPMeanReversionTradeBuilder(tradeConfig());
    const setup = builder.build({
      detection: bullDetection(),
      marketContext: makeMarketContext(),
      input: makeInput(bullCandles()),
    });
    expect(setup).toHaveProperty("entry");
    expect(setup).toHaveProperty("stopLoss");
    expect(setup).toHaveProperty("qualityGrade");
    expect(setup.detection).toBeDefined();
  });
});
