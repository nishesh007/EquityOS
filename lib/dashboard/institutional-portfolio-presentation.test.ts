/**
 * Institutional portfolio presentation — tests (read-only mapping).
 */

import { describe, expect, it } from "vitest";
import {
  buildPortfolioDashboard,
  buildPortfolioHealth,
  buildPortfolioRisk,
  buildPortfolioValidation,
} from "@/lib/dashboard/institutional-portfolio-presentation";
import type {
  PortfolioDoctorAnalysis,
  PortfolioSummary,
} from "@/types";
import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";

function makePortfolio(): PortfolioSummary {
  return {
    totalValue: 1_000_000,
    dayChange: 5000,
    dayChangePercent: 0.5,
    totalInvested: 900_000,
    totalGain: 100_000,
    totalGainPercent: 11.1,
    holdings: [
      {
        id: "1",
        symbol: "RELIANCE",
        name: "Reliance Industries",
        quantity: 10,
        avgPrice: 2400,
        currentPrice: 2500,
        changePercent: 1.2,
      },
      {
        id: "2",
        symbol: "TCS",
        name: "Tata Consultancy",
        quantity: 5,
        avgPrice: 3500,
        currentPrice: 3600,
        changePercent: 0.8,
      },
    ],
  };
}

function makeRiskMetric(
  key: string,
  label: string,
  score: number,
  level: "Low" | "Medium" | "High" | "Very High" = "Medium"
) {
  return {
    key,
    label,
    score,
    level,
    tone: score >= 70 ? ("loss" as const) : score >= 40 ? ("accent" as const) : ("gain" as const),
    explanation: `${label} explanation`,
  };
}

function makeDoctor(): PortfolioDoctorAnalysis {
  return {
    generatedAt: "2026-07-14T10:00:00.000Z",
    healthScore: {
      overall: 78,
      verdict: "Healthy Portfolio",
      factors: [],
      summary: "Portfolio health is institutional-ready.",
    },
    diversification: {
      score: 72,
      sectorAllocation: [
        {
          sector: "Energy",
          currentPercent: 40,
          idealPercent: 25,
          difference: 15,
          tone: "accent",
        },
        {
          sector: "IT",
          currentPercent: 35,
          idealPercent: 30,
          difference: 5,
          tone: "gain",
        },
      ],
      marketCapAllocation: [
        { tier: "Large", percent: 70 },
        { tier: "Mid", percent: 20 },
        { tier: "Small", percent: 10 },
      ],
      largeCapPercent: 70,
      midCapPercent: 20,
      smallCapPercent: 10,
      maxSingleStockPercent: 40,
      maxSingleStockSymbol: "RELIANCE",
      top5HoldingsPercent: 75,
      grade: "B",
      gradeExplanation: "Moderately diversified",
      herfindahlIndex: 0.28,
    },
    riskEngine: {
      concentrationRisk: makeRiskMetric("concentration", "Concentration", 55),
      volatilityRisk: makeRiskMetric("volatility", "Volatility", 48),
      sectorRisk: makeRiskMetric("sector", "Sector", 60),
      correlationRisk: makeRiskMetric("correlation", "Correlation", 42),
      drawdownRisk: makeRiskMetric("drawdown", "Drawdown", 50),
      liquidityRisk: makeRiskMetric("liquidity", "Liquidity", 30, "Low"),
      overallRisk: 48,
      overallRiskLabel: "Medium",
      overallTone: "accent",
      summary: "Risk is balanced with sector concentration watch.",
    },
    diagnostics: [
      {
        key: "overweight-energy",
        label: "Energy Overweight",
        severity: "yellow",
        description: "Energy allocation exceeds ideal band.",
        affectedSymbols: ["RELIANCE"],
      },
    ],
    recommendations: [
      {
        id: "rec-1",
        action: "Reduce RELIANCE exposure",
        reasoning: "Trim concentration risk.",
        priority: "high",
        tone: "accent",
      },
    ],
    rebalancing: {
      currentAllocation: [],
      suggestedAllocation: [],
      summary: "Rebalance toward ideal weights.",
    },
    positionSizing: [
      {
        symbol: "RELIANCE",
        name: "Reliance Industries",
        currentWeight: 40,
        idealWeight: 25,
        suggestedWeight: 28,
        status: "overweight",
        tone: "accent",
      },
      {
        symbol: "TCS",
        name: "Tata Consultancy",
        currentWeight: 20,
        idealWeight: 25,
        suggestedWeight: 24,
        status: "underweight",
        tone: "gain",
      },
    ],
    sectorAllocation: [
      {
        sector: "Energy",
        currentPercent: 40,
        idealPercent: 25,
        difference: 15,
        tone: "accent",
      },
      {
        sector: "IT",
        currentPercent: 35,
        idealPercent: 30,
        difference: 5,
        tone: "gain",
      },
    ],
    quality: {
      averageRoe: 18,
      averageRoce: 16,
      averageDebtToEquity: 0.4,
      averageGrowth: 12,
      averagePe: 22,
      averageDividendYield: 1.2,
      qualityScore: 76,
      qualityTone: "gain",
      summary: "Quality metrics are supportive.",
    },
    summary: {
      healthScore: 78,
      riskLevel: "Medium",
      diversificationGrade: "B",
      expectedCagr: 12,
      worstRisk: "Sector concentration",
      bestOpportunity: "IT rebalance",
      headline: "Healthy book with concentration watch.",
    },
    dataTransparency: {
      provider: "EquityOS",
      freshness: "live",
      lastUpdated: "2026-07-14T10:00:00.000Z",
      dataSource: "test",
      cacheAge: "0s",
    },
  };
}

