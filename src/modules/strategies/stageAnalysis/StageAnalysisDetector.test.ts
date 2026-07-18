/**
 * Stage Analysis Detection & Trade Construction — tests (Sprint 11B.3M).
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
import {
  StageAnalysisDetector,
  StageAnalysisTradeBuilder,
  buildStageAnalysisExplainability,
  detectStageAnalysis,
  detectStageOnly,
  getStageAnalysisMetrics,
  resetStageAnalysisDetector,
  resetStageAnalysisMetrics,
  resetStageAnalysisTradeBuilder,
  type StageAnalysisCandle,
  type StageAnalysisDetectionContext,
  type StageAnalysisStrategyInput,
  type WeinsteinStage,
} from "./index";

function atIST(hour: number, minute: number, weekOffset = 0): Date {
  return new Date(
    Date.UTC(2025, 0, 6 + weekOffset * 7, hour, minute, 0) - 330 * 60_000
  );
}

function weekly(
  weekOffset: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): StageAnalysisCandle {
  return {
    timestamp: atIST(10, 0, weekOffset),
    open,
    high,
    low,
    close,
    volume,
  };
}

function makeBreadth(score: number): BreadthAnalysis {
  return {
    advanceCount: 1200,
    declineCount: 600,
    unchangedCount: 50,
    advanceDeclineRatio: 2,
    netAdvances: 600,
    breadthPercent: score,
    participationPercent: score,
    equalWeightBreadth: score,
    largeCapBreadth: score,
    midCapBreadth: score,
    smallCapBreadth: score,
    breadthMomentum: 2,
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
      volume: 60,
      momentum: score,
      participation: score,
      confidence: 80,
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

function makeVolatility(score = 35): VolatilityAnalysis {
  return {
    score,
    regime: score >= 60 ? "High" : "Normal",
    trend: "Contracting",
    indiaVix: 12,
    atr: 2,
    historicalVolatility: 12,
    realizedVolatility: 11,
    gapPercent: 0.2,
    dailyRange: 1.2,
    intradayRange: 0.9,
    riskMode: "Neutral",
    confidence: 80,
    reasons: ["Vol"],
    vixTrend: "Contracting",
    vixMomentum: -1,
    atrExpansion: false,
    atrCompression: true,
    relativeVolatility: 0.8,
    volatilityExpansion: false,
    volatilityCompression: true,
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
  regime: MarketRegime["regime"] = "Strong Bull",
  confidence = 80
): MarketRegime {
  return {
    regime,
    confidence,
    priority: 80,
    reasons: [regime],
    triggeredRules: [regime],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(confidence),
  };
}

function makeMarketContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectors = overrides.sectorStrength ?? makeSectors(70);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Strong Bull",
    marketStrength: 70,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(65),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(35),
    riskMode: overrides.riskMode ?? "Neutral",
    confidence: 80,
    healthScore: 70,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
    ...overrides,
  };
}

function eligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "stage-analysis",
      name: "Stage Analysis",
      category: "Swing",
      eligible: true,
      priority: 58,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

type StageFixture = "stage1" | "stage2" | "stage3" | "stage4";

function buildWeekly(stage: StageFixture): {
  candles: StageAnalysisCandle[];
  ma: number;
  maHistory: number[];
} {
  const candles: StageAnalysisCandle[] = [];
  let week = 0;

  if (stage === "stage1") {
    // Flat base around 100 — tight range, no trend
    for (let i = 0; i < 45; i++) {
      const mid = 100 + ((i % 4) - 1.5) * 0.4;
      candles.push(
        weekly(week++, mid - 0.2, mid + 0.8, mid - 0.8, mid + 0.1, 75_000 + i * 150)
      );
    }
    const ma = 100;
    return {
      candles,
      ma,
      maHistory: [100, 100, 100, 100],
    };
  }

  if (stage === "stage2") {
    for (let i = 0; i < 30; i++) {
      const p = 80 + i * 0.4;
      candles.push(weekly(week++, p, p + 1.5, p - 0.5, p + 0.8, 90_000));
    }
    // Rising advance with HH/HL and expanding volume
    for (let i = 0; i < 16; i++) {
      const p = 92 + i * 1.1;
      candles.push(
        weekly(
          week++,
          p,
          p + 2.5,
          p - 0.4,
          p + 1.8,
          110_000 + i * 8_000
        )
      );
    }
    const last = candles[candles.length - 1]!;
    const ma = last.close * 0.94;
    return {
      candles,
      ma,
      maHistory: [ma * 0.97, ma * 0.98, ma * 0.99, ma],
    };
  }

  if (stage === "stage3") {
    for (let i = 0; i < 35; i++) {
      const p = 90 + i * 0.8;
      candles.push(weekly(week++, p, p + 2, p - 0.5, p + 1, 100_000));
    }
    // Choppy top / distribution
    for (let i = 0; i < 12; i++) {
      const p = 118 - (i % 3) * 1.5;
      candles.push(
        weekly(week++, p + 1, p + 2, p - 2, p - 0.8, 160_000 + i * 5_000)
      );
    }
    const last = candles[candles.length - 1]!;
    const ma = last.close * 0.99;
    return {
      candles,
      ma,
      maHistory: [ma * 1.002, ma * 1.001, ma, ma * 0.999],
    };
  }

  // stage4
  for (let i = 0; i < 30; i++) {
    const p = 120 - i * 0.3;
    candles.push(weekly(week++, p, p + 1, p - 0.5, p - 0.2, 100_000));
  }
  for (let i = 0; i < 16; i++) {
    const p = 110 - i * 1.4;
    candles.push(
      weekly(week++, p + 0.5, p + 1, p - 2, p - 1.2, 150_000 + i * 4_000)
    );
  }
  const last = candles[candles.length - 1]!;
  const ma = last.close * 1.08;
  return {
    candles,
    ma,
    maHistory: [ma * 1.04, ma * 1.03, ma * 1.015, ma],
  };
}

function makeInput(
  stage: StageFixture,
  overrides: Partial<StageAnalysisStrategyInput["stageAnalysis"]> = {}
): StageAnalysisStrategyInput {
  const built = buildWeekly(stage);
  const last = built.candles[built.candles.length - 1]!;
  const daily = built.candles.slice(-35).map((c, i) => ({
    ...c,
    timestamp: atIST(10, 0, i),
  }));
  return {
    symbol: "TCS",
    lastPrice: last.close,
    atr: 2,
    stageAnalysis: {
      candlesDaily: daily,
      candlesWeekly: built.candles,
      ma30Week: overrides.ma30Week ?? built.ma,
      ma30WeekHistory: overrides.ma30WeekHistory ?? built.maHistory,
      ema20: overrides.ema20 ?? last.close - 1,
      ema50: overrides.ema50 ?? last.close - 3,
      ema150: overrides.ema150 ?? last.close - 8,
      ema200: overrides.ema200 ?? last.close - 12,
      vwap: overrides.vwap ?? last.close - 0.5,
      atr: overrides.atr ?? 2,
      fiftyTwoWeekHigh: last.close + 5,
      fiftyTwoWeekLow: last.close * 0.7,
      relativeVolume: overrides.relativeVolume ?? 1.4,
      averageVolume20Week: 120_000,
      relativeStrength: overrides.relativeStrength ?? 70,
      previousStage: overrides.previousStage as WeinsteinStage | null | undefined,
      ...overrides,
    },
  };
}

function makeContext(
  input: StageAnalysisStrategyInput,
  overrides: {
    market?: Partial<InstitutionalMarketContext>;
    regime?: MarketRegime;
  } = {}
): StageAnalysisDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(overrides.market),
    regime: overrides.regime ?? makeRegime("Strong Bull", 80),
    confidence: makeConfidence(80),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0),
  };
}

beforeEach(() => {
  resetStageAnalysisDetector();
  resetStageAnalysisTradeBuilder();
  resetStageAnalysisMetrics();
});

afterEach(() => {
  resetStageAnalysisDetector();
  resetStageAnalysisTradeBuilder();
  resetStageAnalysisMetrics();
});

describe("Stage Detection", () => {
  it("detects Stage 1", () => {
    const result = detectStageOnly(makeContext(makeInput("stage1")));
    expect(result.stage).toBe(1);
  });

  it("detects Stage 2", () => {
    const result = detectStageOnly(makeContext(makeInput("stage2")));
    expect(result.stage).toBe(2);
    expect(result.maRising).toBe(true);
  });

  it("detects Stage 3", () => {
    const result = detectStageOnly(makeContext(makeInput("stage3")));
    expect(result.stage).toBe(3);
  });

  it("detects Stage 4", () => {
    const result = detectStageOnly(makeContext(makeInput("stage4")));
    expect(result.stage).toBe(4);
    expect(result.maFalling).toBe(true);
  });

  it("detects Stage 1 → Stage 2 transition", () => {
    const result = detectStageOnly(
      makeContext(makeInput("stage2", { previousStage: 1 }))
    );
    expect(result.stage).toBe(2);
    expect(result.transition).toBe("1_to_2");
    expect(result.transitionConfidence).toBeGreaterThan(50);
  });

  it("detects Stage 2 → Stage 3 transition", () => {
    const result = detectStageOnly(
      makeContext(makeInput("stage3", { previousStage: 2 }))
    );
    expect(result.stage).toBe(3);
    expect(result.transition).toBe("2_to_3");
  });

  it("detects Stage 3 → Stage 4 transition", () => {
    const result = detectStageOnly(
      makeContext(makeInput("stage4", { previousStage: 3 }))
    );
    expect(result.stage).toBe(4);
    expect(result.transition).toBe("3_to_4");
  });

  it("detects Stage 4 → Stage 1 transition", () => {
    const result = detectStageOnly(
      makeContext(makeInput("stage1", { previousStage: 4 }))
    );
    expect(result.stage).toBe(1);
    expect(result.transition).toBe("4_to_1");
  });
});

describe("Stage Analysis Signals", () => {
  it("generates high conviction Stage 2 BUY", () => {
    const input = makeInput("stage2", { previousStage: 1 });
    const context = makeContext(input);
    const detection = detectStageAnalysis(context);
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.stage).toBe(2);

    const setup = new StageAnalysisTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.riskReward).toBeGreaterThanOrEqual(2.5);
    expect(setup.conviction).toBeGreaterThan(55);
    expect(setup.transition).toBe("1_to_2");
  });

  it("generates Stage 4 SELL", () => {
    const input = makeInput("stage4", { previousStage: 3 });
    const context = makeContext(input, {
      regime: makeRegime("Weak Bear", 75),
    });
    const detection = detectStageAnalysis(context);
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("SELL");
    expect(detection.stage).toBe(4);
  });

  it("rejects weak volume on Stage 2", () => {
    const detection = detectStageAnalysis(
      makeContext(
        makeInput("stage2", {
          previousStage: 1,
          relativeVolume: 0.5,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/volume|RS|sector|breadth|Late|Risk|Stage/i);
  });

  it("rejects weak RS", () => {
    const detection = detectStageAnalysis(
      makeContext(
        makeInput("stage2", {
          previousStage: 1,
          relativeStrength: 30,
        })
      )
    );
    expect(detection.detected).toBe(false);
  });

  it("rejects weak breadth", () => {
    const detection = detectStageAnalysis(
      makeContext(makeInput("stage2", { previousStage: 1 }), {
        market: { marketBreadth: makeBreadth(20) },
      })
    );
    expect(detection.detected).toBe(false);
  });

  it("rejects weak sector", () => {
    const detection = detectStageAnalysis(
      makeContext(makeInput("stage2", { previousStage: 1 }), {
        market: { sectorStrength: makeSectors(20), marketStrength: 20 },
      })
    );
    expect(detection.detected).toBe(false);
  });

  it("low conviction when detection fails", () => {
    const input = makeInput("stage1");
    const context = makeContext(input);
    const detection = detectStageAnalysis(context);
    const setup = new StageAnalysisTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBe(0);
    expect(setup.conviction).toBeLessThan(50);
  });

  it("explainability includes Weinstein reasons", () => {
    const input = makeInput("stage2", { previousStage: 1 });
    const context = makeContext(input);
    const detection = detectStageAnalysis(context);
    const setup = new StageAnalysisTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildStageAnalysisExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      saInput: input,
      institutionalScore: setup.institutionalScore,
    });
    const blob = [
      ...explain.summary,
      ...explain.positiveReasons,
      ...detection.reasons,
    ].join(" ");
    expect(blob).toMatch(
      /Stage 2|30-week|Institutional accumulation|Relative Strength|volume/i
    );
  });

  it("records metrics", () => {
    const input = makeInput("stage2", { previousStage: 1 });
    const context = makeContext(input);
    const detection = detectStageAnalysis(context);
    new StageAnalysisTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getStageAnalysisMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThan(0);
  });

  it("detector class wraps detectStageAnalysis", () => {
    const detector = new StageAnalysisDetector();
    const detection = detector.detect(
      makeContext(makeInput("stage2", { previousStage: 1 }))
    );
    expect(detection.detected).toBe(true);
    expect(detector.getLastDetection()?.stage).toBe(2);
  });
});
