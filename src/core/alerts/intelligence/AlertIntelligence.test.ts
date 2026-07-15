/**
 * Alert intelligence — Opportunity / Portfolio / Watchlist (Sprint 9C.R2).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resetAlertEngine,
  registerAlertEngine,
  getAlertMetrics,
} from "../AlertFacade";
import {
  INTELLIGENCE_ALERT_EMPTY,
  OPPORTUNITY_ALERT_KINDS,
  PORTFOLIO_ALERT_KINDS,
  WATCHLIST_ALERT_KINDS,
  decideOpportunityAlerts,
  decidePortfolioAlerts,
  decideWatchlistAlerts,
  deduplicateAlerts,
  generateOpportunityAlerts,
  generatePortfolioAlerts,
  generateWatchlistAlerts,
  groupAlerts,
  rankAlerts,
  resetAlertIntelligence,
  seedOpportunityAlertPrior,
  seedPortfolioAlertPrior,
  seedWatchlistAlertPrior,
  type OpportunitySnapshot,
  type PortfolioSnapshot,
  type WatchlistItemSnapshot,
} from "./index";

const NOW = new Date("2026-07-15T06:30:00.000Z");

function opp(
  overrides: Partial<OpportunitySnapshot> = {}
): OpportunitySnapshot {
  return {
    id: "opp-reliance",
    symbol: "RELIANCE",
    company: "Reliance Industries",
    category: "breakout",
    side: "Long",
    aiConvictionScore: 82,
    confidencePercent: 78,
    entryZone: { low: 2900, high: 2950 },
    stopLoss: 2800,
    target1: 3100,
    target2: 3200,
    riskReward: 2.1,
    reason: "Breakout with strong volume",
    momentum: 75,
    relativeStrength: 80,
    volumeRatio: 2.2,
    trendScore: 12,
    institutionalGrade: 80,
    currentPrice: 2925,
    tradeStatus: null,
    ...overrides,
  };
}

function portfolio(
  overrides: Partial<PortfolioSnapshot> = {}
): PortfolioSnapshot {
  return {
    overallRisk: 55,
    diversificationScore: 62,
    healthScore: 70,
    trustScore: 72,
    validationStatus: "APPROVED",
    aiRecommendationHash: "rec-v1",
    holdings: [
      {
        symbol: "RELIANCE",
        name: "Reliance Industries",
        weightPercent: 18,
        quantity: 10,
        currentPrice: 2925,
        changePercent: 1.2,
        convictionScore: 82,
        qualityScore: 75,
      },
      {
        symbol: "WIPRO",
        name: "Wipro",
        weightPercent: 8,
        quantity: 20,
        currentPrice: 450,
        changePercent: -9,
        convictionScore: 38,
        qualityScore: 32,
      },
    ],
    ...overrides,
  };
}

function watchItem(
  overrides: Partial<WatchlistItemSnapshot> = {}
): WatchlistItemSnapshot {
  return {
    symbol: "TCS",
    name: "Tata Consultancy",
    price: 3900,
    changePercent: 0.8,
    volumeRatio: 2.0,
    convictionScore: 76,
    category: "breakout",
    entryLow: 3850,
    entryHigh: 3920,
    target1: 4100,
    ...overrides,
  };
}

describe("Alert Intelligence (9C.R2)", () => {
  beforeEach(() => {
    resetAlertEngine();
    resetAlertIntelligence();
    registerAlertEngine();
  });

  afterEach(() => {
    resetAlertIntelligence();
    resetAlertEngine();
  });

  describe("Opportunity alerts", () => {
    it("generates new buy and high conviction opportunity alerts", () => {
      const batch = generateOpportunityAlerts({
        opportunities: [opp()],
        portfolioSymbols: ["RELIANCE"],
        now: NOW,
      });
      expect(batch.empty).toBe(false);
      expect(batch.total).toBeGreaterThan(0);
      expect(batch.cards.every((c) => c.title.length > 0)).toBe(true);
      expect(batch.cards.every((c) => !["null", "undefined", "NaN"].includes(c.summary))).toBe(true);

      const kinds = new Set(
        batch.alerts.map((a) => a.metadata.eventType)
      );
      expect(kinds.has("new_buy_opportunity")).toBe(true);
      expect(kinds.has("high_conviction_opportunity")).toBe(true);
      expect(kinds.has("momentum_breakout")).toBe(true);
      expect(kinds.has("strong_relative_strength")).toBe(true);
    });

    it("detects conviction and grade deltas against prior state", () => {
      seedOpportunityAlertPrior([
        opp({ aiConvictionScore: 60, institutionalGrade: 60, riskReward: 2.5 }),
      ]);
      const batch = generateOpportunityAlerts({
        opportunities: [
          opp({
            aiConvictionScore: 80,
            institutionalGrade: 78,
            riskReward: 1.5,
            tradeStatus: "target1_hit",
          }),
        ],
        now: NOW,
      });
      const kinds = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(kinds.has("conviction_increased")).toBe(true);
      expect(kinds.has("institutional_grade_improved")).toBe(true);
      expect(kinds.has("risk_increased")).toBe(true);
      expect(kinds.has("target_achieved")).toBe(true);
      expect(kinds.has("new_buy_opportunity")).toBe(false);
    });

    it("returns No Opportunities empty state", () => {
      const batch = generateOpportunityAlerts({ opportunities: [], now: NOW });
      expect(batch.empty).toBe(true);
      expect(batch.emptyMessage).toBe(INTELLIGENCE_ALERT_EMPTY.noOpportunities);
    });

    it("covers all opportunity kind labels via decision engine", () => {
      expect(OPPORTUNITY_ALERT_KINDS.length).toBe(15);
      const decisions = decideOpportunityAlerts(opp(), null);
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0]!.sourceEngine).toBe("AI Research");
    });
  });

  describe("Portfolio alerts", () => {
    it("generates portfolio risk, size, and holding alerts", () => {
      seedPortfolioAlertPrior(
        portfolio({
          overallRisk: 40,
          trustScore: 80,
          aiRecommendationHash: "rec-v0",
          validationStatus: "APPROVED",
        })
      );
      const batch = generatePortfolioAlerts({
        portfolio: portfolio({
          overallRisk: 70,
          diversificationScore: 30,
          trustScore: 60,
          validationStatus: "FAILED",
          aiRecommendationHash: "rec-v2",
          holdings: [
            {
              symbol: "RELIANCE",
              name: "Reliance",
              weightPercent: 22,
              quantity: 5,
              currentPrice: 3000,
              changePercent: 1,
              convictionScore: 85,
              tradeStatus: "target1_hit",
            },
            {
              symbol: "WIPRO",
              name: "Wipro",
              weightPercent: 5,
              quantity: 10,
              currentPrice: 400,
              changePercent: -10,
              convictionScore: 30,
              qualityScore: 25,
              tradeStatus: "stopped",
            },
          ],
        }),
        now: NOW,
      });

      expect(batch.empty).toBe(false);
      const kinds = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(kinds.has("portfolio_risk_increased")).toBe(true);
      expect(kinds.has("diversification_warning")).toBe(true);
      expect(kinds.has("position_size_too_large")).toBe(true);
      expect(kinds.has("new_high_conviction_holding")).toBe(true);
      expect(kinds.has("weak_holding")).toBe(true);
      expect(kinds.has("target_achieved")).toBe(true);
      expect(kinds.has("stop_loss_triggered")).toBe(true);
      expect(kinds.has("validation_failed")).toBe(true);
      expect(kinds.has("trust_score_changed")).toBe(true);
      expect(kinds.has("ai_recommendation_changed")).toBe(true);
      expect(PORTFOLIO_ALERT_KINDS.length).toBe(12);
    });

    it("returns No Portfolio Alerts when nothing fires", () => {
      const batch = generatePortfolioAlerts({
        portfolio: portfolio({
          overallRisk: 40,
          diversificationScore: 70,
          trustScore: 72,
          validationStatus: "APPROVED",
          aiRecommendationHash: "rec-v1",
          holdings: [
            {
              symbol: "INFY",
              name: "Infosys",
              weightPercent: 5,
              quantity: 1,
              currentPrice: 1500,
              changePercent: 0.5,
              convictionScore: 55,
              qualityScore: 70,
            },
          ],
        }),
        prior: portfolio({
          overallRisk: 40,
          diversificationScore: 70,
          trustScore: 72,
          validationStatus: "APPROVED",
          aiRecommendationHash: "rec-v1",
          holdings: [
            {
              symbol: "INFY",
              name: "Infosys",
              weightPercent: 5,
              quantity: 1,
              currentPrice: 1500,
              changePercent: 0.5,
              convictionScore: 55,
              qualityScore: 70,
            },
          ],
        }),
        now: NOW,
      });
      expect(batch.empty).toBe(true);
      expect(batch.emptyMessage).toBe(INTELLIGENCE_ALERT_EMPTY.noPortfolio);
    });
  });

  describe("Watchlist alerts", () => {
    it("generates watchlist opportunity and zone alerts", () => {
      const batch = generateWatchlistAlerts({
        items: [watchItem()],
        opportunities: {
          TCS: opp({
            symbol: "TCS",
            company: "Tata Consultancy",
            category: "breakout",
            aiConvictionScore: 76,
            entryZone: { low: 3850, high: 3920 },
            target1: 4100,
            momentum: 72,
          }),
        },
        now: NOW,
      });
      expect(batch.empty).toBe(false);
      const kinds = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(kinds.has("watchlist_opportunity")).toBe(true);
      expect(kinds.has("watchlist_breakout")).toBe(true);
      expect(kinds.has("near_buy_zone")).toBe(true);
      expect(kinds.has("high_volume")).toBe(true);
      expect(kinds.has("high_conviction")).toBe(true);
      expect(WATCHLIST_ALERT_KINDS.length).toBe(10);
    });

    it("detects AI score / validation / trust updates vs prior", () => {
      seedWatchlistAlertPrior([
        watchItem({ convictionScore: 50, trustScore: 60, validationStatus: "WARNING" }),
      ]);
      const batch = generateWatchlistAlerts({
        items: [
          watchItem({
            convictionScore: 70,
            trustScore: 75,
            validationStatus: "APPROVED",
            price: 4080,
            target1: 4100,
          }),
        ],
        now: NOW,
      });
      const kinds = new Set(batch.alerts.map((a) => a.metadata.eventType));
      expect(kinds.has("ai_score_improved")).toBe(true);
      expect(kinds.has("validation_updated")).toBe(true);
      expect(kinds.has("trust_updated")).toBe(true);
      expect(kinds.has("near_target")).toBe(true);
    });

    it("returns No Watchlist Alerts empty state", () => {
      const batch = generateWatchlistAlerts({ items: [], now: NOW });
      expect(batch.empty).toBe(true);
      expect(batch.emptyMessage).toBe(INTELLIGENCE_ALERT_EMPTY.noWatchlist);
    });
  });

  describe("Ranking / Grouping / Deduplication", () => {
    it("ranks alerts by multi-factor score", () => {
      const batch = generateOpportunityAlerts({
        opportunities: [
          opp({ symbol: "RELIANCE", id: "1" }),
          opp({
            symbol: "INFY",
            id: "2",
            company: "Infosys",
            aiConvictionScore: 50,
            category: "swing",
            momentum: 40,
            relativeStrength: 50,
          }),
        ],
        portfolioSymbols: ["RELIANCE"],
        now: NOW,
      });
      const ranked = rankAlerts(batch.alerts);
      expect(ranked.length).toBe(batch.alerts.length);
      expect(ranked[0]!.rank).toBe(1);
      expect(ranked[0]!.score).toBeGreaterThanOrEqual(ranked[ranked.length - 1]!.score);
      expect(ranked[0]!.factors.confidence).toBeGreaterThanOrEqual(0);
    });

    it("groups alerts by company", () => {
      const batch = generateOpportunityAlerts({
        opportunities: [opp()],
        now: NOW,
      });
      const groups = groupAlerts(batch.alerts, "company");
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0]!.count).toBeGreaterThan(0);
      expect(groups[0]!.representative.ticker).toBe("RELIANCE");
    });

    it("deduplicates identical alerts", () => {
      const batch = generateOpportunityAlerts({
        opportunities: [opp()],
        now: NOW,
      });
      const doubled = [...batch.alerts, ...batch.alerts];
      const result = deduplicateAlerts(doubled);
      expect(result.kept).toBe(batch.alerts.length);
      expect(result.removed).toBeGreaterThan(0);
    });
  });

  describe("Public API & regression", () => {
    it("exposes generate / rank / group / dedupe APIs", () => {
      expect(typeof generateOpportunityAlerts).toBe("function");
      expect(typeof generatePortfolioAlerts).toBe("function");
      expect(typeof generateWatchlistAlerts).toBe("function");
      expect(typeof rankAlerts).toBe("function");
      expect(typeof groupAlerts).toBe("function");
      expect(typeof deduplicateAlerts).toBe("function");
    });

    it("reuses R1 alert engine metrics when generating", () => {
      generateOpportunityAlerts({ opportunities: [opp()], now: NOW });
      const metrics = getAlertMetrics();
      expect(metrics.generated).toBeGreaterThan(0);
    });

    it("decision helpers never emit nullish presentation fields", () => {
      const d1 = decideOpportunityAlerts(opp({ reason: "" }), null);
      const d2 = decidePortfolioAlerts(portfolio(), null);
      const d3 = decideWatchlistAlerts(watchItem({ name: "" }), null, null);
      for (const d of [...d1, ...d2, ...d3]) {
        expect(d.title).toBeTruthy();
        expect(d.summary).toBeTruthy();
        expect(d.reason).toBeTruthy();
        expect(d.company).toBeTruthy();
        expect(Number.isNaN(d.confidenceScore)).toBe(false);
      }
    });
  });
});
