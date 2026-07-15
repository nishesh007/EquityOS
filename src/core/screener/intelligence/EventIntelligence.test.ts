/**
 * Institutional AI Screener event intelligence — unit tests (Sprint 9D.R3).
 */

import { describe, expect, it } from "vitest";
import {
  SCREEN_EVENT_EMPTY,
  EARNINGS_SCREEN_IDS,
  NEWS_SCREEN_IDS,
  CORPORATE_ACTION_SCREEN_IDS,
  MANAGEMENT_SCREEN_IDS,
  EarningsScreenEngine,
  assertNoSentinelText,
  buildEventExplainability,
  composeEventScoreFactors,
  normalizeEventResultCard,
  rankEventResults,
  runCorporateActionScreen,
  runEarningsScreen,
  runEventScreen,
  runManagementScreen,
  runNewsScreen,
  scoreEventCandidate,
  type ScreenEventCandidate,
} from "../index";

const earningsEvent: ScreenEventCandidate = {
  ticker: "RELIANCE",
  company: "Reliance Industries",
  sector: "Energy",
  upcomingEvent: "Earnings Today",
  domain: "earnings",
  tags: ["earnings_today", "beat_estimate", "margin_expansion", "positive_guidance"],
  inPortfolio: true,
  opportunityScore: 78,
  trustScore: 72,
  validationScore: 70,
  confidence: 74,
  eventStrength: 80,
  earningsStrength: 82,
  evidence: ["calendar:today", "eps_beat"],
  reasonSummary: "High-confidence earnings day with beat bias",
};

const newsEvent: ScreenEventCandidate = {
  ticker: "TCS",
  company: "Tata Consultancy Services",
  sector: "Technology",
  upcomingEvent: "Analyst Upgrade",
  domain: "news",
  tags: ["analyst_upgrade", "positive_news", "target_increase"],
  opportunityScore: 70,
  trustScore: 80,
  validationScore: 75,
  confidence: 68,
  eventStrength: 72,
  newsStrength: 78,
  reasonSummary: "Analyst upgrade with target increase",
};

const actionEvent: ScreenEventCandidate = {
  ticker: "INFY",
  company: "Infosys",
  sector: "Technology",
  upcomingEvent: "Buyback",
  domain: "corporate_action",
  tags: ["buyback", "dividend"],
  opportunityScore: 65,
  trustScore: 77,
  validationScore: 73,
  confidence: 70,
  eventStrength: 76,
  corporateActionStrength: 80,
};

const managementEvent: ScreenEventCandidate = {
  ticker: "HDFCBANK",
  company: "HDFC Bank",
  sector: "Financials",
  upcomingEvent: "Positive Commentary",
  domain: "management",
  tags: ["positive_commentary", "expansion_plans", "capex", "guidance"],
  opportunityScore: 68,
  trustScore: 85,
  validationScore: 80,
  confidence: 72,
  eventStrength: 70,
  managementStrength: 75,
};

