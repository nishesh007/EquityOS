/**
 * Institutional research drawer presentation — tests (Prompt 9F.R3).
 */

import { describe, expect, it } from "vitest";
import {
  buildInstitutionalCandidateView,
} from "@/lib/opportunity-engine/institutional-presentation";
import { buildInstitutionalResearchDrawerView } from "@/lib/dashboard/institutional-research-presentation";
import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

function makeCandidate(
  overrides?: Partial<OpportunityCandidate>
): OpportunityCandidate {
  return {
    id: "AAA:intraday",
    symbol: "AAA",
    company: "Alpha Ltd",
    category: "intraday",
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: 82,
    entryZone: { low: 100, high: 102 },
    stopLoss: 95,
    target1: 110,
    target2: 120,
    riskReward: 2.2,
    confidencePercent: 78,
    reason: "Breakout\nVolume",
    confidenceReasons: ["Breakout above resistance", "Volume expansion"],
    confidenceReasonContributions: [
      { label: "Breakout above resistance", contribution: 10 },
      { label: "Volume expansion", contribution: 8 },
      { label: "High volatility", contribution: -3 },
      { label: "Weak liquidity peer", contribution: -2 },
    ],
    convictionComponents: {
      technical: 70,
      momentum: 65,
      trend: 68,
      volume: 80,
      liquidity: 60,
      fundamentals: 55,
      relativeStrength: 62,
      rewardRisk: 70,
      marketRegime: 58,
    },
    expectedCatalyst: "Earnings",
    sectorStrength: 12,
    gapProbability: 55,
    gapProbabilityLevel: "Medium",
    nearestFilterFailures: ["Low liquidity peer XYZ", "Weak momentum DEF"],
    maximumGainAfterSignal: 8.5,
    maximumDrawdownAfterSignal: -3.2,
    setupDurationHours: 4,
    moveAfterSignalPercent: 6.1,
    scanMetrics: { delivery_percent: 42, volatility: 18 },
    firstDetectedAt: "2026-07-14T04:15:00.000Z",
    lastDetectedAt: "2026-07-14T05:00:00.000Z",
    lastUpdatedAt: "2026-07-14T05:15:00.000Z",
    ...overrides,
  };
}

