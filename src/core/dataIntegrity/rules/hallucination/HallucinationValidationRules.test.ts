/**
 * AI Hallucination Detection — unit tests (Prompt 9F.8).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RuleEngine } from "../RuleEngine";
import {
  registerHallucinationRules,
  resetHallucinationRuleRegistrationState,
  resetHallucinationValidationMetrics,
  resetHallucinationAuditLog,
  getHallucinationValidationMetrics,
  getHallucinationAuditLog,
  buildHallucinationRules,
  calculateHallucinationScore,
  validateAIOutput,
  validateFacts,
  validateEvidence,
  validateReasoning,
  detectContradictions,
  DEFAULT_HALLUCINATION_VALIDATION_CONFIG,
} from "./index";

function validAIReport(overrides: Record<string, unknown> = {}) {
  return {
    aiOutputId: "AI-RPT-001",
    timestamp: "2026-07-14T10:00:00.000Z",
    action: "BUY",
    confidence: 72,
    summary:
      "Trend and fundamentals support a constructive accumulation stance.",
    keyFindings: [
      "Revenue growth 18% YoY from validated filings",
      "Price holding above 50 DMA with rising volume",
    ],
    bullCase: "Continued margin expansion and sector tailwinds.",
    bearCase: "Input cost inflation and delayed product cycle.",
    risks: ["Earnings miss", "Sector derating"],
    catalysts: ["Upcoming product launch", "Margin guidance raise"],
    conclusion:
      "Evidence-backed setup favors accumulation on dips with defined risk.",
    conclusionBias: "bullish",
    recommendation: "BUY",
    primaryReason:
      "Validated growth, supportive technicals, and constructive sector trend.",
    supportingFactors: ["Revenue growth", "Breakout confirmation"],
    assumptions: ["No major macro shock", "Guidance remains intact"],
    reasoningBias: "bullish",
    analysisBias: "bullish",
    mentionsPrice: true,
    mentionsFinancials: true,
    mentionsIndicators: true,
    revenue: 1000,
    profit: 120,
    eps: 12,
    growth: 18,
    pe: 22,
    marketCap: 50_000,
    revenueGrowth: 18,
    evidenceScore: 80,
    signalStrength: 78,
    evidence: {
      score: 80,
      support: 80,
      priceSource: "polygon-validated",
      financialSource: "fundamentals-engine",
      indicatorSource: "technical-engine",
      corporateActionSource: "corp-actions-db",
      historicalSource: "historical-dataset",
      recommendationSource: "rec-engine",
      financial: {
        revenue: 1000,
        profit: 120,
        eps: 12,
        growth: 18,
        revenueGrowth: 18,
        marketCap: 50_000,
      },
      price: { ltp: 250 },
    },
    technical: {
      score: 78,
      trend: "bullish",
      overall: "bullish",
      strength: 78,
    },
    market: {
      score: 75,
      sectorTrend: "bullish",
      indexTrend: "bullish",
      volatility: 18,
      macro: "stable",
      news: "Product launch coverage constructive",
      upcomingEarnings: "2026-08-01",
    },
    sectorTrend: "bullish",
    indexTrend: "bullish",
    volatility: 18,
    macroEnvironment: "stable",
    recentNews: "Product launch coverage constructive",
    upcomingEarnings: "2026-08-01",
    historical: {
      score: 70,
      consistency: 70,
    },
    previousRecommendation: {
      action: "ACCUMULATE",
      confidence: 68,
      reason: "Prior constructive stance on consolidation",
    },
    statements: [
      {
        text: "Revenue grew 18% YoY",
        supported: true,
        evidenceRef: "financial.revenueGrowth",
      },
      {
        text: "Price above 50 DMA",
        supported: true,
        source: "indicatorSource",
      },
    ],
    ...overrides,
  };
}

describe("Hallucination rule registration", () => {
  beforeEach(() => {
    resetHallucinationRuleRegistrationState();
    resetHallucinationValidationMetrics();
    resetHallucinationAuditLog();
  });

  it("registers hallucination rules idempotently", () => {
    const engine = new RuleEngine();
    const first = registerHallucinationRules({ engine });
    expect(first.registered).toBeGreaterThan(20);
    const second = registerHallucinationRules({ engine });
    expect(second.registered).toBe(0);
    expect(buildHallucinationRules().length).toBe(first.total);
    expect(
      DEFAULT_HALLUCINATION_VALIDATION_CONFIG.minHallucinationScore
    ).toBeGreaterThan(0);
  });
});

describe("Valid AI reports", () => {
  beforeEach(() => {
    resetHallucinationRuleRegistrationState();
    resetHallucinationAuditLog();
  });

  it("accepts a coherent institutional AI report", async () => {
    const engine = new RuleEngine();
    registerHallucinationRules({ engine });
    const result = await validateAIOutput(validAIReport(), { engine });
    expect(result.failedRules).toEqual([]);
  });
});

describe("Hallucination rejection cases", () => {
  beforeEach(() => {
    resetHallucinationRuleRegistrationState();
    resetHallucinationAuditLog();
  });

  it("rejects fabricated financial data", async () => {
    const engine = new RuleEngine();
    registerHallucinationRules({ engine });
    const result = await validateFacts(
      validAIReport({
        fabricatedNumbers: true,
        inventedFinancialMetrics: true,
      }),
      { engine }
    );
    expect(result.failedRules.some((id) => id.startsWith("hal.fact."))).toBe(
      true
    );
  });

  it("rejects invented earnings", async () => {
    const engine = new RuleEngine();
    registerHallucinationRules({ engine });
    const result = await validateFacts(
      validAIReport({ inventedEarnings: true }),
      { engine }
    );
    expect(result.failedRules).toContain("hal.fact.no_fabrication_flags");
  });

  it("rejects invented targets", async () => {
    const engine = new RuleEngine();
    registerHallucinationRules({ engine });
    const result = await validateFacts(
      validAIReport({ inventedTargets: true, targetPrice: 999 }),
      { engine }
    );
    expect(result.failedRules).toContain("hal.fact.invented_targets");
  });

  it("rejects contradictory reasoning", async () => {
    const engine = new RuleEngine();
    registerHallucinationRules({ engine });
    const result = await detectContradictions(
      validAIReport({
        reasoningBias: "bearish",
        analysisBias: "bearish",
        action: "BUY",
        recommendation: "BUY",
        technical: { score: 20, trend: "bearish", overall: "bearish" },
      }),
      { engine }
    );
    expect(
      result.failedRules.some((id) => id.startsWith("hal.contradiction."))
    ).toBe(true);
  });

  it("rejects unsupported confidence", async () => {
    const engine = new RuleEngine();
    registerHallucinationRules({ engine });
    const result = await validateAIOutput(
      validAIReport({
        confidence: 98,
        evidenceScore: 20,
        evidence: {
          score: 20,
          support: 20,
          priceSource: "polygon-validated",
          financialSource: "fundamentals-engine",
          indicatorSource: "technical-engine",
          financial: { revenue: 1000, profit: 120, eps: 12, growth: 18 },
        },
        signalStrength: 30,
        inflatedConfidence: true,
      }),
      { engine }
    );
    expect(
      result.failedRules.some((id) => id.startsWith("hal.confidence."))
    ).toBe(true);
  });

  it("rejects missing evidence", async () => {
    const engine = new RuleEngine();
    registerHallucinationRules({ engine });
    const result = await validateEvidence(
      validAIReport({
        missingEvidence: true,
        evidence: {},
        evidenceScore: undefined,
        mentionsPrice: true,
        mentionsFinancials: true,
        mentionsIndicators: true,
        statements: [{ text: "Claim without proof", supported: false }],
      }),
      { engine }
    );
    expect(
      result.failedRules.some(
        (id) => id.startsWith("hal.source.") || id.startsWith("hal.evidence.")
      )
    ).toBe(true);
  });

  it("rejects historical contradictions", async () => {
    const engine = new RuleEngine();
    registerHallucinationRules({ engine });
    const result = await validateAIOutput(
      validAIReport({
        historicalContradiction: true,
        action: "SELL",
        recommendation: "SELL",
        previousRecommendation: { action: "STRONG_BUY", confidence: 80 },
      }),
      { engine }
    );
    expect(
      result.failedRules.some((id) => id.startsWith("hal.historical."))
    ).toBe(true);
  });

  it("rejects numerical inconsistencies", async () => {
    const engine = new RuleEngine();
    registerHallucinationRules({ engine });
    const result = await validateAIOutput(
      validAIReport({
        revenue: 5000,
        numericalInconsistency: true,
      }),
      { engine }
    );
    expect(
      result.failedRules.some((id) => id.startsWith("hal.numerical."))
    ).toBe(true);
  });

  it("rejects market context failures", async () => {
    const engine = new RuleEngine();
    registerHallucinationRules({ engine });
    const result = await validateAIOutput(
      validAIReport({
        missingMarketContext: true,
        market: {},
        sectorTrend: undefined,
        indexTrend: undefined,
        volatility: undefined,
        macroEnvironment: undefined,
        recentNews: undefined,
      }),
      { engine }
    );
    expect(
      result.failedRules.some((id) => id.startsWith("hal.market."))
    ).toBe(true);
  });
});

describe("Scoped validators and score", () => {
  beforeEach(() => {
    resetHallucinationRuleRegistrationState();
    resetHallucinationAuditLog();
    resetHallucinationValidationMetrics();
  });

  it("validateReasoning scopes to reasoning rules", async () => {
    const engine = new RuleEngine();
    registerHallucinationRules({ engine });
    const result = await validateReasoning(validAIReport(), { engine });
    expect(
      result.results.every((r) => r.ruleId.startsWith("hal.reasoning."))
    ).toBe(true);
    expect(result.failedRules).toEqual([]);
  });

  it("calculateHallucinationScore returns 0–100 with band", () => {
    const score = calculateHallucinationScore(validAIReport());
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.rejected).toBe(false);
    expect(["INSTITUTIONAL_GRADE", "EXCELLENT", "ACCEPTABLE"]).toContain(
      score.band
    );
  });

  it("tracks metrics and audit log after validation", async () => {
    const engine = new RuleEngine();
    registerHallucinationRules({ engine });
    await validateAIOutput(validAIReport(), { engine });
    const metrics = getHallucinationValidationMetrics();
    expect(metrics.aiOutputsValidated).toBe(1);
    expect(metrics.averageHallucinationScore).toBeGreaterThan(0);
    expect(getHallucinationAuditLog().length).toBeGreaterThan(0);
  });
});