describe("Institutional AI Screener Event Intelligence (9D.R3)", () => {
  describe("Earnings screening", () => {
    it("registers all earnings screen ids", () => {
      expect(EARNINGS_SCREEN_IDS.length).toBe(15);
      expect(EARNINGS_SCREEN_IDS).toContain("upcoming_earnings");
      expect(EARNINGS_SCREEN_IDS).toContain("portfolio_earnings");
    });

    it("matches today's earnings / beat / guidance screens", () => {
      const result = runEarningsScreen({
        events: [earningsEvent],
        screens: ["earnings_today", "beat_estimate", "positive_guidance"],
        minMatches: 2,
      });
      expect(result.empty).toBe(false);
      expect(result.mode).toBe("earnings");
      expect(result.cards[0]?.ticker).toBe("RELIANCE");
      expect(result.cards[0]?.matchedEvents.length).toBeGreaterThanOrEqual(2);
      expect(result.cards[0]?.upcomingEvent).toBeTruthy();
    });

    it("returns No Earnings Matches when tags miss", () => {
      const result = runEarningsScreen({
        events: [{ ticker: "X", domain: "earnings", tags: ["unrelated"] }],
        screens: ["earnings_today"],
      });
      expect(result.emptyMessage).toBe(SCREEN_EVENT_EMPTY.noEarningsMatches);
    });

    it("returns Awaiting Event Scan for empty input", () => {
      expect(runEarningsScreen({ events: [] }).emptyMessage).toBe(
        SCREEN_EVENT_EMPTY.awaitingEventScan
      );
    });
  });

  describe("News screening", () => {
    it("registers all news screen ids", () => {
      expect(NEWS_SCREEN_IDS.length).toBe(12);
      expect(NEWS_SCREEN_IDS).toContain("breaking_news");
      expect(NEWS_SCREEN_IDS).toContain("sector_news");
    });

    it("matches analyst upgrade and positive news", () => {
      const result = runNewsScreen({
        events: [newsEvent],
        screens: ["analyst_upgrade", "positive_news", "target_increase"],
        minMatches: 2,
      });
      expect(result.empty).toBe(false);
      expect(result.cards[0]?.ticker).toBe("TCS");
      expect(result.cards[0]?.reasonSummary).toBeTruthy();
    });

    it("returns No News Matches when nothing qualifies", () => {
      const result = runNewsScreen({
        events: [{ ticker: "Y", domain: "news", tags: ["macro_noise"] }],
        screens: ["breaking_news"],
      });
      expect(result.emptyMessage).toBe(SCREEN_EVENT_EMPTY.noNewsMatches);
    });
  });

  describe("Corporate actions", () => {
    it("registers corporate action screen ids", () => {
      expect(CORPORATE_ACTION_SCREEN_IDS.length).toBe(14);
      expect(CORPORATE_ACTION_SCREEN_IDS).toContain("buyback");
      expect(CORPORATE_ACTION_SCREEN_IDS).toContain("promoter_buying");
    });

    it("matches buyback / dividend", () => {
      const result = runCorporateActionScreen({
        events: [actionEvent],
        screens: ["buyback", "dividend"],
        minMatches: 1,
      });
      expect(result.empty).toBe(false);
      expect(result.cards[0]?.ticker).toBe("INFY");
      expect(result.cards[0]?.matchedEvents).toContain("Buyback");
    });

    it("returns No Corporate Actions empty state", () => {
      const result = runCorporateActionScreen({
        events: [{ ticker: "Z", domain: "corporate_action", tags: [] }],
        screens: ["merger"],
      });
      expect(result.emptyMessage).toBe(SCREEN_EVENT_EMPTY.noCorporateActions);
    });
  });

  describe("Management commentary", () => {
    it("registers management screen ids", () => {
      expect(MANAGEMENT_SCREEN_IDS.length).toBe(8);
      expect(MANAGEMENT_SCREEN_IDS).toContain("capex");
    });

    it("matches positive commentary and expansion", () => {
      const result = runManagementScreen({
        events: [managementEvent],
        screens: ["positive_commentary", "expansion_plans", "capex"],
        minMatches: 2,
      });
      expect(result.empty).toBe(false);
      expect(result.cards[0]?.ticker).toBe("HDFCBANK");
    });
  });

  describe("Event correlation & AI event score", () => {
    it("composes final event score 0–100", () => {
      const factors = composeEventScoreFactors(earningsEvent);
      expect(factors.finalEventScore).toBeGreaterThanOrEqual(0);
      expect(factors.finalEventScore).toBeLessThanOrEqual(100);
      expect(factors.earningsStrength).toBe(82);
      expect(factors.opportunityScore).toBe(78);
      expect(Number.isFinite(scoreEventCandidate(newsEvent).finalEventScore)).toBe(
        true
      );
    });

    it("correlates earnings + news + actions into one screen", () => {
      const result = runEventScreen({
        earnings: [earningsEvent],
        news: [newsEvent],
        corporateActions: [actionEvent],
        management: [managementEvent],
        minEventScore: 30,
      });
      expect(result.empty).toBe(false);
      expect(result.mode).toBe("event");
      expect(result.cards.length).toBeGreaterThanOrEqual(3);
      expect(result.cards[0]?.rank).toBe(1);
      expect(Number.isFinite(result.cards[0]!.eventScore)).toBe(true);
    });

    it("returns No Event Matches when score bar not cleared", () => {
      const result = runEventScreen({
        events: [
          {
            ticker: "LOW",
            tags: ["noise"],
            opportunityScore: 5,
            trustScore: 5,
            validationScore: 5,
            confidence: 5,
            eventStrength: 5,
          },
        ],
        minEventScore: 90,
      });
      expect(result.emptyMessage).toBe(SCREEN_EVENT_EMPTY.noEventMatches);
    });

    it("merges multi-domain signals for the same ticker", () => {
      const result = runEventScreen({
        earnings: [
          {
            ticker: "ACC",
            domain: "earnings",
            tags: ["earnings_today"],
            earningsStrength: 70,
            opportunityScore: 60,
            trustScore: 60,
            validationScore: 60,
            confidence: 60,
            eventStrength: 70,
          },
        ],
        news: [
          {
            ticker: "ACC",
            domain: "news",
            tags: ["breaking_news"],
            newsStrength: 75,
            opportunityScore: 65,
            trustScore: 62,
            validationScore: 61,
            confidence: 63,
            eventStrength: 75,
          },
        ],
        minEventScore: 40,
      });
      const acc = result.cards.find((c) => c.ticker === "ACC");
      expect(acc).toBeTruthy();
      expect(acc!.matchedEvents.length).toBeGreaterThanOrEqual(2);
      expect(acc!.factors.newsStrength).toBeGreaterThan(0);
      expect(acc!.factors.earningsStrength).toBeGreaterThan(0);
    });
  });

  describe("Explainability & cards", () => {
    it("buildEventExplainability returns full payload", () => {
      const factors = scoreEventCandidate(earningsEvent);
      const explain = buildEventExplainability({
        ticker: "RELIANCE",
        matchedRules: ["Earnings Today", "Beat Estimate"],
        supportingEvent: "Earnings Today",
        factors,
        reasonSummary: "Strong earnings setup",
        evidence: ["eps_beat"],
      });
      expect(explain.empty).toBe(false);
      expect(explain.whyMatched).toContain("RELIANCE");
      expect(explain.supportingEvent).toBe("Earnings Today");
      expect(explain.matchedRules).toEqual(["Earnings Today", "Beat Estimate"]);
      expect(explain.confidence).toBe(74);
      expect(explain.positiveDrivers.length).toBeGreaterThan(0);
      expect(explain.negativeDrivers.length).toBeGreaterThan(0);
      expect(assertNoSentinelText(explain.aiReasoning)).toBe(true);
      expect(explain.evidence.length).toBeGreaterThan(0);
    });

    it("event result cards expose required fields", () => {
      const result = runEarningsScreen({
        events: [earningsEvent],
        screens: ["earnings_today"],
      });
      const card = result.cards[0]!;
      expect(card.company).toBeTruthy();
      expect(card.ticker).toBe("RELIANCE");
      expect(card.sector).toBeTruthy();
      expect(card.upcomingEvent).toBeTruthy();
      expect(Number.isFinite(card.eventScore)).toBe(true);
      expect(Number.isFinite(card.aiScore)).toBe(true);
      expect(Number.isFinite(card.trust)).toBe(true);
      expect(Number.isFinite(card.validation)).toBe(true);
      expect(Number.isFinite(card.confidence)).toBe(true);
      expect(card.reasonSummary).toBeTruthy();
      expect(card.matchedEvents.length).toBeGreaterThan(0);
      expect(card.rank).toBe(1);
    });

    it("normalizeEventResultCard never emits sentinels", () => {
      const card = normalizeEventResultCard({
        ticker: "tcs",
        company: null,
        sector: "undefined",
        upcomingEvent: "NaN",
        reasonSummary: undefined,
      });
      expect(card.ticker).toBe("TCS");
      expect(card.company).toBe("—");
      expect(card.sector).toBe("—");
      expect(card.upcomingEvent).toBe("—");
      expect(assertNoSentinelText(card.reasonSummary)).toBe(true);
    });

    it("rankEventResults orders by event score", () => {
      const low = normalizeEventResultCard({
        ticker: "LOW",
        eventScore: 20,
        factors: {
          opportunityScore: 20,
          trustScore: 20,
          validationScore: 20,
          confidence: 20,
          eventStrength: 20,
          newsStrength: 0,
          earningsStrength: 20,
          corporateActionStrength: 0,
          finalEventScore: 20,
        },
      });
      const high = normalizeEventResultCard({
        ticker: "HIGH",
        eventScore: 90,
        factors: {
          opportunityScore: 90,
          trustScore: 90,
          validationScore: 90,
          confidence: 90,
          eventStrength: 90,
          newsStrength: 0,
          earningsStrength: 90,
          corporateActionStrength: 0,
          finalEventScore: 90,
        },
      });
      const ranked = rankEventResults([low, high], "Overall");
      expect(ranked[0]?.ticker).toBe("HIGH");
      expect(ranked[0]?.rank).toBe(1);
    });
  });

  describe("Empty states & regression", () => {
    it("exposes institutional event empty copy", () => {
      expect(SCREEN_EVENT_EMPTY.noEarningsMatches).toBe("No Earnings Matches");
      expect(SCREEN_EVENT_EMPTY.noNewsMatches).toBe("No News Matches");
      expect(SCREEN_EVENT_EMPTY.noCorporateActions).toBe("No Corporate Actions");
      expect(SCREEN_EVENT_EMPTY.noEventMatches).toBe("No Event Matches");
      expect(SCREEN_EVENT_EMPTY.awaitingEventScan).toBe("Awaiting Event Scan");
    });

    it("public API functions are wired", () => {
      expect(typeof runEarningsScreen).toBe("function");
      expect(typeof runNewsScreen).toBe("function");
      expect(typeof runCorporateActionScreen).toBe("function");
      expect(typeof runManagementScreen).toBe("function");
      expect(typeof runEventScreen).toBe("function");
      expect(typeof buildEventExplainability).toBe("function");
    });

    it("event cards never surface null/undefined/NaN strings under stress", () => {
      const result = runEventScreen({
        events: [
          {
            ticker: "INFY",
            company: undefined,
            sector: null,
            upcomingEvent: "NaN",
            tags: ["positive_news"],
            domain: "news",
            opportunityScore: 70,
            trustScore: 70,
            validationScore: 70,
            confidence: 70,
            eventStrength: 70,
            newsStrength: 70,
          },
        ],
        minEventScore: 30,
      });
      for (const card of result.cards) {
        expect(assertNoSentinelText(card.company)).toBe(true);
        expect(assertNoSentinelText(card.upcomingEvent)).toBe(true);
        expect(assertNoSentinelText(card.reasonSummary)).toBe(true);
        expect(Number.isNaN(card.eventScore)).toBe(false);
      }
    });

    it("portfolio earnings screen uses inPortfolio membership", () => {
      const result = runEarningsScreen({
        events: [
          {
            ticker: "OWN",
            domain: "earnings",
            tags: [],
            inPortfolio: true,
            opportunityScore: 60,
            trustScore: 60,
            validationScore: 60,
            confidence: 60,
            eventStrength: 60,
            earningsStrength: 60,
          },
        ],
        screens: ["portfolio_earnings"],
      });
      expect(result.cards[0]?.matchedEvents).toContain("Portfolio Earnings");
    });

    it("EarningsScreenEngine class mirrors runEarningsScreen", () => {
      const engine = new EarningsScreenEngine();
      const result = engine.run({
        events: [earningsEvent],
        screens: ["earnings_today"],
      });
      expect(result.mode).toBe("earnings");
      expect(result.totalMatches).toBeGreaterThan(0);
    });
  });
});
