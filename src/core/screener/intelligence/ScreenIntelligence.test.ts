/**
 * Institutional AI Screener intelligence — unit tests (Sprint 9D.R2).
 */

import { describe, expect, it } from "vitest";
import {
  SCREEN_INTELLIGENCE_EMPTY,
  SCREEN_RANKING_MODES,
  TECHNICAL_FILTER_IDS,
  FUNDAMENTAL_FILTER_IDS,
  TechnicalScreenEngine,
  assertNoSentinelText,
  buildExplainability,
  composeScreenScoreFactors,
  deriveFundamentalStrength,
  deriveTechnicalStrength,
  emptyIntelligenceResult,
  gradeFromScore,
  normalizeResultCard,
  rankResults,
  runFundamentalScreen,
  runMultiFactorScreen,
  runTechnicalScreen,
  scoreCandidate,
  type ScreenUniverseCandidate,
  type ScreenEngineScores,
  type ScreenResultCard,
} from "../index";

const strong: ScreenUniverseCandidate = {
  ticker: "RELIANCE",
  company: "Reliance Industries",
  sector: "Energy",
  industry: "Oil & Gas",
  price: 2800,
  marketCap: 1_800_000,
  metrics: {
    rsi: 55,
    macd: 2.5,
    macd_histogram: 1.2,
    ema20: 2750,
    ema50: 2700,
    ema200: 2500,
    sma50: 2700,
    sma200: 2500,
    adx: 32,
    atr: 40,
    bollinger_width: 12,
    supertrend: 2600,
    relative_strength: 72,
    momentum: 18,
    price_above_ema50: 1,
    price_above_ema200: 1,
    relative_volume: 2.1,
    resistance: 2750,
    week52_high: 2850,
    week52_low: 2100,
    golden_cross: 1,
    market_cap: 1_800_000,
    revenue_yoy: 14,
    profit_yoy: 16,
    eps_yoy: 12,
    roe: 18,
    roce: 17,
    debt_equity: 0.4,
    current_ratio: 1.4,
    peg: 1.1,
    pe: 22,
    pb: 3.2,
    dividend_yield: 0.8,
    operating_margin: 14,
    net_margin: 9,
    promoter_holding: 50,
    fii_holding: 18,
    dii_holding: 12,
    cash_conversion: 90,
    fcf: 12000,
    quality_score: 78,
    momentum_score: 70,
    overall_score: 75,
  },
};

const weak: ScreenUniverseCandidate = {
  ticker: "WEAKCO",
  company: "Weak Co",
  sector: "—",
  industry: "—",
  price: 100,
  metrics: {
    rsi: 85,
    macd: -2,
    debt_equity: 4,
    roe: 2,
  },
};

const scores: ScreenEngineScores[] = [
  {
    ticker: "RELIANCE",
    aiScore: 80,
    opportunityScore: 78,
    trustScore: 74,
    validationScore: 71,
    confidence: 69,
    reasonSummary: "Institutional multi-factor strength",
  },
  {
    ticker: "WEAKCO",
    aiScore: 20,
    opportunityScore: 18,
    trustScore: 22,
    validationScore: 19,
    confidence: 15,
  },
];

function cardFrom(ticker: string, overrides: Partial<ScreenResultCard> = {}): ScreenResultCard {
  return normalizeResultCard({
    ticker,
    company: ticker,
    sector: "Tech",
    industry: "Software",
    price: 100,
    aiScore: 70,
    validation: 60,
    trust: 60,
    confidence: 55,
    technicalGrade: "B",
    fundamentalGrade: "B",
    reasonSummary: "test",
    matchedFilters: ["RSI"],
    rank: 0,
    factors: {
      opportunityScore: 70,
      validationScore: 60,
      trustScore: 60,
      aiConfidence: 55,
      fundamentalStrength: 65,
      technicalStrength: 70,
      momentumStrength: 60,
      sectorStrength: 55,
      marketStrength: 58,
      finalAiScreenerScore: 66,
    },
    ...overrides,
  });
}

