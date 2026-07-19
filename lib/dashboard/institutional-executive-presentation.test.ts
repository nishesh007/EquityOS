/**
 * Executive institutional dashboard — presentation helpers tests (Sprint 9F final).
 */

import { describe, expect, it } from "vitest";
import {
  buildExecutiveDashboard,
  buildExecutiveMetrics,
  buildExecutiveStatus,
  buildExecutiveSummary,
} from "@/lib/dashboard/institutional-executive-presentation";
import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import type { PortfolioDoctorAnalysis, PortfolioSummary } from "@/types";

function makeSnapshot(): InstitutionalPlatformSnapshot {
  return {
    platform: {
      overallHealthScore: 88,
      overallTrustScore: 84,
      overallReadiness: 82,
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
        warningCount: 2,
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
      rejectedObjects: 1,
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
    operations: {
      status: {
        initialized: true,
        engineVersion: "9F.32.0",
        certificationStatus: "production_ready",
        health: {
          overallHealthScore: 88,
          overallTrustScore: 84,
          overallReadiness: 82,
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
        engines: [],
        warnings: ["Latency watch"],
        errors: [],
        updatedAt: "2026-07-14T10:10:00.000Z",
      },
      metrics: {
        initialized: true,
        enginesRegistered: 18,
        enginesRequired: 20,
        certificationRuns: 3,
        overallHealthScore: 88,
        overallRisk: 20,
        averageRuntimeMs: 40,
        snapshotCount: 12,
        lastRunAt: "2026-07-14T09:00:00.000Z",
      },
      summary: null,
      observability: null,
      diagnostics: null,
      performance: null,
      security: null,
      release: {
        certificationRuns: 2,
        releaseScore: 88,
        deploymentRisks: 1,
        rollbackReadiness: 90,
        checklistCompletion: 95,
        averageRuntimeMs: 20,
        snapshotCount: 2,
        lastRunAt: "2026-07-14T08:00:00.000Z",
      },
      reporting: {
        reportsGenerated: 4,
        generationTime: 100,
        averageGenerationTime: 25,
        averageSize: 1024,
        snapshotCount: 3,
        exportModelCount: 2,
        templateUsage: {},
        lastGeneratedAt: "2026-07-14T09:30:00.000Z",
      },
      audit: [],
    },
  };
}

function makeOpportunityState(): OpportunityEngineState {
  return {
    tradingDate: "2026-07-14",
    lastScannedAt: "2026-07-14T10:00:00.000Z",
    nextScanAt: null,
    isFrozen: false,
    isScanning: false,
    marketOpen: true,
    scanCount: 3,
    universeSize: 2000,
    categories: {
      intraday: [],
      swing: [],
      breakout: [],
      momentum: [],
      relative_volume: [],
      mean_reversion: [],
      ai_high_conviction: [
        {
          id: "AAA:ai",
          symbol: "AAA",
          company: "Alpha",
          category: "ai_high_conviction",
          side: "Long",
          rank: 1,
          previousRank: null,
          aiConvictionScore: 88,
          entryZone: { low: 100, high: 102 },
          stopLoss: 95,
          target1: 110,
          target2: 120,
          riskReward: 2,
          confidencePercent: 85,
          reason: "Breakout",
          firstDetectedAt: "2026-07-14T09:30:00.000Z",
          lastDetectedAt: "2026-07-14T10:00:00.000Z",
          lastUpdatedAt: "2026-07-14T10:00:00.000Z",
        },
      ],
    },
    recommendations: [],
    postMarket: {
      generatedAt: "2026-07-14T15:45:00.000Z",
      sessionDate: "2026-07-14",
      tomorrowWatchlist: [
        {
          id: "BBB:tw",
          symbol: "BBB",
          company: "Beta",
          category: "swing",
          side: "Long",
          rank: 1,
          previousRank: null,
          aiConvictionScore: 80,
          entryZone: { low: 50, high: 52 },
          stopLoss: 45,
          target1: 60,
          target2: 65,
          riskReward: 2,
          confidencePercent: 78,
          reason: "Setup",
          firstDetectedAt: "2026-07-14T15:00:00.000Z",
          lastDetectedAt: "2026-07-14T15:45:00.000Z",
          lastUpdatedAt: "2026-07-14T15:45:00.000Z",
        },
      ],
      missedOpportunities: [],
      bestCallsOfDay: [],
    },
    scanHistory: [],
    lastScanMetrics: null,
  };
}

function makeDoctor(): PortfolioDoctorAnalysis {
  return {
    generatedAt: "2026-07-14T10:00:00.000Z",
    healthScore: {
      overall: 78,
      verdict: "Healthy Portfolio",
      factors: [],
      summary: "Healthy",
    },
    diversification: {
      score: 72,
      sectorAllocation: [],
      marketCapAllocation: [],
      largeCapPercent: 70,
      midCapPercent: 20,
      smallCapPercent: 10,
      maxSingleStockPercent: 30,
      maxSingleStockSymbol: "RELIANCE",
      top5HoldingsPercent: 70,
      grade: "B",
      gradeExplanation: "OK",
      herfindahlIndex: 0.2,
    },
    riskEngine: {
      concentrationRisk: {
        key: "c",
        label: "C",
        score: 40,
        level: "Medium",
        tone: "accent",
        explanation: "",
      },
      volatilityRisk: {
        key: "v",
        label: "V",
        score: 40,
        level: "Medium",
        tone: "accent",
        explanation: "",
      },
      sectorRisk: {
        key: "s",
        label: "S",
        score: 40,
        level: "Medium",
        tone: "accent",
        explanation: "",
      },
      correlationRisk: {
        key: "r",
        label: "R",
        score: 40,
        level: "Medium",
        tone: "accent",
        explanation: "",
      },
      drawdownRisk: {
        key: "d",
        label: "D",
        score: 40,
        level: "Medium",
        tone: "accent",
        explanation: "",
      },
      liquidityRisk: {
        key: "l",
        label: "L",
        score: 30,
        level: "Low",
        tone: "gain",
        explanation: "",
      },
      overallRisk: 40,
      overallRiskLabel: "Medium",
      overallTone: "accent",
      summary: "Balanced",
    },
    diagnostics: [
      {
        key: "over",
        label: "Overweight",
        severity: "yellow",
        description: "Trim concentration",
      },
    ],
    recommendations: [],
    rebalancing: {
      currentAllocation: [],
      suggestedAllocation: [],
      summary: "",
    },
    positionSizing: [],
    sectorAllocation: [],
    quality: {
      averageRoe: 15,
      averageRoce: 14,
      averageDebtToEquity: 0.3,
      averageGrowth: 10,
      averagePe: 20,
      averageDividendYield: 1,
      qualityScore: 75,
      qualityTone: "gain",
      summary: "Quality ok",
    },
    summary: {
      healthScore: 78,
      riskLevel: "Medium",
      diversificationGrade: "B",
      expectedCagr: 12,
      worstRisk: "Concentration",
      bestOpportunity: "IT",
      headline: "Healthy",
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

function makePortfolio(): PortfolioSummary {
  return {
    totalValue: 100000,
    dayChange: 100,
    dayChangePercent: 0.1,
    totalInvested: 90000,
    totalGain: 10000,
    totalGainPercent: 11,
    holdings: [
      {
        id: "1",
        symbol: "RELIANCE",
        name: "Reliance",
        quantity: 1,
        avgPrice: 2400,
        currentPrice: 2500,
        changePercent: 1,
      },
    ],
  };
}

describe("institutional-executive-presentation", () => {
  it("builds executive dashboard from unified snapshots", () => {
    const view = buildExecutiveDashboard({
      snapshot: makeSnapshot(),
      opportunityState: makeOpportunityState(),
      doctor: makeDoctor(),
      portfolio: makePortfolio(),
      earnings: [
        {
          id: "e1",
          company: "Alpha",
          symbol: "AAA",
          date: "2026-07-20",
          quarter: "Q1",
          sector: "IT",
          marketCap: "Large",
        },
      ],
      subject: {
        userId: "admin",
        role: "administrator",
        subscriptionTier: "enterprise",
      },
      marketStatus: "open",
    });

    expect(view.empty).toBe(false);
    expect(view.header.institutionalGrade).toMatch(/Institutional|Strong|Watch|Caution|Critical|Awaiting/);
    expect(view.header.marketStatus.length).toBeGreaterThan(0);
    expect(view.metrics.length).toBeGreaterThanOrEqual(10);
    expect(view.statusStrip.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        "market",
        "scanner",
        "validation",
        "trust",
        "ai",
        "reporting",
        "export",
        "portfolio",
      ])
    );
    expect(view.readiness.productionReady).toBe("Production Ready");
    expect(view.exportPreviewOnly).toBe(false);
    expect(view.footer.platformVersion).toBeTruthy();
  });

  it("builds metrics scoreboard without undefined/null/NaN", () => {
    const metrics = buildExecutiveMetrics({
      snapshot: makeSnapshot(),
      doctor: makeDoctor(),
    });
    for (const m of metrics) {
      expect(m.value).not.toMatch(/undefined|null|NaN/i);
      expect(m.value.length).toBeGreaterThan(0);
    }
    expect(metrics.find((m) => m.id === "validation")?.value).toBe("88");
    expect(metrics.find((m) => m.id === "portfolio")?.value).toBe("78");
  });

  it("builds system summary from opportunity + reporting", () => {
    const summary = buildExecutiveSummary({
      snapshot: makeSnapshot(),
      opportunityState: makeOpportunityState(),
      alertsCount: 3,
    });
    expect(summary.totalSymbols).toBe("2000");
    expect(summary.activeOpportunities).toBe("1");
    expect(summary.tomorrowWatchlist).toBe("1");
    expect(summary.openAlerts).toBe("3");
  });

  it("builds status strip module statuses", () => {
    const strip = buildExecutiveStatus({
      snapshot: makeSnapshot(),
      opportunityState: makeOpportunityState(),
      doctor: makeDoctor(),
      marketStatus: "open",
    });
    expect(strip.find((s) => s.id === "market")?.status).toBe("Healthy");
    expect(strip.find((s) => s.id === "validation")?.status).toBe("Healthy");
    expect(strip.find((s) => s.id === "portfolio")?.status).toBe("Healthy");
  });

  it("gates free users with preview + upgrade CTA flags", () => {
    const view = buildExecutiveDashboard({
      snapshot: makeSnapshot(),
      subject: { userId: "free", role: "free", subscriptionTier: "none" },
    });
    expect(view.exportPreviewOnly).toBe(true);
    expect(view.exportUpgradeRequired).toBe(true);
    const exportAction = view.quickActions.find((a) => a.id === "export");
    expect(exportAction?.label).toMatch(/Upgrade/i);
  });

  it("surfaces alerts from validation trust platform earnings portfolio", () => {
    const view = buildExecutiveDashboard({
      snapshot: makeSnapshot(),
      doctor: makeDoctor(),
      earnings: [
        {
          id: "e1",
          company: "Alpha",
          symbol: "AAA",
          date: "2026-07-20",
          quarter: "Q1",
          sector: "IT",
          marketCap: "Large",
        },
      ],
    });
    const sources = view.alerts.map((a) => a.source);
    expect(sources).toEqual(
      expect.arrayContaining(["Validation", "Trust", "Platform", "Earnings", "Portfolio"])
    );
  });

  it("hides unavailable quick actions and keeps core routes", () => {
    const view = buildExecutiveDashboard({
      snapshot: makeSnapshot(),
      subject: {
        userId: "sub",
        role: "subscriber",
        subscriptionTier: "pro",
      },
    });
    const ids = view.quickActions.map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "research",
        "portfolio",
        "market",
        "settings",
        "export",
      ])
    );
    expect(view.quickActions.every((a) => a.available)).toBe(true);
  });

  it("returns awaiting empty state when no snapshots", () => {
    const view = buildExecutiveDashboard({});
    expect(view.empty).toBe(true);
    expect(view.emptyMessage).toBe("Awaiting Validation");
  });
});
