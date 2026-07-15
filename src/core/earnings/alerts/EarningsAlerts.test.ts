/**
 * Institutional Earnings Alerts — unit tests (Sprint 9B.R6).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EARNINGS_CALENDAR_SEED,
  getEarningsCalendarService,
  getIstDateKey,
  resetEarningsCalendarService,
  type EarningsCalendarEvent,
} from "@/src/core/earnings/calendar";
import { resetEarningsPreviewEngine } from "@/src/core/earnings/intelligence";
import {
  getEarningsDashboardEngine,
  resetEarningsDashboardEngine,
} from "@/src/core/earnings/dashboard";
import { resetPostEarningsEngine } from "@/src/core/earnings/postAnalysis";
import {
  ALERT_EMPTY,
  activeReminderRules,
  buildEarningsAlert,
  buildNotificationCenterView,
  dismissAlert,
  evaluateAlertKinds,
  getAlertHistory,
  getEarningsAlertEngine,
  getEarningsNotificationCenter,
  getPortfolioAlerts,
  getUpcomingAlerts,
  getWatchlistAlerts,
  markAlertRead,
  matchesReminderRule,
  resetAlertHistoryStore,
  resetEarningsAlertEngine,
  resetEarningsNotificationCenter,
  resolveAlertPriority,
  toAlertCardView,
  type AlertRuleContext,
} from "./index";

function shiftDate(base: Date, days: number): string {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return getIstDateKey(d);
}

function seedCalendar() {
  resetEarningsCalendarService();
  resetEarningsPreviewEngine();
  resetEarningsDashboardEngine();
  resetPostEarningsEngine();
  resetEarningsAlertEngine();
  resetAlertHistoryStore();
  resetEarningsNotificationCenter();

  getEarningsCalendarService({
    seed: DEFAULT_EARNINGS_CALENDAR_SEED,
    universeSize: 50,
  }).setMembership({
    portfolioSymbols: ["RELIANCE", "HDFCBANK", "INFY", "TCS"],
    watchlistSymbols: ["WIPRO", "SBIN", "LT", "MARUTI"],
  });
}

describe("Earnings Alerts", () => {
  const NOW = new Date("2026-07-15T06:30:00.000Z");

  beforeEach(() => {
    seedCalendar();
  });

  afterEach(() => {
    resetEarningsAlertEngine();
    resetAlertHistoryStore();
    resetEarningsNotificationCenter();
    resetEarningsDashboardEngine();
    resetEarningsPreviewEngine();
    resetPostEarningsEngine();
    resetEarningsCalendarService();
  });

  it("generates upcoming earnings alerts for visible companies", () => {
    const events = getEarningsCalendarService().getUpcomingEarnings({
      now: NOW,
    });
    const alerts = getEarningsAlertEngine().generateForEvents(events, NOW);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.every((a) => a.source === "Earnings")).toBe(true);
    expect(alerts.every((a) => a.priority)).toBeTruthy();
    expect(getUpcomingAlerts(NOW).length).toBeGreaterThan(0);
  });

  it("calculates AI alert priority for critical and high kinds", () => {
    const event = getEarningsCalendarService().getUpcomingEarnings({
      now: NOW,
    })[0]!;
    const scored = getEarningsAlertEngine().generateForEvents([event], NOW);
    const sample = scored[0]!;
    const scorecard = {
      institutionalScore: 80,
      aiConfidence: 75,
      beatProbability: 70,
      riskScore: 40,
      opportunityScore: 60,
      attentionLevel: "High" as const,
      priority: "P2" as const,
      portfolioImpact: 70,
      watchlistImpact: 40,
      historicalBeatRate: 60,
      expectedVolatilityScore: 75,
      institutionalInterestScore: 70,
      outlook: "Bullish" as const,
      transcriptAvailable: false,
      resultsReleased: false,
      available: true,
    };

    expect(resolveAlertPriority("one_hour_before", event, scorecard)).toBe(
      "Critical"
    );
    expect(resolveAlertPriority("major_miss", event, scorecard)).toBe(
      "Critical"
    );
    expect(resolveAlertPriority("major_beat", event, scorecard)).toBe("High");
    expect(resolveAlertPriority("upcoming_earnings", event, scorecard)).toBe(
      "Low"
    );
    expect(sample.aiConfidence).not.toMatch(/null|undefined|NaN/i);
    expect(sample.expectedImpact).toBeTruthy();
  });

  it("schedules reminder rules for 24h / 1h / results / transcript windows", () => {
    const base = getEarningsCalendarService().getUpcomingEarnings({
      now: NOW,
    })[0]!;
    const scorecard = {
      institutionalScore: 50,
      aiConfidence: 50,
      beatProbability: 50,
      riskScore: 40,
      opportunityScore: 40,
      attentionLevel: "Medium" as const,
      priority: "P3" as const,
      portfolioImpact: 0,
      watchlistImpact: 0,
      historicalBeatRate: 50,
      expectedVolatilityScore: 40,
      institutionalInterestScore: 40,
      outlook: "Neutral" as const,
      transcriptAvailable: true,
      resultsReleased: true,
      available: true,
    };

    const in24h: EarningsCalendarEvent = {
      ...base,
      resultDate: shiftDate(NOW, 1),
      resultTime: null,
    };
    const ctx24: AlertRuleContext = {
      event: in24h,
      scorecard: { ...scorecard, resultsReleased: false, transcriptAvailable: false },
      now: NOW,
    };
    expect(matchesReminderRule(ctx24, "24h") || matchesReminderRule(ctx24, "12h")).toBe(
      true
    );

    const released: AlertRuleContext = {
      event: { ...base, resultDate: shiftDate(NOW, -1) },
      scorecard,
      now: NOW,
    };
    expect(matchesReminderRule(released, "results_released")).toBe(true);
    expect(matchesReminderRule(released, "transcript_published")).toBe(true);
    expect(activeReminderRules(released.event, scorecard, NOW).length).toBeGreaterThan(
      0
    );
  });

  it("groups alerts into notification center sections", () => {
    const alerts = getEarningsAlertEngine().generateAll(NOW);
    const view = buildNotificationCenterView(alerts);
    expect(view.upcoming).toBeDefined();
    expect(view.today).toBeDefined();
    expect(view.tomorrow).toBeDefined();
    expect(view.portfolio).toBeDefined();
    expect(view.watchlist).toBeDefined();
    expect(view.completed).toBeDefined();
    expect(view.dismissed).toBeDefined();
    expect(view.unread).toBeDefined();
    expect(typeof view.unreadCount).toBe("number");
    expect(view.emptyMessage === "" || view.emptyMessage === ALERT_EMPTY.noActive).toBe(
      true
    );
  });

  it("surfaces portfolio and watchlist alerts", () => {
    const portfolio = getPortfolioAlerts(NOW);
    const watchlist = getWatchlistAlerts(NOW);
    expect(portfolio.every((a) => a.inPortfolio)).toBe(true);
    expect(watchlist.every((a) => a.inWatchlist)).toBe(true);
    expect(portfolio.length + watchlist.length).toBeGreaterThan(0);
  });

  it("supports quick actions mark read, dismiss, and snooze", () => {
    const alerts = getUpcomingAlerts(NOW);
    expect(alerts.length).toBeGreaterThan(0);
    const id = alerts[0]!.id;

    const center = getEarningsNotificationCenter();
    const read = center.applyQuickAction(id, "mark_read", NOW);
    expect(read.ok).toBe(true);
    expect(markAlertRead(id)?.read).toBe(true);

    const snooze = center.applyQuickAction(id, "snooze", NOW);
    expect(snooze.ok).toBe(true);
    expect(snooze.message).toContain("Snoozed");

    const dismissed = center.applyQuickAction(id, "dismiss", NOW);
    expect(dismissed.ok).toBe(true);
    expect(dismissAlert(id)?.status).toBe("dismissed");
    expect(getAlertHistory().some((r) => r.alertId === id)).toBe(true);

    const research = center.applyQuickAction(id, "open_research", NOW);
    expect(research.href).toContain("research");
  });

  it("uses institutional empty states and never surfaces nullish card fields", () => {
    const empty = buildNotificationCenterView([]);
    expect(empty.empty).toBe(true);
    expect(empty.emptyMessage).toBe(ALERT_EMPTY.noActive);
    expect(getEarningsNotificationCenter().getEmptyMessage("portfolio")).toBe(
      ALERT_EMPTY.noPortfolio
    );
    expect(getEarningsNotificationCenter().getEmptyMessage("watchlist")).toBe(
      ALERT_EMPTY.noWatchlist
    );
    expect(getEarningsNotificationCenter().getEmptyMessage("upcoming")).toBe(
      ALERT_EMPTY.noUpcoming
    );

    const event = getEarningsCalendarService().getUpcomingEarnings({
      now: NOW,
    })[0]!;
    const scored = getEarningsDashboardEngine().scoreEvent(event, NOW).scorecard;
    const alert = buildEarningsAlert({
      kind: "upcoming_earnings",
      event,
      scorecard: scored,
      now: NOW,
    });
    const card = toAlertCardView(alert);
    const blob = JSON.stringify(card);
    expect(blob).not.toMatch(/null|undefined|NaN/);
    expect(card.company).toBeTruthy();
    expect(card.timeRemaining).toBeTruthy();
  });

  it("caches alert calculations and only evaluates visible companies once", () => {
    const engine = getEarningsAlertEngine();
    const events = getEarningsCalendarService()
      .getUpcomingEarnings({ now: NOW })
      .slice(0, 5);
    engine.clearCache();
    engine.generateForEvents(events, NOW);
    const first = engine.getEvaluationCount();
    engine.generateForEvents(events, NOW);
    expect(engine.getEvaluationCount()).toBe(first);
    expect(first).toBe(events.length);
  });

  it("evaluates reminder and membership kinds for upcoming events", () => {
    const event = getEarningsCalendarService()
      .getUpcomingEarnings({ now: NOW })
      .find((e) => e.inPortfolio)!;
    const scorecard = {
      institutionalScore: 80,
      aiConfidence: 80,
      beatProbability: 70,
      riskScore: 50,
      opportunityScore: 60,
      attentionLevel: "Critical" as const,
      priority: "P1" as const,
      portfolioImpact: 80,
      watchlistImpact: 20,
      historicalBeatRate: 70,
      expectedVolatilityScore: 80,
      institutionalInterestScore: 80,
      outlook: "Bullish" as const,
      transcriptAvailable: false,
      resultsReleased: false,
      available: true,
    };
    const kinds = evaluateAlertKinds({ event, scorecard, now: NOW });
    expect(kinds).toContain("upcoming_earnings");
    expect(kinds).toContain("portfolio_company_earnings");
    expect(kinds).toContain("high_conviction_earnings");
    expect(kinds).toContain("high_volatility");
  });
});