function makeSnapshot(): InstitutionalPlatformSnapshot {
  return {
    platform: {
      overallHealthScore: 88,
      overallTrustScore: 84,
      overallReadiness: 80,
      overallCompliance: 78,
      overallSecurity: 76,
      overallReliability: 80,
      overallPerformance: 81,
      overallExplainability: 79,
      overallDocumentation: 70,
      overallCoverage: 90,
      overallCertification: 80,
      overallRisk: 20,
      overallValidationStatus: "healthy",
      engineCount: 20,
      registeredCount: 18,
      healthyCount: 17,
    },
    dashboard: {
      summary: {
        totalValidations: 10,
        passedValidations: 9,
        failedValidations: 1,
        warningCount: 0,
        criticalCount: 0,
        averageIntegrityScore: 88,
        averageTrustScore: 84,
        averageHallucinationScore: 10,
        historicalPerformanceScore: 80,
        recommendationQuality: 84,
        tradeSetupQuality: 80,
        generatedAt: "2026-07-14T10:00:00.000Z",
      },
      modules: [],
      health: {
        overallHealthScore: 88,
        overallClassification: "HEALTHY",
        validationEngineHealth: 90,
        ruleEngineHealth: 88,
        trustEngineHealth: 84,
        historicalEngineHealth: 80,
        recommendationHealth: 84,
        marketHealth: 80,
        technicalHealth: 82,
        fundamentalHealth: 78,
        deteriorating: false,
      },
      engineVersion: "9F.11.0",
    },
    trust: {
      averageTrustScore: 84,
      highestTrustScore: 95,
      lowestTrustScore: 60,
      averageTrend: 1,
      trustDistribution: {},
      rejectedObjects: 0,
      validationRuntime: 100,
      averageValidationRuntime: 10,
      totalCalculations: 5,
    },
    explainability: {
      generatedExplanations: 3,
      decisionTraces: 4,
      ruleCoverage: 80,
      confidenceCoverage: 78,
      averageExplanationTime: 12,
      explainabilityHealthScore: 80,
      snapshotCount: 1,
      lastRunAt: "2026-07-14T10:05:00.000Z",
    },
  };
}

