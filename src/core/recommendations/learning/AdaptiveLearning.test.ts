import { beforeEach, describe, expect, it } from "vitest";
import {
  calculateHealthForRecommendation,
  createLivingRecommendation,
  evaluateAndStoreOutcome,
  getLivingRecommendation,
  getRecommendationHealth,
  getRecommendationReplay,
  resetRecommendationRegistry,
  updateRecommendationStatus,
  type CreateRecommendationSnapshotInput,
} from "../index";
import {
  RECOMMENDATION_LEARNING_EMPTY,
  buildHistoricalLearning,
  buildRecommendationCalibration,
  calibrateFutureRecommendation,
  discoverHistoricalPatterns,
  getAILessons,
  getCalibration,
  getHistoricalPatterns,
  getLearningSummary,
  learnFromRecommendation,
  presentCalibration,
  presentLearningDashboard,
  presentLearningForSurface,
  presentPatterns,
  resetAdaptiveLearning,
  wireLearningAIResearch,
  wireLearningAIScreener,
  wireLearningDashboard,
  wireLearningHistory,
  wireLearningRecommendationCenter,
  wireLearningReplay,
  wireLearningValidation,
  type RecommendationLearningSource,
} from "./index";

function input(
  symbol: string,
  generatedAt: string,
  strategy = "Swing",
  marketRegime = "RISK_ON",
  sector = "Auto"
): CreateRecommendationSnapshotInput {
  return {
    company: { symbol, name: `${symbol} Limited`, exchange: "NSE" },
    strategy,
    generatedAt,
    generatedByEngine: strategy,
    aiVersion: "9F.1.R6",
    originalConviction: 84,
    originalTrust: 88,
    originalValidation: {
      validationStatus: "APPROVED",
      overallValidationScore: 86,
    },
    entryRange: { low: 100, high: 102 },
    stopLoss: 95,
    targets: [
      { price: 110, label: "T1" },
      { price: 118, label: "T2" },
    ],
    riskReward: 2.5,
    convictionDrivers: ["Trend aligned", "Momentum confirmed"],
    riskFactors: ["Market breadth"],
    technicalSnapshot: {
      trend: "UP",
      momentum: 78,
      rsi: 61,
    },
    fundamentalSnapshot: { qualityScore: 82 },
    marketSnapshot: { regime: marketRegime },
    sectorSnapshot: { sector, strength: 76 },
  };
}

function completeSource(options: {
  symbol: string;
  timestamp: string;
  outcome: "target2" | "target1" | "stopped" | "expired" | "invalidated";
  strategy?: string;
  regime?: string;
  sector?: string;
  momentum?: number;
  fundamental?: number;
  risk?: number;
}): RecommendationLearningSource {
  const living = createLivingRecommendation(
    input(
      options.symbol,
      options.timestamp,
      options.strategy,
      options.regime,
      options.sector
    )
  );

  if (options.outcome === "expired") {
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "EXPIRED",
    });
  } else if (options.outcome === "invalidated") {
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "INVALIDATED",
    });
  } else {
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    if (options.outcome !== "stopped") {
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status: "ACTIVE",
      });
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status: "TARGET_1_HIT",
      });
      if (options.outcome === "target2") {
        updateRecommendationStatus({
          recommendationId: living.recommendationId,
          status: "TARGET_2_HIT",
        });
      }
    } else {
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status: "STOP_LOSS_HIT",
      });
    }
  }

  calculateHealthForRecommendation(living.recommendationId, {
    momentum: options.momentum ?? (options.outcome.startsWith("target") ? 88 : 35),
    fundamentalStrength:
      options.fundamental ?? (options.outcome.startsWith("target") ? 84 : 45),
    risk: options.risk ?? (options.outcome.startsWith("target") ? 82 : 30),
    trend: options.outcome.startsWith("target") ? 86 : 40,
  }, {
    invalidated: options.outcome === "invalidated",
  });

  const lifecycle = getLivingRecommendation(living.recommendationId)!;
  const outcome = evaluateAndStoreOutcome({
    snapshot: living.snapshot,
    lifecycle,
    health: getRecommendationHealth(living.recommendationId),
    path:
      options.outcome === "target2"
        ? {
            currentPrice: 119,
            highSinceEntry: 120,
            lowSinceEntry: 100,
            sessionsActive: 5,
          }
        : options.outcome === "target1"
          ? {
              currentPrice: 111,
              highSinceEntry: 112,
              lowSinceEntry: 100,
              sessionsActive: 4,
            }
          : options.outcome === "stopped"
            ? {
                currentPrice: 94,
                highSinceEntry: 103,
                lowSinceEntry: 94,
                sessionsActive: 2,
              }
            : undefined,
  });

  return {
    snapshot: living.snapshot,
    lifecycle,
    health: getRecommendationHealth(living.recommendationId),
    outcome,
    replay: getRecommendationReplay(living.recommendationId),
  };
}

