/**
 * Executive Earnings Hub — presentation tests (Sprint 9B.R8).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EARNINGS_CALENDAR_SEED,
  getEarningsCalendarService,
  resetEarningsCalendarService,
} from "@/src/core/earnings/calendar";
import {
  getDashboard,
  resetEarningsDashboardEngine,
} from "@/src/core/earnings/dashboard";
import { resetEarningsPreviewEngine } from "@/src/core/earnings/intelligence";
import {
  getWorkspace,
  resetEarningsWorkspaceEngine,
  resetPortfolioImpactEngine,
  resetWatchlistImpactEngine,
} from "@/src/core/earnings/workspace";
import {
  EXECUTIVE_EARNINGS_EMPTY,
  buildExecutiveEarningsHealthStrip,
  buildExecutiveEarningsHub,
  buildExecutiveEarningsMetrics,
  buildExecutiveEarningsOverview,
  buildExecutiveEarningsQuickActions,
} from "./executive-earnings-presentation";

const NOW = new Date("2026-07-15T06:30:00.000Z");

function seed() {
  resetEarningsCalendarService();
  resetEarningsPreviewEngine();
  resetEarningsDashboardEngine();
  resetEarningsWorkspaceEngine();
  resetPortfolioImpactEngine();
  resetWatchlistImpactEngine();

  getEarningsCalendarService({
    seed: DEFAULT_EARNINGS_CALENDAR_SEED,
    universeSize: 50,
  }).setMembership({
    portfolioSymbols: ["RELIANCE", "HDFCBANK", "INFY", "TCS"],
    watchlistSymbols: ["WIPRO", "SBIN", "LT", "MARUTI"],
  });
}

describe("Executive Earnings Hub Presentation", () => {
  beforeEach(() => seed());

  afterEach(() => {
    resetEarningsWorkspaceEngine();
    resetPortfolioImpactEngine();
    resetWatchlistImpactEngine();
    resetEarningsDashboardEngine();
    resetEarningsPreviewEngine();
    resetEarningsCalendarService();
  });

  function snapshot() {
    const calendar = getEarningsCalendarService();
    const dashboard = getDashboard({ now: NOW, pageSize: 8 });
    const workspace = getWorkspace({
      now: NOW,
      context: {
        holdings: [
          { symbol: "RELIANCE", quantity: 50, currentPrice: 2800 },
        ],
        watchlistSymbols: ["WIPRO", "SBIN"],
      },
    });
    return {
      calendarMetrics: calendar.getCalendarMetrics(NOW),
      dashboardMetrics: dashboard.metrics,
      rankedItems: dashboard.items,
      workspace,
      subject: {
        userId: "tester",
        role: "subscriber" as const,
        subscriptionTier: "pro" as const,
      },
    };
  }

  it("builds executive overview with institutional counts", () => {
    const overview = buildExecutiveEarningsOverview(snapshot());
    const ids = overview.map((o) => o.id);
    expect(ids).toContain("upcoming");
    expect(ids).toContain("today");
    expect(ids).toContain("tomorrow");
    expect(ids).toContain("week");
    expect(ids).toContain("portfolio");
    expect(ids).toContain("watchlist");
    expect(ids).toContain("high_impact");
    expect(ids).toContain("transcript_pending");
    expect(ids).toContain("ai_pending");
    expect(ids).toContain("reports_ready");
    expect(JSON.stringify(overview)).not.toMatch(/null|undefined|NaN/);
  });

  it("builds executive metrics including coverage and averages", () => {
    const metrics = buildExecutiveEarningsMetrics(snapshot());
    const byId = Object.fromEntries(metrics.map((m) => [m.id, m.value]));
    expect(byId.coverage).toBeTruthy();
    expect(byId.upcoming).toBeTruthy();
    expect(byId.avg_surprise).toBeTruthy();
    expect(byId.avg_risk).toBeTruthy();
    expect(byId.transcript_coverage).toBeTruthy();
    expect(byId.historical_coverage).toBeTruthy();
    expect(JSON.stringify(metrics)).not.toMatch(/\bnull\b|\bundefined\b|\bNaN\b/);
  });

  it("builds health strip for calendar / AI / workspace / export", () => {
    const health = buildExecutiveEarningsHealthStrip(snapshot());
    const labels = health.map((h) => h.label);
    expect(labels).toContain("Calendar Healthy");
    expect(labels).toContain("AI Ready");
    expect(labels).toContain("Transcript Ready");
    expect(labels).toContain("Workspace Ready");
    expect(labels).toContain("Portfolio Synced");
    expect(labels).toContain("Reporting Ready");
    expect(labels).toContain("Export Ready");
    expect(health.every((h) => h.status)).toBeTruthy();
  });

  it("integrates calendar, portfolio, and watchlist signals", () => {
    const hub = buildExecutiveEarningsHub(snapshot());
    expect(hub.empty).toBe(false);
    expect(Number(hub.overview.find((o) => o.id === "portfolio")?.value ?? 0)).toBeGreaterThan(
      0
    );
    expect(Number(hub.overview.find((o) => o.id === "watchlist")?.value ?? 0)).toBeGreaterThan(
      0
    );
    expect(hub.sprintComplete).toBe(true);
  });

  it("exposes workspace and report readiness", () => {
    const hub = buildExecutiveEarningsHub(snapshot());
    expect(hub.reportsReady).toBeTruthy();
    expect(hub.healthStrip.some((h) => h.id === "workspace")).toBe(true);
    expect(hub.healthStrip.some((h) => h.id === "reporting")).toBe(true);
  });

  it("enforces ACL — subscriber full access, free preview only", () => {
    const sub = buildExecutiveEarningsHub({
      ...snapshot(),
      subject: {
        userId: "sub",
        role: "subscriber",
        subscriptionTier: "pro",
      },
    });
    expect(sub.access.fullAccess).toBe(true);
    expect(sub.access.previewOnly).toBe(false);
    expect(sub.access.canExport).toBe(true);

    const free = buildExecutiveEarningsHub({
      ...snapshot(),
      subject: {
        userId: "free",
        role: "free",
        subscriptionTier: "free",
      },
    });
    expect(free.access.previewOnly).toBe(true);
    expect(free.access.upgradeRequired).toBe(true);
    expect(free.access.canExport).toBe(false);

    const admin = buildExecutiveEarningsHub({
      ...snapshot(),
      subject: {
        userId: "admin",
        role: "administrator",
        subscriptionTier: "enterprise",
      },
    });
    expect(admin.access.fullAccess).toBe(true);
  });

  it("builds quick actions for calendar, workspace, reports, export", () => {
    const actions = buildExecutiveEarningsQuickActions(snapshot());
    const ids = actions.map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "calendar",
        "workspace",
        "portfolio",
        "watchlist",
        "transcript",
        "reports",
        "refresh",
        "export",
      ])
    );
  });

  it("uses polished empty states when no coverage", () => {
    getEarningsCalendarService().setMembership({
      portfolioSymbols: [],
      watchlistSymbols: [],
    });
    resetEarningsDashboardEngine();
    resetEarningsWorkspaceEngine();

    const emptyHub = buildExecutiveEarningsHub({
      dashboardMetrics: {
        upcomingEarnings: 0,
        todaysEarnings: 0,
        tomorrowEarnings: 0,
        next7Days: 0,
        portfolioEarnings: 0,
        watchlistEarnings: 0,
        highImpactEarnings: 0,
        aiHighConviction: 0,
        averageBeatProbability: "—",
        averageAiConfidence: "—",
        portfolioExposure: EXECUTIVE_EARNINGS_EMPTY.noPortfolio,
        watchlistExposure: EXECUTIVE_EARNINGS_EMPTY.noWatchlist,
        ready: false,
      },
      rankedItems: [],
      workspace: getWorkspace({ now: NOW }),
      subject: {
        userId: "t",
        role: "subscriber",
        subscriptionTier: "pro",
      },
    });

    expect(emptyHub.empty).toBe(true);
    expect(emptyHub.emptyMessage).toBe(EXECUTIVE_EARNINGS_EMPTY.noUpcoming);
    const portfolio = emptyHub.overview.find((o) => o.id === "portfolio");
    expect(portfolio?.value).toBe(EXECUTIVE_EARNINGS_EMPTY.noPortfolio);
  });

  it("is presentation-only — hub build is cheap and repeatable", () => {
    const input = snapshot();
    const a = buildExecutiveEarningsHub(input);
    const b = buildExecutiveEarningsHub(input);
    expect(a.overview.length).toBe(b.overview.length);
    expect(a.metrics.length).toBe(b.metrics.length);
    expect(a.healthStrip.length).toBe(b.healthStrip.length);
  });
});
