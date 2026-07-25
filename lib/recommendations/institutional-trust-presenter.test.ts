import { describe, expect, it } from "vitest";
import type { SharedRecommendation } from "./shared-recommendation";
import {
  buildEmptyInstitutionalTrustView,
  buildInstitutionalTrustView,
} from "./institutional-trust-presenter";

function sampleShared(
  overrides: Partial<SharedRecommendation> = {}
): SharedRecommendation {
  return {
    id: "rec-infy",
    symbol: "INFY",
    company: "Infosys",
    category: "swing",
    action: "BUY",
    primaryStrategy: "Swing Momentum",
    primaryStrategyId: "swing",
    matchedStrategies: [],
    supportingStrategies: [],
    opposingStrategies: [],
    strategyCount: 1,
    agreementPercent: 80,
    conflictPercent: 10,
    opportunityScore: 75,
    frameworkScore: 72,
    confidence: 88,
    conviction: 84,
    entry: 1500,
    stopLoss: 1420,
    targets: [1580, 1650, 1720],
    risk: 80,
    reward: 220,
    riskReward: 2.5,
    holdingPeriod: "10–15 Trading Days",
    marketContext: "Supportive",
    marketRegime: "Risk-On",
    riskMode: "Neutral",
    eligibility: { eligible: true, score: 80, reasons: [] },
    reasons: ["Trend intact"],
    evidence: [],
    matchedFrameworks: {
      technical: [],
      fundamental: [],
      valuation: [],
      growth: [],
    },
    validation: {
      valid: true,
      score: 100,
      checks: {
        tradeLevels: true,
        institutionalTradeLevels: true,
        confidence: true,
        opportunityScore: true,
        agreement: true,
        marketContext: true,
        marketRegime: true,
        eligibility: true,
      },
      reasons: [],
    },
    longTermRanking: null,
    timestamp: "2026-07-20T10:00:00.000Z",
    source: "StrategyEngine",
    ...overrides,
  };
}

describe("institutional-trust-presenter", () => {
  it("builds graceful empty trust views", () => {
    const view = buildEmptyInstitutionalTrustView("INFY", null);
    expect(view.similarSetups.available).toBe(false);
    expect(view.performance.placeholder).toBeTruthy();
    expect(view.suitability.disclaimer).toContain("Research support tool");
  });

  it("projects performance, audit, suitability from published packages", () => {
    const shared = sampleShared();
    const view = buildInstitutionalTrustView({
      symbol: "INFY",
      shared,
      history: [
        {
          recommendationId: "rec-infy",
          generatedAt: "2026-07-18T09:00:00.000Z",
          status: "ACTIVE",
          statusChangedAt: "2026-07-20T10:00:00.000Z",
          lifecycleEvents: [
            {
              type: "Activated",
              occurredAt: "2026-07-18T09:05:00.000Z",
              reason: "Published to active set",
            },
          ],
          candidate: {
            symbol: "INFY",
            company: "Infosys",
            category: "swing",
            confidencePercent: 84,
            moveAfterSignalPercent: 6.2,
            maximumGainAfterSignal: 8.1,
            setupDurationHours: 120,
          },
        },
      ],
      outcomeSummary: {
        total: 12,
        completed: 10,
        running: 2,
        hitRate: 60,
        stopLossRate: 20,
        averageReturn: 4.5,
        averageHoldingPeriodDays: 9,
        averageDrawdown: 3.2,
        averageMaximumGain: 7.1,
        recommendationSuccessRate: 58,
      },
      outcomeRows: [
        {
          symbol: "INFY",
          company: "Infosys",
          recommendationDate: "2026-07-10T00:00:00.000Z",
          strategy: "Swing Momentum",
          currentReturn: "+5.20%",
          maximumGain: "+8.10%",
          maximumDrawdown: "-2.40%",
          finalGrade: "Successful",
          originalConviction: 84,
          currentHealth: 86,
          expectedHoldingPeriod: "10–15 Trading Days",
        },
        {
          symbol: "TCS",
          company: "TCS",
          recommendationDate: "2026-07-08T00:00:00.000Z",
          strategy: "Swing Momentum",
          currentReturn: "-3.10%",
          maximumGain: "+1.20%",
          maximumDrawdown: "-4.50%",
          finalGrade: "Failed",
          originalConviction: 70,
          currentHealth: 55,
          expectedHoldingPeriod: "10–15 Trading Days",
        },
      ],
      dataTransparency: {
        dataSource: "Financial Fundamentals & Research Engine",
        freshness: "delayed",
        provider: "Mock Provider",
        lastUpdated: "2026-07-25T10:00:00.000Z",
        cacheAge: "5m",
      },
      researchConfidence: {
        overall: 78,
        factors: [
          {
            key: "market",
            label: "Market",
            score: 80,
            explanation: "Quote coverage healthy",
          },
        ],
      },
      eventsLinkedCount: 2,
    });

    expect(view.similarSetups.available).toBe(true);
    expect(view.similarSetups.setups.length).toBeGreaterThan(0);
    expect(view.performance.cards.length).toBe(8);
    expect(view.performance.cards[0]?.label).toBe("Total Recommendations");
    expect(view.confidenceEvolution.current).toBe(88);
    expect(view.confidenceEvolution.previous).toBe(84);
    expect(view.confidenceEvolution.trend).toBe("Rising");
    expect(view.timeline.events.some((e) => e.label === "Recommendation Generated")).toBe(
      true
    );
    expect(view.auditTrail.items).toHaveLength(8);
    expect(view.auditTrail.items.every((item) => item.status !== "Failed")).toBe(
      true
    );
    expect(view.dataQuality.rows).toHaveLength(5);
    expect(view.suitability.recommendationType).toBe("BUY");
    expect(view.suitability.suitableFor).toContain("Swing");
    expect(view.suitability.disclaimer).toContain("Final investment decisions");
  });
});