beforeEach(() => {
  resetRecommendationRegistry();
  resetAdaptiveLearning();
});

describe("Adaptive learning", () => {
  it("learns from a completed recommendation", () => {
    const source = completeSource({
      symbol: "A",
      timestamp: "2026-07-01T09:30:00Z",
      outcome: "target2",
    });
    const result = learnFromRecommendation(source);
    expect(result.evidence.successful).toBe(true);
    expect(result.summary.recommendationsEvaluated).toBe(1);
    expect(source.snapshot.originalConviction).toBe(84);
  });

  it("rejects incomplete recommendations", () => {
    const living = createLivingRecommendation(
      input("PENDING", "2026-07-01T09:31:00Z")
    );
    const outcome = evaluateAndStoreOutcome({
      snapshot: living.snapshot,
      lifecycle: living,
    });
    expect(() =>
      learnFromRecommendation({
        snapshot: living.snapshot,
        lifecycle: living,
        outcome,
      })
    ).toThrow(/not complete/);
  });

  it("prevents duplicate evidence from double counting", () => {
    const source = completeSource({
      symbol: "DUP",
      timestamp: "2026-07-01T09:32:00Z",
      outcome: "target1",
    });
    learnFromRecommendation(source);
    expect(() => learnFromRecommendation(source)).toThrow(/already been learned/);
    expect(getLearningSummary().recommendationsEvaluated).toBe(1);
  });

  it("preserves immutable historical snapshots", () => {
    const source = completeSource({
      symbol: "IMM",
      timestamp: "2026-07-01T09:33:00Z",
      outcome: "stopped",
    });
    const conviction = source.snapshot.originalConviction;
    learnFromRecommendation(source);
    expect(source.snapshot.originalConviction).toBe(conviction);
    expect(Object.isFrozen(source.snapshot)).toBe(true);
  });

  it("records failure evidence from stop loss outcomes", () => {
    const result = learnFromRecommendation(
      completeSource({
        symbol: "FAIL",
        timestamp: "2026-07-01T09:34:00Z",
        outcome: "stopped",
      })
    );
    expect(result.evidence.failed).toBe(true);
    expect(result.evidence.factorScores["Stop Loss Accuracy"]).toBe(0);
    expect(result.summary.failureRate).toBe(100);
  });
});

describe("Historical learning", () => {
  it("aggregates success and failure rates", () => {
    learnFromRecommendation(
      completeSource({
        symbol: "S1",
        timestamp: "2026-07-02T09:30:00Z",
        outcome: "target2",
      })
    );
    const result = learnFromRecommendation(
      completeSource({
        symbol: "F1",
        timestamp: "2026-07-02T09:31:00Z",
        outcome: "stopped",
      })
    );
    expect(result.historical.evaluated).toBe(2);
    expect(result.historical.successRate).toBe(50);
    expect(result.historical.failureRate).toBe(50);
  });

  it("tracks all ten learning factors", () => {
    const result = learnFromRecommendation(
      completeSource({
        symbol: "FACT",
        timestamp: "2026-07-02T09:32:00Z",
        outcome: "target2",
      })
    );
    expect(result.historical.factors).toHaveLength(10);
    expect(result.evidence.factorScores["Entry Accuracy"]).toBe(100);
    expect(result.evidence.factorScores["Target Accuracy"]).toBe(100);
  });

  it("groups historical evidence by strategy, sector, regime and holding period", () => {
    const result = learnFromRecommendation(
      completeSource({
        symbol: "GROUP",
        timestamp: "2026-07-02T09:33:00Z",
        outcome: "target1",
        strategy: "Momentum",
        sector: "Technology",
        regime: "RISK_ON",
      })
    );
    expect(result.historical.strategies[0].key).toBe("Momentum");
    expect(result.historical.sectors[0].key).toBe("Technology");
    expect(result.historical.marketRegimes[0].key).toBe("RISK_ON");
    expect(result.historical.holdingPeriods[0].key).toBe("5–15 Trading Days");
  });

  it("returns a safe empty historical summary", () => {
    const historical = buildHistoricalLearning([]);
    expect(historical.evaluated).toBe(0);
    expect(historical.successRate).toBe(0);
    expect(historical.factors).toHaveLength(10);
  });
});

