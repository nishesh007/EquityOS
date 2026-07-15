/**
 * Alert intelligence R3 — Earnings / News / Corporate Action / Transcript / Correlation.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerAlertEngine, resetAlertEngine } from "../AlertFacade";
import {
  CORPORATE_ACTION_ALERT_KINDS,
  EARNINGS_EVENT_ALERT_KINDS,
  EVENT_ALERT_EMPTY,
  NEWS_ALERT_KINDS,
  classifyNewsKinds,
  correlateAlerts,
  generateCorporateActionAlerts,
  generateEarningsAlerts,
  generateManagementCommentaryAlerts,
  generateNewsAlerts,
  generateTranscriptAlerts,
  rankNewsAlerts,
  resetAlertIntelligence,
  type CorporateActionAlertSnapshot,
  type EarningsEventSnapshot,
  type NewsAlertSnapshot,
} from "./index";

const NOW = new Date("2026-07-15T06:30:00.000Z");

function earnings(
  overrides: Partial<EarningsEventSnapshot> = {}
): EarningsEventSnapshot {
  return {
    ticker: "RELIANCE",
    company: "Reliance Industries",
    resultDate: "2026-07-15",
    isToday: true,
    inPortfolio: true,
    confidenceScore: 75,
    ...overrides,
  };
}

function news(overrides: Partial<NewsAlertSnapshot> = {}): NewsAlertSnapshot {
  return {
    id: "n1",
    symbol: "TCS",
    company: "Tata Consultancy",
    title: "Breaking: TCS wins major contract",
    summary: "Large order win announced",
    source: "Wire",
    publishedAt: "2026-07-15T05:00:00.000Z",
    sentiment: "positive",
    tags: ["breaking"],
    inWatchlist: true,
    urgency: 88,
    businessImpact: 80,
    ...overrides,
  };
}

function action(
  overrides: Partial<CorporateActionAlertSnapshot> = {}
): CorporateActionAlertSnapshot {
  return {
    id: "ca1",
    symbol: "INFY",
    company: "Infosys",
    type: "Dividend",
    date: "2026-07-20",
    title: "Final dividend declared",
    description: "Board approved final dividend",
    value: "2.5%",
    inPortfolio: true,
    ...overrides,
  };
}

describe("Alert Intelligence R3 (Earnings / News / CA)", () => {
  beforeEach(() => {
    resetAlertEngine();
    resetAlertIntelligence();
    registerAlertEngine();
  });

  afterEach(() => {
    resetAlertIntelligence();
    resetAlertEngine();
  });

  describe("Earnings alerts", () => {
    it("generates today / results / beat / guidance / transcript kinds", () => {
      const batch = generateEarningsAlerts({
        events: [
          earnings({
            isReleased: true,
            epsOutcome: "Beat",
            revenueOutcome: "Strong Beat",
            guidanceChange: "Upgrade",
            marginSignal: "expansion",
            hasTranscript: true,
            hasManagementCommentary: true,
            conferenceCallStatus: "summary_ready",
          }),
        ],
        now: NOW,
      });
      expect(batch.empty).toBe(false);
      const kinds = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(kinds.has("earnings_today")).toBe(true);
      expect(kinds.has("results_published")).toBe(true);
      expect(kinds.has("eps_beat")).toBe(true);
      expect(kinds.has("revenue_beat")).toBe(true);
      expect(kinds.has("guidance_raised")).toBe(true);
      expect(kinds.has("margin_expansion")).toBe(true);
      expect(kinds.has("transcript_available")).toBe(true);
      expect(kinds.has("management_commentary_published")).toBe(true);
      expect(kinds.has("conference_call_summary_ready")).toBe(true);
      expect(batch.insights[0]!.headline).toBeTruthy();
      expect(batch.insights[0]!.relatedCompany).toBeTruthy();
      expect(EARNINGS_EVENT_ALERT_KINDS.length).toBe(17);
    });

    it("returns No Earnings Alerts empty state", () => {
      const batch = generateEarningsAlerts({ events: [], now: NOW });
      expect(batch.empty).toBe(true);
      expect(batch.emptyMessage).toBe(EVENT_ALERT_EMPTY.noEarnings);
    });

    it("handles miss / guidance lowered / margin compression", () => {
      const batch = generateEarningsAlerts({
        events: [
          earnings({
            isToday: false,
            isTomorrow: true,
            isReleased: true,
            epsOutcome: "Major Miss",
            revenueOutcome: "Miss",
            guidanceChange: "Downgrade",
            marginSignal: "compression",
            conferenceCallStatus: "live",
          }),
        ],
        now: NOW,
      });
      const kinds = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(kinds.has("earnings_tomorrow")).toBe(true);
      expect(kinds.has("eps_miss")).toBe(true);
      expect(kinds.has("revenue_miss")).toBe(true);
      expect(kinds.has("guidance_lowered")).toBe(true);
      expect(kinds.has("margin_compression")).toBe(true);
      expect(kinds.has("conference_call_live")).toBe(true);
    });
  });

  describe("Transcript & management commentary", () => {
    it("generates transcript alerts", () => {
      const batch = generateTranscriptAlerts({
        transcripts: [
          {
            ticker: "HDFCBANK",
            company: "HDFC Bank",
            resultDate: "2026-07-10",
            available: true,
            hasConferenceCall: true,
            summaryReady: true,
            managementSentiment: "Positive",
            catalysts: ["Loan growth"],
            inPortfolio: true,
          },
        ],
        now: NOW,
      });
      expect(batch.empty).toBe(false);
      const kinds = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(kinds.has("transcript_available")).toBe(true);
      expect(kinds.has("conference_call_scheduled")).toBe(true);
      expect(kinds.has("conference_call_summary_ready")).toBe(true);
    });

    it("returns Transcript Pending when unavailable", () => {
      const batch = generateTranscriptAlerts({
        transcripts: [
          {
            ticker: "WIPRO",
            company: "Wipro",
            resultDate: "2026-07-01",
            available: false,
          },
        ],
        now: NOW,
      });
      expect(batch.empty).toBe(true);
      expect(batch.emptyMessage).toBe(EVENT_ALERT_EMPTY.transcriptPending);
    });

    it("generates management commentary alerts", () => {
      const batch = generateManagementCommentaryAlerts({
        commentaries: [
          {
            ticker: "RELIANCE",
            company: "Reliance",
            resultDate: "2026-07-15",
            published: true,
            tone: "Constructive outlook",
            highlights: ["Capex guidance maintained"],
            guidanceChange: "No Change",
            inPortfolio: true,
          },
        ],
        now: NOW,
      });
      expect(batch.empty).toBe(false);
      expect(batch.alerts[0]!.metadata.eventType).toBe(
        "management_commentary_published"
      );
      expect(batch.insights[0]!.headline).not.toMatch(/null|undefined|NaN/i);
    });
  });

  describe("News alerts", () => {
    it("classifies and generates news alert kinds", () => {
      expect(NEWS_ALERT_KINDS.length).toBe(12);
      const kinds = classifyNewsKinds(
        news({ title: "Analyst upgrade and target price raised" })
      );
      expect(kinds).toContain("breaking_news");
      expect(kinds).toContain("positive_news");

      const batch = generateNewsAlerts({
        news: [
          news(),
          news({
            id: "n2",
            title: "RBI policy decision weighs on banks",
            summary: "Macro policy news",
            tags: ["macro", "policy"],
            symbol: null,
            company: "Market",
            sentiment: "neutral",
          }),
          news({
            id: "n3",
            title: "CEO resigns amid probe",
            summary: "Management change",
            sentiment: "negative",
            tags: ["negative"],
          }),
        ],
        now: NOW,
      });
      expect(batch.empty).toBe(false);
      const eventTypes = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(eventTypes.has("breaking_news")).toBe(true);
      expect(eventTypes.has("macro_news") || eventTypes.has("policy_news")).toBe(
        true
      );
      expect(eventTypes.has("management_change") || eventTypes.has("negative_news")).toBe(
        true
      );
    });

    it("returns No News Alerts empty state", () => {
      const batch = generateNewsAlerts({ news: [], now: NOW });
      expect(batch.emptyMessage).toBe(EVENT_ALERT_EMPTY.noNews);
    });

    it("ranks news alerts by urgency and impact", () => {
      const batch = generateNewsAlerts({
        news: [
          news({ id: "low", title: "Sector update", tags: ["sector"], urgency: 20, businessImpact: 20 }),
          news({ id: "high", title: "Breaking flash", tags: ["breaking"], urgency: 95, businessImpact: 90, inPortfolio: true }),
        ],
        now: NOW,
      });
      const ranked = rankNewsAlerts(batch.alerts);
      expect(ranked[0]!.rank).toBe(1);
      expect(ranked[0]!.score).toBeGreaterThanOrEqual(ranked[ranked.length - 1]!.score);
      expect(ranked[0]!.factors.urgency).toBeGreaterThan(0);
    });
  });

  describe("Corporate action alerts", () => {
    it("generates dividend / merger / buyback alerts", () => {
      expect(CORPORATE_ACTION_ALERT_KINDS.length).toBe(12);
      const batch = generateCorporateActionAlerts({
        actions: [
          action(),
          action({
            id: "ca2",
            type: "Buyback",
            title: "Buyback announced",
            description: "Board approved buyback",
          }),
          action({
            id: "ca3",
            type: "Merger",
            symbol: "TATASTEEL",
            company: "Tata Steel",
            title: "Merger approved",
            description: "Scheme of merger",
          }),
        ],
        now: NOW,
      });
      const kinds = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(kinds.has("dividend")).toBe(true);
      expect(kinds.has("buyback")).toBe(true);
      expect(kinds.has("merger")).toBe(true);
      expect(batch.insights.every((i) => i.headline.length > 0)).toBe(true);
    });

    it("returns No Corporate Actions empty state", () => {
      const batch = generateCorporateActionAlerts({ actions: [], now: NOW });
      expect(batch.emptyMessage).toBe(EVENT_ALERT_EMPTY.noCorporateActions);
    });
  });

  describe("Correlation engine", () => {
    it("correlates earnings + news + corporate actions for same company", () => {
      const earningsBatch = generateEarningsAlerts({
        events: [earnings({ ticker: "RELIANCE", isReleased: true, epsOutcome: "Beat" })],
        now: NOW,
      });
      const newsBatch = generateNewsAlerts({
        news: [
          news({
            id: "nr",
            symbol: "RELIANCE",
            company: "Reliance Industries",
            title: "Positive news after earnings beat",
            tags: ["positive"],
          }),
        ],
        now: NOW,
      });
      const caBatch = generateCorporateActionAlerts({
        actions: [
          action({
            id: "car",
            symbol: "RELIANCE",
            company: "Reliance Industries",
            type: "Dividend",
          }),
        ],
        now: NOW,
      });

      const correlated = correlateAlerts([
        ...earningsBatch.alerts,
        ...newsBatch.alerts,
        ...caBatch.alerts,
      ]);
      expect(correlated.clusters.length).toBeGreaterThan(0);
      expect(correlated.alerts.length).toBeGreaterThan(0);
      expect(correlated.alerts.every((a) => a.title)).toBe(true);
    });

    it("removes duplicate stories via correlation dedupe", () => {
      const batch = generateNewsAlerts({
        news: [news({ id: "dup" })],
        now: NOW,
      });
      const correlated = correlateAlerts([...batch.alerts, ...batch.alerts]);
      expect(correlated.duplicatesRemoved).toBeGreaterThan(0);
    });
  });

  describe("Presentation & regression", () => {
    it("never exposes nullish insight fields", () => {
      const batch = generateEarningsAlerts({
        events: [earnings({ company: "", epsOutcome: "Beat", isReleased: true })],
        now: NOW,
      });
      for (const card of batch.insights) {
        expect(card.headline).toBeTruthy();
        expect(card.summary).toBeTruthy();
        expect(card.reason).toBeTruthy();
        expect(card.relatedCompany).toBeTruthy();
        expect(card.confidence).not.toMatch(/^(null|undefined|NaN)$/);
      }
    });

    it("exposes public APIs", () => {
      expect(typeof generateEarningsAlerts).toBe("function");
      expect(typeof generateNewsAlerts).toBe("function");
      expect(typeof generateCorporateActionAlerts).toBe("function");
      expect(typeof generateTranscriptAlerts).toBe("function");
      expect(typeof correlateAlerts).toBe("function");
    });
  });
});