describe("institutional research drawer", () => {
  it("builds full research drawer from existing candidate + view", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate, {
      platform: null,
      dashboard: {
        summary: {
          totalValidations: 10,
          passedValidations: 9,
          failedValidations: 1,
          warningCount: 0,
          criticalCount: 0,
          averageIntegrityScore: 88,
          averageTrustScore: 86,
          averageHallucinationScore: 10,
          historicalPerformanceScore: 81,
          recommendationQuality: 84,
          tradeSetupQuality: 80,
          generatedAt: new Date().toISOString(),
        },
        modules: [],
        health: {
          overallHealthScore: 88,
          overallClassification: "HEALTHY",
          validationEngineHealth: 90,
          ruleEngineHealth: 88,
          trustEngineHealth: 86,
          historicalEngineHealth: 81,
          recommendationHealth: 84,
          marketHealth: 80,
          technicalHealth: 82,
          fundamentalHealth: 78,
          deteriorating: false,
        },
        engineVersion: "9F",
      },
      trust: {
        averageTrustScore: 86,
        highestTrustScore: 95,
        lowestTrustScore: 60,
        averageTrend: 1,
        trustDistribution: { HIGH_TRUST: 10 },
        rejectedObjects: 0,
        validationRuntime: 100,
        averageValidationRuntime: 10,
        totalCalculations: 10,
      },
      explainability: {
        generatedExplanations: 5,
        decisionTraces: 5,
        ruleCoverage: 80,
        confidenceCoverage: 78,
        averageExplanationTime: 12,
        explainabilityHealthScore: 80,
        snapshotCount: 1,
        lastRunAt: new Date().toISOString(),
      },
    });

    const research = buildInstitutionalResearchDrawerView(view, candidate);

    expect(research.executiveSummary).toContain("Breakout");
    expect(research.investmentThesis.businessSummary).toContain("Alpha Ltd");
    expect(research.investmentThesis.currentOpportunity).toBeTruthy();
    expect(research.investmentThesis.expectedEdge).toMatch(/Risk\/Reward/);
    expect(research.investmentThesis.primaryDrivers.length).toBeGreaterThan(0);
    expect(research.investmentThesis.aiSummary).toBeTruthy();
  });

  it("exposes why this stock driver groups", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate);
    const research = buildInstitutionalResearchDrawerView(view, candidate);
    const titles = research.whyThisStock.map((g) => g.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Positive Drivers",
        "Fundamental Drivers",
        "Technical Drivers",
        "Sector Drivers",
        "Liquidity Drivers",
        "Relative Strength",
        "Momentum",
        "Volume",
        "Valuation",
      ])
    );
    expect(
      research.whyThisStock.some((g) => g.rows.length > 0)
    ).toBe(true);
  });

  it("exposes why not others with rejection categories", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate);
    const research = buildInstitutionalResearchDrawerView(view, candidate);
    expect(research.whyNotOthers.rejectedCandidates[0]).toContain("Filter:");
    expect(research.whyNotOthers.reasons.length).toBeGreaterThan(0);
    expect(research.whyNotOthers.categories.map((c) => c.label)).toEqual(
      expect.arrayContaining([
        "Lower Confidence",
        "Failed Validation",
        "Weak Momentum",
        "Low Liquidity",
        "Risk Too High",
        "Trust Too Low",
      ])
    );
  });

  it("builds bull and bear cases from existing setup fields", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate);
    const research = buildInstitutionalResearchDrawerView(view, candidate);
    expect(research.bullCase.probability).toMatch(/%/);
    expect(research.bullCase.expectedMove).toMatch(/%/);
    expect(research.bullCase.evidence.length).toBeGreaterThan(0);
    expect(research.bearCase.probability).toMatch(/%/);
    expect(research.bearCase.expectedMove).toMatch(/%/);
    expect(research.bearCase.evidence.length).toBeGreaterThan(0);
    expect(research.bullCase.probability).not.toBe("0");
    expect(research.bearCase.expectedMove).not.toBe("0");
  });

  it("builds risk panel and institutional scorecard", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate, {
      platform: null,
      dashboard: null,
      trust: {
        averageTrustScore: 86,
        highestTrustScore: 95,
        lowestTrustScore: 60,
        averageTrend: 0,
        trustDistribution: {},
        rejectedObjects: 0,
        validationRuntime: 0,
        averageValidationRuntime: 0,
        totalCalculations: 5,
      },
      explainability: null,
    });
    const research = buildInstitutionalResearchDrawerView(view, candidate);
    expect(research.riskPanel.overallRiskGrade).toMatch(/Risk|Awaiting/);
    expect(research.riskPanel.gapRisk).toMatch(/%/);
    expect(research.scorecard.aiConviction).toBe("82");
    expect(research.scorecard.trustScore).toBe("86");
    expect(research.scorecard.overallGrade).toMatch(/A|B|C|D/);
    expect(research.scorecard.radar.length).toBeGreaterThanOrEqual(5);
  });

  it("builds catalyst and confidence timelines", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate);
    const research = buildInstitutionalResearchDrawerView(view, candidate);
    const catalystLabels = research.catalystTimeline.map((e) => e.label);
    expect(catalystLabels).toEqual(
      expect.arrayContaining([
        "Detected",
        "Validated",
        "Ranked",
        "Added To Watchlist",
        "Recommendation Generated",
        "Last Updated",
        "Next Review",
      ])
    );
    expect(research.recommendationTimeline.length).toBeGreaterThan(0);
    expect(research.confidenceTimeline.length).toBeGreaterThan(0);
  });

  it("exposes historical similarity from existing signal history fields", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate);
    const research = buildInstitutionalResearchDrawerView(view, candidate);
    expect(research.historicalSimilarity.empty).toBe(false);
    expect(research.historicalSimilarity.similarSetups.length).toBeGreaterThan(0);
    expect(research.historicalSimilarity.averageHoldingPeriod).toBe("4h");
    expect(research.historicalSimilarity.averageReturn).toMatch(/%/);
  });

  it("exposes confidence breakdown weights without bare zeros", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate);
    const research = buildInstitutionalResearchDrawerView(view, candidate);
    expect(research.confidenceBreakdown.confidence).toBe("78%");
    expect(research.confidenceBreakdown.supportingWeight).toMatch(/^\+/);
    expect(research.confidenceBreakdown.negativeWeight).toMatch(/^-/);
    expect(research.confidenceBreakdown.netScore).not.toBe("0");
    expect(research.confidenceBreakdown.drivers.length).toBeGreaterThan(0);
  });

  it("uses empty-state copy when historical evidence is missing", () => {
    const candidate = makeCandidate({
      maximumGainAfterSignal: undefined,
      maximumDrawdownAfterSignal: undefined,
      setupDurationHours: undefined,
      moveAfterSignalPercent: undefined,
      expiredOutcome: undefined,
    });
    const view = buildInstitutionalCandidateView(candidate);
    const research = buildInstitutionalResearchDrawerView(view, candidate);
    expect(research.historicalSimilarity.empty).toBe(true);
    expect(research.historicalSimilarity.emptyMessage).toBe(
      "Insufficient Evidence"
    );
  });
});
