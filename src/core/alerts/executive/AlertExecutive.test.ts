/**
 * Alert Executive Hub — regression & composition tests (Sprint 9C.R8).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  generateAlert,
  registerAlertEngine,
  resetAlertEngine,
  type InstitutionalAlert,
} from "../index";
import { getAlertCenter, resetAlertCenter } from "../center";
import {
  getAlertWorkspace,
  resetAlertWorkspace,
} from "../workspace";
import {
  EXECUTIVE_EMPTY,
  assertNoSentinel,
  getAlertExecutiveDashboard,
  getAlertExecutiveView,
  getHomeAlertStrip,
  resetAlertExecutiveDashboard,
  resetExecutiveStack,
} from "./index";

const NOW = new Date("2026-07-15T12:00:00.000Z");

function makeAlert(
  overrides: Partial<{
    ticker: string;
    eventType: string;
    title: string;
    category: string;
    sourceEngine: InstitutionalAlert["sourceEngine"];
    priority: string;
    confidence: number;
    inPortfolio: boolean;
    inWatchlist: boolean;
    sector: string;
  }> = {}
): InstitutionalAlert {
  const result = generateAlert(
    {
      sourceEngine: overrides.sourceEngine ?? "Earnings",
      eventType: overrides.eventType ?? "eps_beat",
      title: overrides.title ?? "EPS Beat",
      summary: "Beat",
      reason: "Results",
      evidence: ["eps:Beat"],
      company: overrides.ticker ? `${overrides.ticker} Ltd` : "Test Co",
      ticker: overrides.ticker ?? "RELIANCE",
      inPortfolio: overrides.inPortfolio ?? true,
      inWatchlist: overrides.inWatchlist ?? false,
      suggestedCategory: overrides.category ?? "Earnings",
      suggestedPriority: overrides.priority ?? "High",
      suggestedSeverity: "Major",
      confidenceScore: overrides.confidence ?? 92,
      dedupeKey: `r8::${overrides.ticker ?? "RELIANCE"}::${overrides.eventType ?? "eps_beat"}::${Math.random()}`,
      groupKey: `r8::${overrides.ticker ?? "RELIANCE"}::${overrides.eventType ?? "eps_beat"}::${Math.random()}`,
      metadata: { sector: overrides.sector ?? "Banking" },
    },
    NOW
  );
  expect(result.alert).not.toBeNull();
  return result.alert!;
}

describe("Alert Executive Hub (9C.R8)", () => {
  beforeEach(() => {
    resetAlertEngine();
    resetAlertCenter();
    resetAlertWorkspace();
    resetAlertExecutiveDashboard();
    registerAlertEngine();
    getAlertWorkspace().setCenter(getAlertCenter());
    getAlertExecutiveDashboard().setCenter(getAlertCenter());
    getAlertExecutiveDashboard().setWorkspace(getAlertWorkspace());
  });

  afterEach(() => {
    resetExecutiveStack();
    resetAlertEngine();
  });

  describe("Empty states", () => {
    it("shows awaiting generation when empty", () => {
      const view = getAlertExecutiveView({ now: NOW });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(EXECUTIVE_EMPTY.awaitingAlertGeneration);
      expect(view.overview.emptyMessage).toBe(
        EXECUTIVE_EMPTY.awaitingAlertGeneration
      );
      expect(view.homeStrip.emptyMessage).toBe(
        EXECUTIVE_EMPTY.awaitingAlertGeneration
      );
    });

    it("never presents null undefined or NaN labels", () => {
      const view = getAlertExecutiveView({ now: NOW });
      for (const card of view.overview.cards) {
        expect(assertNoSentinel(card.value)).not.toMatch(/null|undefined|NaN/i);
        expect(assertNoSentinel(card.label)).toBeTruthy();
      }
      expect(assertNoSentinel(view.homeStrip.latestAiRecommendation)).toBeTruthy();
    });
  });

  describe("Executive overview", () => {
    it("summarizes portfolio, watchlist, critical, and confidence", () => {
      getAlertCenter().ingest([
        makeAlert({
          ticker: "TCS",
          priority: "Critical",
          inPortfolio: true,
          confidence: 95,
        }),
        makeAlert({
          ticker: "INFY",
          priority: "High",
          inPortfolio: false,
          inWatchlist: true,
          confidence: 80,
          eventType: "watch_move",
        }),
      ]);
      const view = getAlertExecutiveView({ now: NOW });
      expect(view.empty).toBe(false);
      expect(view.overview.totalAlerts).toBe(2);
      expect(view.overview.critical).toBeGreaterThanOrEqual(1);
      expect(view.overview.portfolioAlerts).toBeGreaterThanOrEqual(1);
      expect(view.overview.watchlistAlerts).toBeGreaterThanOrEqual(1);
      expect(view.overview.averageConfidence).toBeGreaterThan(0);
      expect(view.overview.cards.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Alert health", () => {
    it("computes health score and distributions", () => {
      getAlertCenter().ingest([
        makeAlert({ ticker: "HDFC", priority: "Critical", confidence: 91 }),
        makeAlert({
          ticker: "SBIN",
          priority: "Medium",
          confidence: 55,
          eventType: "sector_note",
          category: "News",
        }),
      ]);
      const view = getAlertExecutiveView({ now: NOW });
      expect(view.health.empty).toBe(false);
      expect(view.health.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(view.health.overallHealthScore).toBeLessThanOrEqual(100);
      expect(view.health.priorityDistribution.length).toBeGreaterThan(0);
      expect(view.health.categoryDistribution.length).toBeGreaterThan(0);
      expect(view.health.resolutionRateLabel).not.toMatch(/null|NaN/i);
    });
  });

  describe("Executive panels", () => {
    it("fills portfolio and watchlist panels from center alerts", () => {
      getAlertCenter().ingest([
        makeAlert({
          ticker: "ITC",
          inPortfolio: true,
          priority: "Critical",
          category: "Portfolio",
        }),
        makeAlert({
          ticker: "WIPRO",
          inPortfolio: false,
          inWatchlist: true,
          category: "Watchlist",
          eventType: "watch_alert",
        }),
      ]);
      const view = getAlertExecutiveView({ now: NOW });
      const portfolio = view.panels.find((p) => p.id === "portfolio_risk");
      const watchlist = view.panels.find((p) => p.id === "watchlist");
      expect(portfolio?.count).toBeGreaterThanOrEqual(1);
      expect(watchlist?.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Analytics", () => {
    it("ranks companies, sectors, and confidence leaders", () => {
      getAlertCenter().ingest([
        makeAlert({ ticker: "RELIANCE", sector: "Energy", confidence: 97 }),
        makeAlert({
          ticker: "TCS",
          sector: "IT",
          confidence: 88,
          eventType: "margin_up",
        }),
        makeAlert({
          ticker: "RELIANCE",
          sector: "Energy",
          confidence: 90,
          eventType: "volume_spike",
        }),
      ]);
      const view = getAlertExecutiveView({ now: NOW });
      expect(view.analytics.empty).toBe(false);
      expect(view.analytics.topCompanies.length).toBeGreaterThan(0);
      expect(view.analytics.topSectors.length).toBeGreaterThan(0);
      expect(view.analytics.highestConfidenceAlerts[0]?.score).toBeGreaterThanOrEqual(
        90
      );
      expect(view.analytics.mostFrequentCategories.length).toBeGreaterThan(0);
      expect(view.analytics.trendLabel).toBeTruthy();
    });
  });

  describe("Timeline", () => {
    it("records generated and lifecycle events", () => {
      const alert = makeAlert({ ticker: "AXISBANK" });
      getAlertCenter().ingest([alert]);
      getAlertCenter().performAction(alert.id, "pin", { now: NOW });
      getAlertCenter().performAction(alert.id, "resolve", { now: NOW });
      const view = getAlertExecutiveView({ now: NOW });
      expect(view.timeline.empty).toBe(false);
      expect(view.timeline.events.length).toBeGreaterThan(0);
      const types = view.timeline.events.map((e) => e.type);
      expect(types.some((t) => t === "pinned" || t === "resolved" || t === "generated" || t === "escalated")).toBe(
        true
      );
    });
  });

  describe("Reports & export", () => {
    it("builds executive report with toc and sections", () => {
      getAlertCenter().ingest([makeAlert({ ticker: "MARUTI" })]);
      const view = getAlertExecutiveView({ now: NOW });
      expect(view.report.empty).toBe(false);
      expect(view.report.tableOfContents.length).toBeGreaterThan(0);
      expect(view.report.sections.length).toBeGreaterThan(0);
      expect(view.report.markdown).toContain("Executive Alert Report");
      expect(view.report.printLayout).toContain("EXECUTIVE ALERT REPORT");
    });

    it("exports markdown via Sprint 9F ACL-aware exporter", () => {
      getAlertCenter().ingest([makeAlert({ ticker: "HINDUNILVR" })]);
      const result = getAlertExecutiveDashboard().exportMarkdown();
      expect(result.ok).toBe(true);
      expect(result.format).toBe("MARKDOWN");
      expect(result.content.length).toBeGreaterThan(20);
      expect(result.filename).toMatch(/\.md$/i);
    });

    it("exports print layout", () => {
      getAlertCenter().ingest([makeAlert({ ticker: "NESTLEIND" })]);
      const result = getAlertExecutiveDashboard().exportPrint();
      expect(result.ok).toBe(true);
      expect(result.format).toBe("PRINT");
      expect(result.content).toContain("EXECUTIVE ALERT REPORT");
    });
  });

  describe("Home dashboard strip", () => {
    it("exposes unread critical portfolio watchlist and AI recommendation", () => {
      getAlertCenter().ingest([
        makeAlert({
          ticker: "BAJFINANCE",
          priority: "Critical",
          inPortfolio: true,
          confidence: 94,
        }),
      ]);
      const strip = getHomeAlertStrip({ now: NOW });
      expect(strip.empty).toBe(false);
      expect(strip.critical).toBeGreaterThanOrEqual(1);
      expect(strip.portfolio).toBeGreaterThanOrEqual(1);
      expect(strip.highestPriority).toBeTruthy();
      expect(strip.latestAiRecommendation).toBeTruthy();
      expect(strip.latestAiRecommendation).not.toMatch(/null|undefined|NaN/i);
    });
  });

  describe("Workspace integration", () => {
    it("surfaces workspace pins and favorites in executive view", () => {
      const alert = makeAlert({ ticker: "LT" });
      getAlertCenter().ingest([alert]);
      getAlertWorkspace().quickAction(alert.id, "pin", { now: NOW });
      getAlertWorkspace().quickAction(alert.id, "favorite", { now: NOW });
      const view = getAlertExecutiveView({ now: NOW });
      expect(view.workspacePinned).toBeGreaterThanOrEqual(1);
      expect(view.workspaceFavorites).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Platform integrations", () => {
    it("composes center resolve into resolved-today overview", () => {
      const alert = makeAlert({ ticker: "ONGC" });
      getAlertCenter().ingest([alert]);
      getAlertCenter().performAction(alert.id, "resolve", { now: NOW });
      const view = getAlertExecutiveView({ now: NOW });
      expect(view.overview.resolvedToday).toBeGreaterThanOrEqual(1);
    });

    it("includes research panel for AI Research sourced alerts", () => {
      getAlertCenter().ingest([
        makeAlert({
          ticker: "ULTRACEMCO",
          sourceEngine: "AI Research",
          category: "Opportunity",
          eventType: "research_upgrade",
        }),
      ]);
      const view = getAlertExecutiveView({ now: NOW });
      const research = view.panels.find((p) => p.id === "research");
      expect(research?.count).toBeGreaterThanOrEqual(1);
    });

    it("includes validation and trust panels", () => {
      getAlertCenter().ingest([
        makeAlert({
          ticker: "BPCL",
          sourceEngine: "Validation",
          category: "Validation",
          eventType: "validation_warn",
        }),
        makeAlert({
          ticker: "IOC",
          sourceEngine: "Trust",
          category: "Trust",
          eventType: "trust_shift",
        }),
      ]);
      const view = getAlertExecutiveView({ now: NOW });
      expect(view.panels.find((p) => p.id === "validation")?.count).toBeGreaterThanOrEqual(
        1
      );
      expect(view.panels.find((p) => p.id === "trust")?.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Regression R1–R7", () => {
    it("still generates alerts through R1 engine", () => {
      const alert = makeAlert({ ticker: "COALINDIA" });
      expect(alert.id).toBeTruthy();
      expect(alert.confidence.score).toBeGreaterThan(0);
    });

    it("workspace rules still evaluate inside executive session", () => {
      const alert = makeAlert({ confidence: 96, inPortfolio: true });
      getAlertCenter().ingest([alert]);
      getAlertWorkspace().addRule({
        name: "Exec pin",
        enabled: true,
        conditions: [
          { field: "confidence", operator: "gt", value: 90 },
          { field: "portfolio", operator: "is_true", value: true },
        ],
        actions: [{ type: "pin" }],
      });
      const run = getAlertWorkspace().runAutomation({ now: NOW });
      expect(run.some((r) => r.actionsApplied.includes("pin"))).toBe(true);
      const view = getAlertExecutiveView({ now: NOW });
      expect(view.analytics.mostTriggeredRules.length).toBeGreaterThan(0);
    });
  });
});
