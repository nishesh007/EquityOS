import { describe, expect, it } from "vitest";
import {
  buildEmptyResearchIntelligenceView,
  buildResearchIntelligenceView,
} from "./research-intelligence-presenter";
import type { SharedRecommendation } from "./shared-recommendation";
import type { EquityIntelligence, CompanyResearch } from "@/types";

function sampleShared(): SharedRecommendation {
  return {
    id: "1",
    symbol: "INFY",
    company: "Infosys",
    category: "swing",
    action: "BUY",
    primaryStrategy: "Swing",
    primaryStrategyId: "swing",
    matchedStrategies: [],
    supportingStrategies: [],
    opposingStrategies: [],
    strategyCount: 1,
    agreementPercent: 70,
    conflictPercent: 10,
    opportunityScore: 72,
    frameworkScore: 70,
    confidence: 74,
    conviction: 72,
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
      technical: ["Above EMA"],
      fundamental: ["ROE resilience"],
      valuation: ["Near fair value"],
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
    timestamp: "2026-07-25T10:00:00.000Z",
    source: "StrategyEngine",
  };
}

describe("research-intelligence-presenter", () => {
  it("builds graceful empty views with shared fallbacks", () => {
    const view = buildEmptyResearchIntelligenceView("INFY", sampleShared());
    expect(view.technical.available).toBe(true);
    expect(view.technical.metrics[0]?.value).toBe("Above EMA");
    expect(view.related.links.length).toBe(7);
    expect(view.related.links[0]?.href).toContain("/company/INFY");
    expect(view.quality.cards).toHaveLength(7);
  });

  it("projects valuation and quality when intelligence is present", () => {
    const intelligence = {
      financialQuality: {
        overallScore: 78,
        scores: [
          {
            key: "revenue-growth",
            label: "Revenue Growth",
            score: 80,
            explanation: "Steady top-line compounding.",
            trend: "up",
          },
          {
            key: "roe",
            label: "ROE",
            score: 76,
            explanation: "Healthy equity returns.",
            trend: "stable",
          },
          {
            key: "capital-allocation",
            label: "Capital Allocation",
            score: 70,
            explanation: "Disciplined deployment.",
            trend: "up",
          },
        ],
      },
      valuation: {
        available: true,
        overallVerdict: "Undervalued",
        estimatedFairValue: 1700,
        intrinsicValue: 1725,
        marginOfSafety: 12.5,
        upsidePercent: 14,
        expectedCagr: 11,
        confidence: 70,
        summary: "Multi-model blend points to undervaluation.",
        models: [
          {
            key: "dcf",
            label: "DCF",
            fairValue: 1750,
            weight: 0.35,
            verdict: "Undervalued",
            confidence: 70,
            explanation: "DCF supportive",
          },
          {
            key: "graham",
            label: "Graham",
            fairValue: 1680,
            weight: 0.2,
            verdict: "Fairly Valued",
            confidence: 65,
            explanation: "Graham near par",
          },
          {
            key: "epv",
            label: "EPV",
            fairValue: 1710,
            weight: 0.2,
            verdict: "Undervalued",
            confidence: 68,
            explanation: "EPV supportive",
          },
          {
            key: "relative-pe",
            label: "Relative PE",
            fairValue: 1650,
            weight: 0.25,
            verdict: "Fairly Valued",
            confidence: 60,
            explanation: "Relative neutral",
          },
        ],
        pe: { value: 22, fairValue: 24, verdict: "Undervalued" },
        pb: { value: 6, fairValue: 7, verdict: "Fairly Valued" },
        evEbitda: { value: 14, fairValue: 15, verdict: "Fairly Valued" },
        peg: { value: 1.4, fairValue: 1.5, verdict: "Fairly Valued" },
        relativeVsPeers: "Fairly Valued",
        historicalRange: { percentile: 40, verdict: "Undervalued" },
      },
      redFlags: [
        {
          key: "debt",
          label: "Leverage Watch",
          severity: "Medium",
          description: "Debt metrics deserve monitoring.",
          metric: "D/E",
        },
      ],
      opportunities: [
        {
          key: "margin",
          label: "Margin Expansion",
          description: "Operating leverage room remains.",
          metric: "EBIT",
        },
      ],
      decision: {
        risk: { overallRiskMeter: 42, metrics: [] },
        aiSummary: {
          majorRisks: ["Execution risk on large deals"],
          greenFlags: ["Cash conversion solid"],
          catalysts: ["Digital demand"],
        },
      },
      thesis: {
        keyCatalysts: ["Enterprise tech spend"],
        managementQuality: "Stable capital allocation culture.",
        valuationOpinion: "Attractive on absolute and relative screens.",
      },
      score: { overall: 76, explanation: "Quality compounder.", factors: [] },
      summary: { summary: "Constructive long-term setup." },
    } as unknown as EquityIntelligence;

    const research = {
      technicals: {
        score: 68,
        summary: "bullish",
        bullishCount: 5,
        neutralCount: 2,
        bearishCount: 1,
        indicators: [],
      },
      ai: {
        trend: "Uptrend intact",
        momentum: "Improving",
        volumeAnalysis: "Healthy participation",
        support: 1480,
        resistance: 1580,
        riskLevel: "Medium",
        investmentThesis: "Price remains above major averages with improving momentum.",
        generatedAt: "2026-07-25T10:00:00.000Z",
      },
    } as unknown as CompanyResearch;

    const view = buildResearchIntelligenceView({
      symbol: "INFY",
      research,
      intelligence,
      shared: sampleShared(),
      linkedEvents: [],
    });

    expect(view.technical.verdict).toBe("Bullish");
    expect(view.technical.metrics.find((m) => m.label === "Support")?.value).toContain("1,480");
    expect(view.fundamental.overallScore).toBe(78);
    expect(view.valuation.overallVerdict).toBe("Undervalued");
    expect(view.valuation.models[0]?.label).toBe("DCF");
    expect(view.risk.overallRiskLevel).toBe("Low");
    expect(view.quality.cards).toHaveLength(7);
    expect(view.quality.cards.at(-1)?.value).toBe("78");
  });
});
