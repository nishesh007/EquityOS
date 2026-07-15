/**
 * Institutional portfolio / watchlist / opportunity screening — tests (Sprint 9D.R4).
 */

import { describe, expect, it } from "vitest";
import {
  INSTITUTIONAL_SCREEN_EMPTY,
  PORTFOLIO_SCREEN_IDS,
  WATCHLIST_SCREEN_IDS,
  OpportunityScreenEngine,
  assertNoSentinelText,
  buildInstitutionalInsights,
  classifyInstitutionalRecommendation,
  composeInstitutionalScoreFactors,
  generateResearchPriority,
  normalizeInstitutionalCard,
  rankInstitutionalResults,
  recommendationFromScore,
  runOpportunityScreen,
  runPortfolioScreen,
  runWatchlistScreen,
  scoreInstitutionalCandidate,
  type InstitutionalCandidate,
} from "../index";

const holding: InstitutionalCandidate = {
  ticker: "RELIANCE",
  company: "Reliance Industries",
  sector: "Energy",
  weightPercent: 3.2,
  domain: "portfolio",
  inPortfolio: true,
  tags: ["high_conviction_holdings", "quality_improvement"],
  aiConviction: 88,
  trustScore: 96,
  validationScore: 92,
  confidence: 90,
  momentum: 78,
  fundamentalStrength: 85,
  technical: 80,
  growth: 82,
  quality: 88,
  income: 55,
  value: 60,
  risk: 70,
  filtersPassed: 48,
  filtersTotal: 52,
  evidence: ["Trust Score 96", "Validation Passed"],
  reasonSummary: "High conviction portfolio holding",
};

const watchItem: InstitutionalCandidate = {
  ticker: "TCS",
  company: "Tata Consultancy Services",
  sector: "Technology",
  domain: "watchlist",
  inWatchlist: true,
  tags: ["entry_zone_reached", "breakout_candidate", "volume_confirmation"],
  aiConviction: 82,
  trustScore: 88,
  validationScore: 84,
  confidence: 80,
  momentum: 76,
  liquidity: 80,
  sectorStrength: 72,
  opportunityScore: 81,
};

const opportunity: InstitutionalCandidate = {
  ticker: "INFY",
  company: "Infosys",
  sector: "Technology",
  domain: "opportunity",
  tags: ["swing", "momentum"],
  aiConviction: 79,
  opportunityScore: 79,
  trustScore: 86,
  validationScore: 83,
  confidence: 78,
  riskReward: 2.4,
  momentum: 74,
  fundamentalStrength: 80,
  liquidity: 70,
  sectorStrength: 68,
  marketTrend: 65,
  technical: 72,
  growth: 75,
  quality: 80,
  risk: 68,
};

