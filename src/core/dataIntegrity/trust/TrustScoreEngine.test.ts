/**
 * Institutional Trust Score Engine — unit tests (Prompt 9F.10).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  TrustScoreEngine,
  registerTrustEngine,
  resetTrustScoreEngine,
  calculateTrustScore,
  getTrustHistory,
  getTrustMetrics,
  getTrustTrend,
  classifyTrust,
  registerTrustModule,
  DEFAULT_TRUST_CONFIGURATION,
  resolveTrustConfiguration,
  clampTrustScore,
  TrustWeightManager,
  TrustAggregationEngine,
  TrustTrendAnalyzer,
  resetTrustModuleRegistrationState,
  getRegisteredTrustModules,
} from "./index";

const PERFECT_SCORES = {
  dataIntegrity: 100,
  marketValidation: 100,
  technicalValidation: 100,
  fundamentalValidation: 100,
  recommendationValidation: 100,
  tradeSetupValidation: 100,
  hallucinationDetection: 100,
  historicalPerformance: 100,
};

const POOR_SCORES = {
  dataIntegrity: 40,
  marketValidation: 35,
  technicalValidation: 30,
  fundamentalValidation: 25,
  recommendationValidation: 20,
  tradeSetupValidation: 15,
  hallucinationDetection: 10,
  historicalPerformance: 5,
};

const MIXED_SCORES = {
  dataIntegrity: 95,
  marketValidation: 88,
  technicalValidation: 72,
  fundamentalValidation: 90,
  recommendationValidation: 85,
  tradeSetupValidation: 60,
  hallucinationDetection: 92,
  historicalPerformance: 78,
};

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("Trust Engine registration", () => {
  beforeEach(() => {
    resetTrustScoreEngine();
    resetTrustModuleRegistrationState();
  });

  it("registers trust engine idempotently", () => {
    const first = registerTrustEngine();
    expect(first.registered).toBe(true);
    expect(first.modules.registered).toBeGreaterThan(0);
    expect(getRegisteredTrustModules().length).toBe(8);

    const second = registerTrustEngine();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });

  it("registers custom trust modules", () => {
    registerTrustEngine();
    const engine = new TrustScoreEngine();
    const result = engine.registerTrustModule({
      id: "futureSentiment",
      name: "Future Sentiment Validation",
      defaultWeight: 0.05,
      extractScore: (payload) => {
        if (payload && typeof payload === "object" && "futureSentiment" in payload) {
          return Number((payload as { futureSentiment: number }).futureSentiment);
        }
        return undefined;
      },
    });
    expect(result.registered).toBe(true);
    const again = engine.registerTrustModule({
      id: "futureSentiment",
      name: "Future Sentiment Validation",
    });
    expect(again.skipped).toBe(true);
  });
});

describe("Perfect / poor / mixed datasets", () => {
  beforeEach(() => {
    resetTrustScoreEngine();
  });

  it("scores perfect datasets near 100 with elite/exceptional classification", () => {
    const result = calculateTrustScore({
      objectId: "PERFECT-1",
      objectType: "STOCK",
      moduleScores: PERFECT_SCORES,
      signals: {
        zeroContradictions: true,
        strongValidationAcrossModules: true,
        institutionalGradeConsistency: true,
        excellentRecommendationQuality: true,
        stableFinancials: true,
        stableTechnicals: true,
        historicalAccuracyImproved: true,
      },
    });

    expect(result.trustScore).toBeGreaterThanOrEqual(98);
    expect(result.trustScore).toBeLessThanOrEqual(100);
    expect(["INSTITUTIONAL_ELITE", "EXCEPTIONAL"]).toContain(
      result.trustClassification
    );
    expect(result.rejected).toBe(false);
    expect(result.trustConfidence).toBeGreaterThan(90);
    expect(result.trustHistoryReference).toContain("trust:PERFECT-1");
  });

  it("rejects poor datasets below review threshold", () => {
    const result = calculateTrustScore({
      objectId: "POOR-1",
      moduleScores: POOR_SCORES,
      signals: {
        hallucinationRisk: 80,
        recommendationConflicts: 3,
        marketInconsistencies: 2,
        fundamentalInconsistencies: 2,
      },
    });

    expect(result.trustScore).toBeLessThan(70);
    expect(result.trustClassification).toBe("REJECT");
    expect(result.rejected).toBe(true);
    expect(result.errorReports.length).toBeGreaterThan(0);
    expect(result.adjustmentsApplied).toBeLessThan(0);
  });

  it("handles mixed validation results with mid-band classification", () => {
    const result = calculateTrustScore({
      objectId: "MIXED-1",
      moduleScores: MIXED_SCORES,
    });

    expect(result.trustScore).toBeGreaterThan(70);
    expect(result.trustScore).toBeLessThan(95);
    expect(result.rejected).toBe(false);
    expect(result.contributingModules.length).toBe(8);
    expect(Object.keys(result.weightDistribution).length).toBe(8);
  });
});

describe("Weight adjustments", () => {
  beforeEach(() => {
    resetTrustScoreEngine();
  });

  it("respects custom weight overrides", () => {
    const base = calculateTrustScore({
      objectId: "W-BASE",
      moduleScores: {
        ...PERFECT_SCORES,
        historicalPerformance: 10,
        dataIntegrity: 100,
      },
    });

    const skewed = calculateTrustScore({
      objectId: "W-SKEWED",
      moduleScores: {
        ...PERFECT_SCORES,
        historicalPerformance: 10,
        dataIntegrity: 100,
      },
      weights: {
        ...DEFAULT_TRUST_CONFIGURATION.weights,
        historicalPerformance: 0.5,
        dataIntegrity: 0.05,
        marketValidation: 0.05,
        technicalValidation: 0.05,
        fundamentalValidation: 0.05,
        recommendationValidation: 0.05,
        tradeSetupValidation: 0.05,
        hallucinationDetection: 0.05,
      },
    });

    expect(skewed.trustScore).toBeLessThan(base.trustScore);
  });

  it("normalizes weights via TrustWeightManager", () => {
    const mgr = new TrustWeightManager({
      dataIntegrity: 2,
      marketValidation: 1,
      technicalValidation: 1,
      fundamentalValidation: 1,
      recommendationValidation: 1,
      tradeSetupValidation: 1,
      hallucinationDetection: 1,
      historicalPerformance: 1,
    });
    const normalized = mgr.getNormalizedWeights();
    const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(normalized.dataIntegrity).toBeCloseTo(0.222, 2);
  });
});

describe("Classification", () => {
  it("maps score bands per configuration thresholds", () => {
    expect(classifyTrust(99)).toBe("INSTITUTIONAL_ELITE");
    expect(classifyTrust(96)).toBe("EXCEPTIONAL");
    expect(classifyTrust(92)).toBe("VERY_HIGH_TRUST");
    expect(classifyTrust(87)).toBe("HIGH_TRUST");
    expect(classifyTrust(82)).toBe("TRUSTED");
    expect(classifyTrust(75)).toBe("REVIEW_REQUIRED");
    expect(classifyTrust(69)).toBe("REJECT");
  });

  it("uses configurable classification thresholds", () => {
    const config = resolveTrustConfiguration({
      classificationThresholds: {
        institutionalElite: 99,
        exceptional: 97,
        veryHighTrust: 94,
        highTrust: 90,
        trusted: 85,
        reviewRequired: 75,
      },
    });
    expect(classifyTrust(98, config.classificationThresholds)).toBe(
      "EXCEPTIONAL"
    );
  });
});

describe("Trend analysis, history, deterioration, recovery", () => {
  beforeEach(() => {
    resetTrustScoreEngine();
  });

  it("tracks history and trends across calculations", () => {
    const engine = new TrustScoreEngine();
    registerTrustEngine({ engine, force: true });

    engine.calculateTrustScore({
      objectId: "TREND-1",
      moduleScores: PERFECT_SCORES,
      timestamp: daysAgo(60),
    });
    engine.calculateTrustScore({
      objectId: "TREND-1",
      moduleScores: {
        ...PERFECT_SCORES,
        recommendationValidation: 70,
        historicalPerformance: 65,
      },
      timestamp: daysAgo(5),
    });
    const current = engine.calculateTrustScore({
      objectId: "TREND-1",
      moduleScores: {
        ...PERFECT_SCORES,
        recommendationValidation: 55,
        historicalPerformance: 50,
      },
      timestamp: daysAgo(0),
    });

    const history = engine.getTrustHistory("TREND-1");
    expect(history.length).toBe(3);
    expect(current.trustTrend.previousScore).not.toBeNull();
    expect(current.trustTrend.trend7d).not.toBeNull();
    expect(current.trustTrend.trend30d).not.toBeNull();
    expect(current.trustTrend.currentScore).toBe(current.trustScore);

    const trend = engine.getTrustTrend("TREND-1");
    expect(trend?.currentScore).toBe(current.trustScore);
  });

  it("detects trust deterioration", () => {
    const analyzer = new TrustTrendAnalyzer(DEFAULT_TRUST_CONFIGURATION);
    const trend = analyzer.analyze(
      70,
      [
        { timestamp: daysAgo(14), trustScore: 95 },
        { timestamp: daysAgo(7), trustScore: 88 },
        { timestamp: daysAgo(1), trustScore: 80 },
      ],
      new Date()
    );
    expect(trend.deteriorating).toBe(true);
    expect(trend.scoreMomentum).toBeLessThan(0);
  });

  it("detects trust recovery via rising momentum", () => {
    const engine = new TrustScoreEngine();
    engine.calculateTrustScore({
      objectId: "RECOVER-1",
      moduleScores: POOR_SCORES,
      timestamp: daysAgo(5),
    });
    const recovered = engine.calculateTrustScore({
      objectId: "RECOVER-1",
      moduleScores: PERFECT_SCORES,
      timestamp: daysAgo(0),
      signals: {
        historicalAccuracyImproved: true,
        institutionalGradeConsistency: true,
      },
    });

    expect(recovered.trustTrend.scoreMomentum).toBeGreaterThan(0);
    expect(recovered.trustScore).toBeGreaterThan(90);
    expect(recovered.trustClassification).not.toBe("REJECT");
  });

  it("exposes history via public API helpers", () => {
    calculateTrustScore({
      objectId: "API-HIST",
      moduleScores: MIXED_SCORES,
    });
    expect(getTrustHistory("API-HIST").length).toBe(1);
    expect(getTrustTrend("API-HIST")?.currentScore).toBeGreaterThan(0);
    expect(getTrustMetrics().totalCalculations).toBeGreaterThan(0);
  });
});

describe("Aggregation, confidence adjustments, bonuses", () => {
  it("aggregates weighted module scores", () => {
    const engine = new TrustAggregationEngine(DEFAULT_TRUST_CONFIGURATION);
    const result = engine.aggregate({ moduleScores: PERFECT_SCORES });
    expect(result.baseScore).toBe(100);
    expect(result.missingModules.length).toBe(0);
  });

  it("applies confidence penalties when risk signals rise", () => {
    const engine = new TrustScoreEngine();
    const clean = engine.calculateTrustScore({
      objectId: "PEN-CLEAN",
      moduleScores: MIXED_SCORES,
    });
    const penalized = engine.calculateTrustScore({
      objectId: "PEN-RISK",
      moduleScores: MIXED_SCORES,
      signals: {
        hallucinationRisk: 40,
        previousHistoricalAccuracy: 90,
        historicalAccuracy: 60,
        previousDataIntegrityScore: 95,
        dataIntegrityScore: 70,
        recommendationConflicts: 2,
      },
    });
    expect(penalized.trustScore).toBeLessThan(clean.trustScore);
    expect(penalized.adjustmentsApplied).toBeLessThan(0);
  });

  it("applies bonus scoring for institutional consistency", () => {
    const engine = new TrustScoreEngine();
    const base = engine.calculateTrustScore({
      objectId: "BONUS-BASE",
      moduleScores: {
        dataIntegrity: 92,
        marketValidation: 91,
        technicalValidation: 91,
        fundamentalValidation: 92,
        recommendationValidation: 91,
        tradeSetupValidation: 90,
        hallucinationDetection: 93,
        historicalPerformance: 91,
      },
    });
    const bonused = engine.calculateTrustScore({
      objectId: "BONUS-FULL",
      moduleScores: {
        dataIntegrity: 92,
        marketValidation: 91,
        technicalValidation: 91,
        fundamentalValidation: 92,
        recommendationValidation: 91,
        tradeSetupValidation: 90,
        hallucinationDetection: 93,
        historicalPerformance: 91,
      },
      signals: {
        zeroContradictions: true,
        stableFinancials: true,
        stableTechnicals: true,
        institutionalGradeConsistency: true,
        historicalAccuracyImproved: true,
      },
    });
    expect(bonused.trustScore).toBeGreaterThanOrEqual(base.trustScore);
    expect(bonused.bonusesApplied).toBeGreaterThan(0);
  });

  it("clamps scores to 0–100", () => {
    expect(clampTrustScore(150)).toBe(100);
    expect(clampTrustScore(-20)).toBe(0);
    expect(clampTrustScore(Number.NaN)).toBe(0);
  });
});

describe("Metrics, audit, attachTrustFields", () => {
  beforeEach(() => {
    resetTrustScoreEngine();
  });

  it("tracks metrics distribution and rejected objects", () => {
    const engine = new TrustScoreEngine();
    engine.calculateTrustScore({
      objectId: "M1",
      moduleScores: PERFECT_SCORES,
    });
    engine.calculateTrustScore({
      objectId: "M2",
      moduleScores: POOR_SCORES,
    });
    const metrics = engine.getTrustMetrics();
    expect(metrics.totalCalculations).toBe(2);
    expect(metrics.highestTrustScore).toBeGreaterThan(metrics.lowestTrustScore);
    expect(metrics.rejectedObjects).toBeGreaterThanOrEqual(1);
    expect(Object.keys(metrics.trustDistribution).length).toBeGreaterThan(0);
    expect(metrics.validationRuntime).toBeGreaterThanOrEqual(0);
  });

  it("writes audit log entries with engine version and weights", () => {
    const engine = new TrustScoreEngine();
    engine.calculateTrustScore({
      objectId: "AUD-1",
      moduleScores: MIXED_SCORES,
      warnings: ["manual-warning"],
    });
    const audit = engine.getAuditLog("AUD-1");
    expect(audit.length).toBe(1);
    expect(audit[0]?.engineVersion).toBe(
      DEFAULT_TRUST_CONFIGURATION.engineVersion
    );
    expect(audit[0]?.contributingModules.length).toBe(8);
    expect(audit[0]?.warnings).toContain("manual-warning");
  });

  it("attaches trust fields without breaking existing object shape", () => {
    const engine = new TrustScoreEngine();
    const original = {
      id: "REC-99",
      action: "BUY",
      confidence: 0.8,
    };
    const annotated = engine.attachTrustFields(original, {
      moduleScores: MIXED_SCORES,
    });
    expect(annotated.id).toBe("REC-99");
    expect(annotated.action).toBe("BUY");
    expect(annotated.confidence).toBe(0.8);
    expect(annotated.trustScore).toBeGreaterThan(0);
    expect(annotated.trustClassification).toBeTruthy();
    expect(annotated.trustTrend).toBeTruthy();
    expect(annotated.trustConfidence).toBeGreaterThan(0);
    expect(annotated.trustHistoryReference).toContain("trust:REC-99");
  });

  it("supports strict vs relaxed missing-module handling", () => {
    const strict = new TrustScoreEngine({ mode: "strict" });
    const relaxed = new TrustScoreEngine({ mode: "relaxed" });

    const partial = {
      dataIntegrity: 90,
      marketValidation: 90,
    };

    const strictResult = strict.calculateTrustScore({
      objectId: "STRICT-1",
      moduleScores: partial,
    });
    const relaxedResult = relaxed.calculateTrustScore({
      objectId: "RELAX-1",
      moduleScores: partial,
    });

    expect(strictResult.trustScore).toBeLessThanOrEqual(
      relaxedResult.trustScore
    );
    expect(strictResult.warnings.some((w) => w.includes("Missing score"))).toBe(
      true
    );
  });
});

describe("Public API surface", () => {
  beforeEach(() => {
    resetTrustScoreEngine();
  });

  it("exposes registerTrustModule at module level", () => {
    registerTrustEngine();
    const result = registerTrustModule({
      id: "altDataValidation",
      name: "Alt Data Validation",
      defaultWeight: 0.02,
    });
    expect(result.registered).toBe(true);
  });

  it("uses default config without hardcoded consumer-side weights", () => {
    const w = DEFAULT_TRUST_CONFIGURATION.weights;
    expect(w.dataIntegrity).toBe(0.2);
    expect(w.marketValidation).toBe(0.1);
    expect(w.technicalValidation).toBe(0.1);
    expect(w.fundamentalValidation).toBe(0.15);
    expect(w.recommendationValidation).toBe(0.15);
    expect(w.tradeSetupValidation).toBe(0.1);
    expect(w.hallucinationDetection).toBe(0.1);
    expect(w.historicalPerformance).toBe(0.1);
  });
});