describe("Pattern discovery", () => {
  it("discovers repeated successful patterns and strong strategies", () => {
    for (const [symbol, timestamp] of [
      ["PS1", "2026-07-03T09:30:00Z"],
      ["PS2", "2026-07-03T09:31:00Z"],
    ]) {
      learnFromRecommendation(
        completeSource({ symbol, timestamp, outcome: "target2", strategy: "Swing" })
      );
    }
    const patterns = getHistoricalPatterns();
    expect(patterns.some((item) => item.type === "Repeated Successful Pattern")).toBe(
      true
    );
    expect(patterns.some((item) => item.type === "Strong Strategy")).toBe(true);
  });

  it("discovers repeated failure patterns and weak strategies", () => {
    for (const [symbol, timestamp] of [
      ["PF1", "2026-07-03T09:32:00Z"],
      ["PF2", "2026-07-03T09:33:00Z"],
    ]) {
      learnFromRecommendation(
        completeSource({ symbol, timestamp, outcome: "stopped", strategy: "Momentum" })
      );
    }
    const patterns = getHistoricalPatterns();
    expect(patterns.some((item) => item.type === "Repeated Failure Pattern")).toBe(
      true
    );
    expect(patterns.some((item) => item.type === "Weak Strategy")).toBe(true);
  });

  it("discovers best and worst market regimes", () => {
    const rows = [
      ["R1", "2026-07-03T09:34:00Z", "target2", "RISK_ON"],
      ["R2", "2026-07-03T09:35:00Z", "target1", "RISK_ON"],
      ["R3", "2026-07-03T09:36:00Z", "stopped", "RISK_OFF"],
      ["R4", "2026-07-03T09:37:00Z", "stopped", "RISK_OFF"],
    ] as const;
    for (const [symbol, timestamp, outcome, regime] of rows) {
      learnFromRecommendation(
        completeSource({ symbol, timestamp, outcome, regime })
      );
    }
    const patterns = getHistoricalPatterns();
    expect(patterns.some((item) => item.type === "Best Market Regime")).toBe(true);
    expect(patterns.some((item) => item.type === "Worst Market Regime")).toBe(true);
  });

  it("discovers reliable indicators from repeated evidence", () => {
    learnFromRecommendation(
      completeSource({
        symbol: "I1",
        timestamp: "2026-07-03T09:38:00Z",
        outcome: "target2",
      })
    );
    learnFromRecommendation(
      completeSource({
        symbol: "I2",
        timestamp: "2026-07-03T09:39:00Z",
        outcome: "target1",
      })
    );
    expect(
      getHistoricalPatterns().some(
        (item) => item.type === "Reliable Indicator"
      )
    ).toBe(true);
  });

  it("returns no patterns before repeated evidence exists", () => {
    const historical = buildHistoricalLearning([]);
    expect(discoverHistoricalPatterns([], historical)).toEqual([]);
  });
});

describe("Future-only calibration", () => {
  it("produces Momentum, Sector and Risk adjustments", () => {
    learnFromRecommendation(
      completeSource({
        symbol: "C1",
        timestamp: "2026-07-04T09:30:00Z",
        outcome: "target2",
      })
    );
    learnFromRecommendation(
      completeSource({
        symbol: "C2",
        timestamp: "2026-07-04T09:31:00Z",
        outcome: "stopped",
      })
    );
    const calibration = getCalibration();
    expect(calibration.adjustments.map((item) => item.factor)).toEqual([
      "Momentum",
      "Sector",
      "Risk",
    ]);
    expect(calibration.appliesTo).toBe("FUTURE_RECOMMENDATIONS_ONLY");
  });

  it("calibrates only prospective values", () => {
    const source = completeSource({
      symbol: "FUT",
      timestamp: "2026-07-04T09:32:00Z",
      outcome: "target2",
    });
    learnFromRecommendation(source);
    const original = source.snapshot.originalConviction;
    const future = calibrateFutureRecommendation({
      baseConviction: 80,
      baseTrust: 82,
      baseValidationWeight: 1,
    });
    expect(future.historicalSampleSize).toBe(1);
    expect(source.snapshot.originalConviction).toBe(original);
  });

  it("enforces the learned conviction cap", () => {
    learnFromRecommendation(
      completeSource({
        symbol: "CAP",
        timestamp: "2026-07-04T09:33:00Z",
        outcome: "stopped",
      })
    );
    const calibration = getCalibration();
    const future = calibrateFutureRecommendation({
      baseConviction: 100,
      baseTrust: 90,
      baseValidationWeight: 1,
    });
    expect(future.conviction).toBeLessThanOrEqual(calibration.convictionCap);
  });

  it("builds safe calibration with no history", () => {
    const historical = buildHistoricalLearning([]);
    const calibration = buildRecommendationCalibration(historical);
    expect(calibration.sampleSize).toBe(0);
    expect(calibration.confidence).toBe(0);
    expect(calibration.appliesTo).toBe("FUTURE_RECOMMENDATIONS_ONLY");
  });
});