describe("Institutional Portfolio / Watchlist Screening (9D.R4)", () => {
  describe("Portfolio screening", () => {
    it("registers portfolio screen ids", () => {
      expect(PORTFOLIO_SCREEN_IDS.length).toBe(11);
      expect(PORTFOLIO_SCREEN_IDS).toContain("high_conviction_holdings");
      expect(PORTFOLIO_SCREEN_IDS).toContain("trust_deterioration");
    });

    it("detects high conviction holdings", () => {
      const result = runPortfolioScreen({
        holdings: [holding],
        screens: ["high_conviction_holdings", "quality_improvement"],
        minMatches: 1,
      });
      expect(result.empty).toBe(false);
      expect(result.mode).toBe("portfolio");
      expect(result.cards[0]?.ticker).toBe("RELIANCE");
      expect(result.cards[0]?.matchedSignals).toContain(
        "High Conviction Holdings"
      );
      expect(result.cards[0]?.recommendation).toBeTruthy();
      expect(result.cards[0]?.priority).toBeTruthy();
    });

    it("detects trust deterioration via score heuristic", () => {
      const result = runPortfolioScreen({
        holdings: [
          {
            ticker: "WEAK",
            trustScore: 30,
            validationScore: 70,
            aiConviction: 50,
            confidence: 50,
          },
        ],
        screens: ["trust_deterioration"],
      });
      expect(result.cards[0]?.matchedSignals).toContain("Trust Deterioration");
    });

    it("returns No Portfolio Holdings when empty", () => {
      expect(runPortfolioScreen({ holdings: [] }).emptyMessage).toBe(
        INSTITUTIONAL_SCREEN_EMPTY.noPortfolioHoldings
      );
    });
  });

  describe("Watchlist screening", () => {
    it("registers watchlist screen ids", () => {
      expect(WATCHLIST_SCREEN_IDS.length).toBe(10);
      expect(WATCHLIST_SCREEN_IDS).toContain("entry_zone_reached");
      expect(WATCHLIST_SCREEN_IDS).toContain("upcoming_catalyst");
    });

    it("finds breakout / entry / volume signals", () => {
      const result = runWatchlistScreen({
        items: [watchItem],
        screens: [
          "entry_zone_reached",
          "breakout_candidate",
          "volume_confirmation",
        ],
        minMatches: 2,
      });
      expect(result.empty).toBe(false);
      expect(result.cards[0]?.ticker).toBe("TCS");
      expect(result.cards[0]?.matchedSignals.length).toBeGreaterThanOrEqual(2);
    });

    it("returns No Watchlist when empty", () => {
      expect(runWatchlistScreen({ items: [] }).emptyMessage).toBe(
        INSTITUTIONAL_SCREEN_EMPTY.noWatchlist
      );
    });
  });

  describe("Opportunity screening", () => {
    it("ranks opportunity engine outputs with validation/trust", () => {
      const result = runOpportunityScreen({
        opportunities: [opportunity],
        minInstitutionalScore: 50,
        minConviction: 50,
      });
      expect(result.empty).toBe(false);
      expect(result.cards[0]?.ticker).toBe("INFY");
      expect(result.cards[0]?.matchedSignals).toContain("Opportunity Engine");
      expect(result.cards[0]?.matchedSignals).toContain("Trust");
      expect(result.cards[0]?.matchedSignals).toContain("Risk Reward");
    });

    it("returns No Institutional Opportunities when none clear bar", () => {
      const result = runOpportunityScreen({
        opportunities: [{ ticker: "LOW", aiConviction: 10 }],
        minConviction: 90,
      });
      expect(result.emptyMessage).toBe(
        INSTITUTIONAL_SCREEN_EMPTY.noInstitutionalOpportunities
      );
    });
  });

  describe("Institutional ranking", () => {
    it("composes overall institutional score 0–100", () => {
      const factors = composeInstitutionalScoreFactors(holding);
      expect(factors.overallInstitutionalScore).toBeGreaterThanOrEqual(0);
      expect(factors.overallInstitutionalScore).toBeLessThanOrEqual(100);
      expect(factors.trust).toBe(96);
      expect(factors.validation).toBe(92);
      expect(Number.isFinite(scoreInstitutionalCandidate(watchItem).overallInstitutionalScore)).toBe(
        true
      );
    });

    it("maps scores to institutional recommendations", () => {
      expect(recommendationFromScore(96)).toBe("Institutional Buy");
      expect(recommendationFromScore(92)).toBe("Strong Buy");
      expect(recommendationFromScore(85)).toBe("Accumulation");
      expect(recommendationFromScore(78)).toBe("Watch");
      expect(recommendationFromScore(60)).toBe("Avoid");
      expect(classifyInstitutionalRecommendation(95)).toBe("Institutional Buy");
    });

    it("rankInstitutionalResults orders by score", () => {
      const low = normalizeInstitutionalCard({
        ticker: "LOW",
        institutionalScore: 40,
        confidence: 40,
      });
      const high = normalizeInstitutionalCard({
        ticker: "HIGH",
        institutionalScore: 90,
        confidence: 88,
      });
      const ranked = rankInstitutionalResults([low, high]);
      expect(ranked[0]?.ticker).toBe("HIGH");
      expect(ranked[0]?.rank).toBe(1);
    });
  });

  describe("Priority generation", () => {
    it("classifies Research Immediately for elite scores", () => {
      expect(
        generateResearchPriority({
          ...emptyLowFactors(),
          overallInstitutionalScore: 94,
          trust: 96,
          validation: 92,
        })
      ).toBe("Research Immediately");
    });

    it("classifies High Priority / Monitor / Ignore bands", () => {
      expect(
        generateResearchPriority({
          ...emptyLowFactors(),
          overallInstitutionalScore: 80,
          trust: 70,
          validation: 70,
        })
      ).toBe("High Priority");
      expect(
        generateResearchPriority({
          ...emptyLowFactors(),
          overallInstitutionalScore: 50,
          trust: 30,
          validation: 70,
        })
      ).toBe("Monitor");
      expect(
        generateResearchPriority(
          {
            ...emptyLowFactors(),
            overallInstitutionalScore: 20,
          },
          { matchedSignals: 0 }
        )
      ).toBe("Ignore");
    });
  });

  describe("Insight generation", () => {
    it("buildInstitutionalInsights creates explainable card copy", () => {
      const elite: InstitutionalCandidate = {
        ...holding,
        trustScore: 96,
        validationScore: 95,
        technical: 95,
        fundamentalStrength: 95,
        growth: 95,
        momentum: 95,
        quality: 95,
        income: 90,
        value: 90,
        risk: 90,
        confidence: 95,
        aiConviction: 95,
        filtersPassed: 48,
        filtersTotal: 52,
      };
      const factors = scoreInstitutionalCandidate(elite);
      const insight = buildInstitutionalInsights({
        candidate: elite,
        factors,
        matchedSignals: ["High Conviction Holdings", "Quality Improvement"],
      });
      expect(insight.empty).toBe(false);
      expect(insight.headline).toContain("48/52");
      expect(insight.drivers.some((d) => d.includes("Trust"))).toBe(true);
      expect(insight.drivers).toContain("Validation Passed");
      expect(["Increase Allocation", "Accumulate on Dips"]).toContain(
        insight.suggestedAction
      );
      expect(insight.badges.length).toBeGreaterThan(0);
      expect(insight.evidence.length).toBeGreaterThan(0);
    });
  });

  describe("Presentation models & empty states", () => {
    it("normalizeInstitutionalCard never emits sentinels", () => {
      const card = normalizeInstitutionalCard({
        ticker: "tcs",
        company: null,
        sector: "undefined",
        reasonSummary: "NaN",
      });
      expect(card.ticker).toBe("TCS");
      expect(card.company).toBe("—");
      expect(card.sector).toBe("—");
      expect(assertNoSentinelText(card.reasonSummary)).toBe(true);
      expect(card.grade).toBeTruthy();
      expect(card.recommendation).toBeTruthy();
      expect(card.priority).toBeTruthy();
    });

    it("exposes institutional empty copy", () => {
      expect(INSTITUTIONAL_SCREEN_EMPTY.noPortfolioHoldings).toBe(
        "No Portfolio Holdings"
      );
      expect(INSTITUTIONAL_SCREEN_EMPTY.noWatchlist).toBe("No Watchlist");
      expect(INSTITUTIONAL_SCREEN_EMPTY.noInstitutionalOpportunities).toBe(
        "No Institutional Opportunities"
      );
      expect(INSTITUTIONAL_SCREEN_EMPTY.noHighPriorityResearch).toBe(
        "No High Priority Research"
      );
      expect(INSTITUTIONAL_SCREEN_EMPTY.awaitingScan).toBe("Awaiting Scan");
    });

    it("public API functions are wired", () => {
      expect(typeof runPortfolioScreen).toBe("function");
      expect(typeof runWatchlistScreen).toBe("function");
      expect(typeof runOpportunityScreen).toBe("function");
      expect(typeof rankInstitutionalResults).toBe("function");
      expect(typeof generateResearchPriority).toBe("function");
      expect(typeof buildInstitutionalInsights).toBe("function");
    });

    it("result cards include grades badges evidence drivers recommendation priority", () => {
      const result = runPortfolioScreen({ holdings: [holding] });
      const card = result.cards[0]!;
      expect(card.grade).toBeTruthy();
      expect(card.badges.length).toBeGreaterThan(0);
      expect(card.evidence.length).toBeGreaterThan(0);
      expect(card.drivers.length).toBeGreaterThan(0);
      expect(card.recommendation).toBeTruthy();
      expect(card.priority).toBeTruthy();
      expect(Number.isFinite(card.confidence)).toBe(true);
      expect(Number.isFinite(card.institutionalScore)).toBe(true);
    });

    it("regression — never surfaces null/undefined/NaN under stress", () => {
      const result = runWatchlistScreen({
        items: [
          {
            ticker: "INFY",
            company: undefined,
            sector: null,
            tags: ["momentum_pickup"],
            momentum: 80,
            aiConviction: 70,
            trustScore: 70,
            validationScore: 70,
            confidence: 70,
          },
        ],
      });
      for (const card of result.cards) {
        expect(assertNoSentinelText(card.company)).toBe(true);
        expect(assertNoSentinelText(card.reasonSummary)).toBe(true);
        expect(Number.isNaN(card.institutionalScore)).toBe(false);
      }
    });

    it("OpportunityScreenEngine class mirrors function API", () => {
      const engine = new OpportunityScreenEngine();
      const result = engine.run({
        opportunities: [opportunity],
        minInstitutionalScore: 40,
      });
      expect(result.mode).toBe("opportunity");
      expect(result.totalMatches).toBeGreaterThan(0);
    });

    it("insight awaiting state when no signals and zero score", () => {
      const insight = buildInstitutionalInsights({
        candidate: { ticker: "EMPTY" },
        factors: { ...emptyLowFactors(), overallInstitutionalScore: 0 },
        matchedSignals: [],
      });
      expect(insight.empty).toBe(true);
      expect(insight.emptyMessage).toBe(INSTITUTIONAL_SCREEN_EMPTY.awaitingScan);
    });

    it("No High Priority Research empty helper copy exists", () => {
      expect(INSTITUTIONAL_SCREEN_EMPTY.noHighPriorityResearch).toBe(
        "No High Priority Research"
      );
    });

    it("validation failure heuristic fires on low validation", () => {
      const result = runPortfolioScreen({
        holdings: [
          {
            ticker: "FAIL",
            validationScore: 25,
            trustScore: 70,
            aiConviction: 50,
            confidence: 50,
          },
        ],
        screens: ["validation_failure"],
      });
      expect(result.cards[0]?.matchedSignals).toContain("Validation Failure");
    });

    it("best watchlist opportunity heuristic uses conviction threshold", () => {
      const result = runWatchlistScreen({
        items: [
          {
            ticker: "BEST",
            aiConviction: 90,
            trustScore: 80,
            validationScore: 80,
            confidence: 80,
            tags: [],
          },
        ],
        screens: ["best_watchlist_opportunity"],
      });
      expect(result.cards[0]?.matchedSignals).toContain(
        "Best Watchlist Opportunity"
      );
    });
  });
});

function emptyLowFactors() {
  return {
    technical: 20,
    fundamental: 20,
    growth: 20,
    momentum: 20,
    quality: 20,
    income: 20,
    value: 20,
    risk: 20,
    validation: 20,
    trust: 20,
    aiConfidence: 20,
    overallInstitutionalScore: 20,
  };
}