describe("Institutional AI Screener Intelligence (9D.R2)", () => {
  describe("Technical screening", () => {
    it("registers all required technical filter ids", () => {
      expect(TECHNICAL_FILTER_IDS.length).toBe(19);
      expect(TECHNICAL_FILTER_IDS).toContain("rsi");
      expect(TECHNICAL_FILTER_IDS).toContain("golden_cross");
      expect(TECHNICAL_FILTER_IDS).toContain("price_above_200_dma");
    });

    it("matches strong technical setups", () => {
      const result = runTechnicalScreen({
        universe: [strong, weak],
        engineScores: scores,
        filters: ["rsi", "macd", "ema_alignment", "price_above_50_dma"],
        minMatches: 2,
      });
      expect(result.empty).toBe(false);
      expect(result.cards.some((c) => c.ticker === "RELIANCE")).toBe(true);
      expect(result.cards[0]?.rank).toBe(1);
      expect(result.cards[0]?.matchedFilters.length).toBeGreaterThan(0);
    });

    it("returns No Technical Matches when none pass", () => {
      const result = runTechnicalScreen({
        universe: [weak],
        filters: ["ema_alignment", "golden_cross"],
        minMatches: 2,
      });
      expect(result.emptyMessage).toBe(SCREEN_INTELLIGENCE_EMPTY.noTechnicalMatches);
    });

    it("returns Awaiting Screening for empty universe", () => {
      const result = runTechnicalScreen({ universe: [] });
      expect(result.emptyMessage).toBe(SCREEN_INTELLIGENCE_EMPTY.awaitingScreening);
    });

    it("TechnicalScreenEngine class run mirrors function", () => {
      const engine = new TechnicalScreenEngine();
      const result = engine.run({
        universe: [strong],
        filters: ["rsi"],
        minMatches: 1,
      });
      expect(result.mode).toBe("technical");
      expect(result.totalMatches).toBeGreaterThan(0);
    });
  });

  describe("Fundamental screening", () => {
    it("registers all required fundamental filter ids", () => {
      expect(FUNDAMENTAL_FILTER_IDS.length).toBe(19);
      expect(FUNDAMENTAL_FILTER_IDS).toContain("roe");
      expect(FUNDAMENTAL_FILTER_IDS).toContain("free_cash_flow");
      expect(FUNDAMENTAL_FILTER_IDS).toContain("promoter_holding");
    });

    it("matches quality fundamental names", () => {
      const result = runFundamentalScreen({
        universe: [strong, weak],
        engineScores: scores,
        filters: ["roe", "roce", "debt_equity", "pe"],
        minMatches: 3,
      });
      expect(result.empty).toBe(false);
      expect(result.cards[0]?.ticker).toBe("RELIANCE");
      expect(result.cards[0]?.fundamentalGrade).toBeTruthy();
    });

    it("returns No Fundamental Matches when filters fail", () => {
      const result = runFundamentalScreen({
        universe: [weak],
        filters: ["roe", "roce", "debt_equity"],
        minMatches: 3,
      });
      expect(result.emptyMessage).toBe(
        SCREEN_INTELLIGENCE_EMPTY.noFundamentalMatches
      );
    });
  });

  describe("AI scoring", () => {
    it("composes final AI screener score 0–100", () => {
      const factors = composeScreenScoreFactors(strong, scores[0]);
      expect(factors.finalAiScreenerScore).toBeGreaterThanOrEqual(0);
      expect(factors.finalAiScreenerScore).toBeLessThanOrEqual(100);
      expect(factors.opportunityScore).toBe(78);
      expect(factors.trustScore).toBe(74);
      expect(factors.validationScore).toBe(71);
      expect(factors.technicalStrength).toBeGreaterThan(50);
      expect(factors.fundamentalStrength).toBeGreaterThan(50);
    });

    it("derives technical and fundamental strength without NaN", () => {
      expect(Number.isFinite(deriveTechnicalStrength(strong))).toBe(true);
      expect(Number.isFinite(deriveFundamentalStrength(strong))).toBe(true);
      expect(Number.isFinite(scoreCandidate(weak).finalAiScreenerScore)).toBe(
        true
      );
    });

    it("grades map scores to institutional letters", () => {
      expect(gradeFromScore(95)).toBe("A+");
      expect(gradeFromScore(82)).toBe("A");
      expect(gradeFromScore(10)).toBe("F");
      expect(gradeFromScore(Number.NaN)).toBe("F");
    });
  });

  describe("Ranking", () => {
    it("supports all ranking modes", () => {
      expect(SCREEN_RANKING_MODES).toEqual([
        "Overall",
        "Technical",
        "Fundamental",
        "Momentum",
        "Growth",
        "Value",
        "Quality",
        "Income",
        "Turnaround",
      ]);
    });

    it("ranks by technical strength when mode is Technical", () => {
      const a = cardFrom("AAA", {
        factors: {
          ...cardFrom("AAA").factors,
          technicalStrength: 90,
          finalAiScreenerScore: 50,
        },
      });
      const b = cardFrom("BBB", {
        factors: {
          ...cardFrom("BBB").factors,
          technicalStrength: 40,
          finalAiScreenerScore: 90,
        },
      });
      const ranked = rankResults([b, a], "Technical");
      expect(ranked[0]?.ticker).toBe("AAA");
      expect(ranked[0]?.rank).toBe(1);
      expect(ranked[1]?.rank).toBe(2);
    });

    it("ranks by overall AI score by default", () => {
      const a = cardFrom("LOW", {
        factors: { ...cardFrom("LOW").factors, finalAiScreenerScore: 40 },
        aiScore: 40,
      });
      const b = cardFrom("HIGH", {
        factors: { ...cardFrom("HIGH").factors, finalAiScreenerScore: 88 },
        aiScore: 88,
      });
      const ranked = rankResults([a, b], "Overall");
      expect(ranked[0]?.ticker).toBe("HIGH");
    });
  });

  describe("Explainability", () => {
    it("buildExplainability includes why/matched/failed/evidence", () => {
      const factors = scoreCandidate(strong, scores[0]);
      const explain = buildExplainability({
        ticker: "RELIANCE",
        matchedRules: ["RSI", "ROE"],
        failedRules: ["PEG"],
        factors,
        reasonSummary: "Strong setup",
      });
      expect(explain.empty).toBe(false);
      expect(explain.whyMatched).toContain("RELIANCE");
      expect(explain.matchedRules).toEqual(["RSI", "ROE"]);
      expect(explain.failedRules).toEqual(["PEG"]);
      expect(explain.positiveFactors.length).toBeGreaterThan(0);
      expect(explain.negativeFactors.length).toBeGreaterThan(0);
      expect(explain.confidenceBreakdown).toContain("AI confidence");
      expect(explain.supportingEvidence.length).toBeGreaterThan(0);
      expect(assertNoSentinelText(explain.aiReasoning)).toBe(true);
    });

    it("empty explainability uses awaiting copy", () => {
      const explain = buildExplainability({
        ticker: "X",
        matchedRules: [],
        failedRules: [],
        factors: scoreCandidate({ ticker: "X" }),
      });
      expect(explain.emptyMessage).toBe(
        SCREEN_INTELLIGENCE_EMPTY.awaitingScreening
      );
    });
  });

  describe("Multi-factor / result cards", () => {
    it("runMultiFactorScreen requires tech + fund + AI score", () => {
      const result = runMultiFactorScreen({
        universe: [strong, weak],
        engineScores: scores,
        minTechnicalMatches: 1,
        minFundamentalMatches: 1,
        minAiScore: 40,
      });
      expect(result.empty).toBe(false);
      expect(result.mode).toBe("multi-factor");
      const card = result.cards[0];
      expect(card?.ticker).toBe("RELIANCE");
      expect(card?.company).toBeTruthy();
      expect(card?.sector).toBeTruthy();
      expect(card?.industry).toBeTruthy();
      expect(Number.isFinite(card!.price)).toBe(true);
      expect(Number.isFinite(card!.aiScore)).toBe(true);
      expect(Number.isFinite(card!.validation)).toBe(true);
      expect(Number.isFinite(card!.trust)).toBe(true);
      expect(Number.isFinite(card!.confidence)).toBe(true);
      expect(card?.technicalGrade).toBeTruthy();
      expect(card?.fundamentalGrade).toBeTruthy();
      expect(card?.reasonSummary).toBeTruthy();
      expect(card?.matchedFilters.length).toBeGreaterThan(0);
      expect(card?.rank).toBe(1);
    });

    it("returns No AI Matches when nothing clears the bar", () => {
      const result = runMultiFactorScreen({
        universe: [weak],
        engineScores: scores,
        minAiScore: 90,
        minTechnicalMatches: 5,
        minFundamentalMatches: 5,
      });
      expect(result.emptyMessage).toBe(SCREEN_INTELLIGENCE_EMPTY.noAIMatches);
    });

    it("normalizeResultCard never emits sentinel strings", () => {
      const card = normalizeResultCard({
        ticker: "tcs",
        company: null as unknown as string,
        sector: "undefined",
        industry: "NaN",
        price: Number.NaN,
      });
      expect(card.ticker).toBe("TCS");
      expect(card.company).toBe("—");
      expect(card.sector).toBe("—");
      expect(card.industry).toBe("—");
      expect(Number.isNaN(card.price)).toBe(false);
    });
  });

  describe("Empty states & regression", () => {
    it("exposes institutional empty copy only", () => {
      expect(SCREEN_INTELLIGENCE_EMPTY.noTechnicalMatches).toBe(
        "No Technical Matches"
      );
      expect(SCREEN_INTELLIGENCE_EMPTY.noFundamentalMatches).toBe(
        "No Fundamental Matches"
      );
      expect(SCREEN_INTELLIGENCE_EMPTY.noAIMatches).toBe("No AI Matches");
      expect(SCREEN_INTELLIGENCE_EMPTY.awaitingScreening).toBe(
        "Awaiting Screening"
      );
      expect(emptyIntelligenceResult("technical").empty).toBe(true);
    });

    it("public API functions are wired", () => {
      expect(typeof runTechnicalScreen).toBe("function");
      expect(typeof runFundamentalScreen).toBe("function");
      expect(typeof runMultiFactorScreen).toBe("function");
      expect(typeof rankResults).toBe("function");
      expect(typeof buildExplainability).toBe("function");
    });

    it("result cards include full explainability payload", () => {
      const result = runTechnicalScreen({
        universe: [strong],
        engineScores: scores,
        filters: ["rsi", "macd"],
        minMatches: 1,
      });
      const explain = result.cards[0]?.explainability;
      expect(explain?.whyMatched).toBeTruthy();
      expect(explain?.aiReasoning).toBeTruthy();
      expect(explain?.confidenceBreakdown).toContain("Technical");
      expect(explain?.supportingEvidence.length).toBeGreaterThan(0);
    });

    it("Quality ranking prefers trust + validation blend", () => {
      const highQuality = cardFrom("QUAL", {
        factors: {
          ...cardFrom("QUAL").factors,
          fundamentalStrength: 80,
          trustScore: 90,
          validationScore: 88,
          finalAiScreenerScore: 50,
        },
      });
      const highOverall = cardFrom("OVER", {
        factors: {
          ...cardFrom("OVER").factors,
          fundamentalStrength: 40,
          trustScore: 30,
          validationScore: 30,
          finalAiScreenerScore: 95,
        },
      });
      const ranked = rankResults([highOverall, highQuality], "Quality");
      expect(ranked[0]?.ticker).toBe("QUAL");
    });

    it("R1 + R2 pipeline still returns safe result cards under stress", () => {
      const result = runMultiFactorScreen({
        universe: [
          {
            ticker: "INFY",
            company: undefined,
            sector: null,
            industry: "NaN",
            price: Number.NaN,
            metrics: {
              ...strong.metrics,
              rsi: 52,
              roe: 20,
            },
          },
        ],
        engineScores: [
          {
            ticker: "INFY",
            opportunityScore: 70,
            trustScore: 70,
            validationScore: 70,
            confidence: 70,
            aiScore: 70,
          },
        ],
        minAiScore: 30,
      });
      for (const card of result.cards) {
        expect(assertNoSentinelText(card.company)).toBe(true);
        expect(assertNoSentinelText(card.reasonSummary)).toBe(true);
        expect(Number.isFinite(card.aiScore)).toBe(true);
        expect(card.explainability.matchedRules.every((r) => assertNoSentinelText(r))).toBe(
          true
        );
      }
    });
  });
});