describe("AI feedback", () => {
  it("generates learned, avoid, confidence and evidence feedback", () => {
    learnFromRecommendation(
      completeSource({
        symbol: "L1",
        timestamp: "2026-07-05T09:30:00Z",
        outcome: "target2",
      })
    );
    learnFromRecommendation(
      completeSource({
        symbol: "L2",
        timestamp: "2026-07-05T09:31:00Z",
        outcome: "target1",
      })
    );
    const lessons = getAILessons();
    expect(lessons.aiLearned.length).toBeGreaterThan(0);
    expect(lessons.aiShouldAvoid.length).toBeGreaterThan(0);
    expect(lessons.aiConfidenceIncreasedBecause.length).toBeGreaterThan(0);
    expect(lessons.aiConfidenceReducedBecause.length).toBeGreaterThan(0);
    expect(lessons.historicalEvidence[0]).toMatch(/2 completed/);
  });
});

describe("Presentation and wiring", () => {
  it("provides all required empty states", () => {
    expect(RECOMMENDATION_LEARNING_EMPTY).toEqual({
      noHistoricalRecommendations: "No Historical Recommendations",
      learningPending: "Learning Pending",
      awaitingCalibration: "Awaiting Calibration",
      noPatternsLearned: "No Patterns Learned",
    });
    expect(presentLearningDashboard(getLearningSummary()).emptyMessage).toBe(
      "No Historical Recommendations"
    );
    expect(presentCalibration(getCalibration()).emptyMessage).toBe(
      "Awaiting Calibration"
    );
    expect(presentPatterns([]).emptyMessage).toBe("No Patterns Learned");
  });

  it("presents learning dashboard metrics", () => {
    learnFromRecommendation(
      completeSource({
        symbol: "UI",
        timestamp: "2026-07-06T09:30:00Z",
        outcome: "target2",
      })
    );
    const dashboard = presentLearningDashboard(getLearningSummary());
    expect(dashboard.recommendationsEvaluated).toBe(1);
    expect(dashboard.successRate).toBe("100.0%");
    expect(dashboard.latestAiLessons.length).toBeGreaterThan(0);
  });

  it("wires read-only guidance across all requested surfaces", () => {
    const bundles = [
      wireLearningAIResearch(),
      wireLearningAIScreener(),
      wireLearningDashboard(),
      wireLearningRecommendationCenter(),
      wireLearningValidation(),
      wireLearningReplay(),
      wireLearningHistory(),
    ];
    expect(bundles.map((bundle) => bundle.surface)).toEqual([
      "ai_research",
      "ai_screener",
      "dashboard",
      "recommendation_center",
      "validation",
      "replay",
      "history",
    ]);
    expect(bundles.every((bundle) => bundle.calibration.futureOnly)).toBe(true);
  });

  it("presents an explicit surface bundle", () => {
    const bundle = presentLearningForSurface(
      "dashboard",
      getLearningSummary(),
      getCalibration(),
      getHistoricalPatterns(),
      getAILessons()
    );
    expect(bundle.surface).toBe("dashboard");
    expect(bundle.dashboard.empty).toBe(true);
  });
});

describe("Public API", () => {
  it("composes existing engines when learning by recommendation id", () => {
    const source = completeSource({
      symbol: "BYID",
      timestamp: "2026-07-07T09:29:00Z",
      outcome: "target2",
    });
    const result = learnFromRecommendation(source.snapshot.recommendationId);
    expect(result.evidence.recommendationId).toBe(
      source.snapshot.recommendationId
    );
    expect(result.evidence.successful).toBe(true);
  });

  it("exposes summary, calibration, patterns and lessons", () => {
    learnFromRecommendation(
      completeSource({
        symbol: "API1",
        timestamp: "2026-07-07T09:30:00Z",
        outcome: "target2",
      })
    );
    learnFromRecommendation(
      completeSource({
        symbol: "API2",
        timestamp: "2026-07-07T09:31:00Z",
        outcome: "target1",
      })
    );
    expect(getLearningSummary().recommendationsEvaluated).toBe(2);
    expect(getCalibration().sampleSize).toBe(2);
    expect(getHistoricalPatterns().length).toBeGreaterThan(0);
    expect(getAILessons().historicalEvidence.length).toBeGreaterThan(0);
  });
});