describe("institutional-portfolio-presentation", () => {
  it("builds empty dashboard when no portfolio", () => {
    const view = buildPortfolioDashboard({});
    expect(view.empty).toBe(true);
    expect(view.emptyMessage).toBe("No Portfolio");
    expect(view.health.emptyMessage).toBe("No Portfolio");
  });

  it("builds portfolio health cards from doctor + snapshot", () => {
    const health = buildPortfolioHealth({
      portfolio: makePortfolio(),
      doctor: makeDoctor(),
      snapshot: makeSnapshot(),
    });
    expect(health.empty).toBe(false);
    expect(health.institutionalScore).toBe("78");
    expect(health.validationScore).toBe("88");
    expect(health.trustScore).toBe("84");
    expect(health.metrics.length).toBeGreaterThanOrEqual(8);
    expect(health.verdict).toContain("Healthy");
  });

  it("builds validation panel with timeline", () => {
    const validation = buildPortfolioValidation({
      portfolio: makePortfolio(),
      doctor: makeDoctor(),
      snapshot: makeSnapshot(),
    });
    expect(validation.empty).toBe(false);
    expect(validation.portfolioValidation).toBe("88");
    expect(validation.timeline.length).toBeGreaterThan(0);
    expect(validation.validationStatus).toBe("healthy");
  });

  it("builds risk panel from existing risk engine", () => {
    const risk = buildPortfolioRisk({ doctor: makeDoctor() });
    expect(risk.empty).toBe(false);
    expect(risk.singleStockRisk).toContain("RELIANCE");
    expect(risk.liquidityRisk).toContain("Low");
    expect(risk.metrics.some((m) => m.label === "Liquidity")).toBe(true);
  });

  it("builds trust panel and badges on full dashboard", () => {
    const view = buildPortfolioDashboard({
      portfolio: makePortfolio(),
      doctor: makeDoctor(),
      snapshot: makeSnapshot(),
    });
    expect(view.trust.portfolioTrust).toBe("84");
    expect(view.trust.trustDrivers.length).toBeGreaterThan(0);
    expect(view.badges.some((b) => b.label.includes("Trust") || b.label.includes("Validation") || b.label.includes("Institutional") || b.label.includes("Production") || b.label.includes("Explainable") || b.label.includes("AI"))).toBe(true);
  });

  it("builds quality matrix and recommendations", () => {
    const view = buildPortfolioDashboard({
      portfolio: makePortfolio(),
      doctor: makeDoctor(),
      snapshot: makeSnapshot(),
    });
    expect(view.qualityMatrix.map((r) => r.symbol)).toEqual(
      expect.arrayContaining(["RELIANCE", "TCS"])
    );
    expect(
      view.recommendations.some((r) => r.category === "Reduce Exposure")
    ).toBe(true);
    expect(
      view.recommendations.some((r) => r.category === "Increase Exposure")
    ).toBe(true);
    expect(view.heatmap.length).toBeGreaterThan(0);
  });

  it("shows awaiting validation when doctor missing", () => {
    const health = buildPortfolioHealth({
      portfolio: makePortfolio(),
      doctor: null,
      snapshot: null,
    });
    expect(health.empty).toBe(true);
    expect(health.emptyMessage).toBe("Awaiting Validation");
  });

  it("never renders undefined null or NaN in health values", () => {
    const view = buildPortfolioDashboard({
      portfolio: makePortfolio(),
      doctor: makeDoctor(),
      snapshot: makeSnapshot(),
    });
    const values = [
      view.health.institutionalScore,
      view.health.validationScore,
      view.health.trustScore,
      view.validation.portfolioValidation,
      view.trust.portfolioTrust,
      view.risk.sectorConcentration,
      ...view.qualityMatrix.flatMap((r) => [
        r.validation,
        r.trust,
        r.aiConfidence,
        r.risk,
        r.status,
      ]),
    ];
    for (const value of values) {
      expect(value).not.toMatch(/undefined|null|NaN/i);
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("supports candidate-only research context without portfolio calc changes", () => {
    const view = buildPortfolioDashboard({
      candidate: {
        overallScore: 82,
        confidence: 78,
        trustScore: 80,
        validationScore: 85,
        historicalValidationAccuracy: null,
        explainabilityScore: 70,
        signalStability: null,
        recommendationQuality: null,
        riskRating: "Medium",
        generatedAt: "2026-07-14T10:00:00.000Z",
        lastUpdatedAt: "2026-07-14T10:00:00.000Z",
        primaryReasons: [],
        supportingFactors: [],
        negativeFactors: [],
        sectorContribution: null,
        momentumContribution: null,
        volumeContribution: null,
        fundamentalContribution: null,
        marketRegimeContribution: null,
        relativeStrengthContribution: null,
        confidenceDistribution: [],
        ruleContributions: [],
        decisionTrace: [],
        executionPath: [],
        validationTrace: [],
        topPositiveDrivers: [],
        topNegativeDrivers: [],
        riskFactors: [],
        expectedCatalyst: null,
        institutionalFlow: null,
        sectorStrength: null,
        historicalSimilarity: null,
        badges: [],
        timeline: [],
      },
    });
    expect(view.empty).toBe(false);
    expect(view.qualityMatrix[0]?.aiConfidence).toBe("78");
  });
});
