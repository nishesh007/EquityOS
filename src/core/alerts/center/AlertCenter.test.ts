/**
 * Institutional Alert Center — tests (Sprint 9C.R5).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  generateAlert,
  registerAlertEngine,
  resetAlertEngine,
  type InstitutionalAlert,
} from "../index";
import {
  ALERT_CENTER_EMPTY,
  AlertCenter,
  AlertLifecycleManager,
  canTransitionCenter,
  getAlertCenter,
  getAlertCenterView,
  getAlertDrawer,
  resetAlertCenter,
} from "./index";

const NOW = new Date("2026-07-15T10:00:00.000Z");

function makeAlert(
  overrides: Partial<{
    ticker: string;
    company: string;
    priority: InstitutionalAlert["priority"];
    severity: InstitutionalAlert["severity"];
    category: InstitutionalAlert["category"];
    sourceEngine: InstitutionalAlert["sourceEngine"];
    inPortfolio: boolean;
    inWatchlist: boolean;
    eventType: string;
    title: string;
  }> = {}
): InstitutionalAlert {
  const result = generateAlert(
    {
      sourceEngine: overrides.sourceEngine ?? "Earnings",
      eventType: overrides.eventType ?? "earnings_today",
      title: overrides.title ?? "RELIANCE earnings today",
      summary: "Results due today",
      reason: "Calendar window",
      evidence: ["calendar"],
      company: overrides.company ?? "Reliance Industries",
      ticker: overrides.ticker ?? "RELIANCE",
      inPortfolio: overrides.inPortfolio ?? true,
      inWatchlist: overrides.inWatchlist ?? false,
      suggestedCategory: overrides.category ?? "Earnings",
      suggestedPriority: overrides.priority ?? "Critical",
      suggestedSeverity: overrides.severity ?? "Critical",
      confidenceScore: 80,
      dedupeKey: `test::${overrides.ticker ?? "RELIANCE"}::${overrides.eventType ?? "earnings_today"}::${Math.random()}`,
      groupKey: `test::${overrides.ticker ?? "RELIANCE"}::${overrides.eventType ?? "earnings_today"}`,
      metadata: { sector: "Energy" },
    },
    NOW
  );
  expect(result.alert).not.toBeNull();
  return result.alert!;
}

describe("Institutional Alert Center (9C.R5)", () => {
  let center: AlertCenter;

  beforeEach(() => {
    resetAlertEngine();
    resetAlertCenter();
    registerAlertEngine();
    center = getAlertCenter();
  });

  afterEach(() => {
    resetAlertCenter();
    resetAlertEngine();
  });

  describe("Lifecycle", () => {
    it("supports inbox lifecycle transitions", () => {
      expect(canTransitionCenter("New", "Read")).toBe(true);
      expect(canTransitionCenter("Read", "Acknowledged")).toBe(true);
      expect(canTransitionCenter("Acknowledged", "Resolved")).toBe(true);
      expect(canTransitionCenter("Resolved", "Archived")).toBe(true);
      expect(canTransitionCenter("Deleted", "Unread")).toBe(true);

      const mgr = new AlertLifecycleManager();
      const alert = makeAlert();
      center.ingest([alert]);
      let item = center.performAction(alert.id, "mark_read", { now: NOW }).item!;
      expect(item.inboxStatus).toBe("Read");
      expect(item.read).toBe(true);
      expect(item.timestamps.opened).toBeTruthy();

      item = center.performAction(alert.id, "pin", { now: NOW }).item!;
      expect(item.pinned).toBe(true);

      item = center.performAction(alert.id, "snooze", {
        now: NOW,
        snoozeUntil: new Date(NOW.getTime() + 7200_000),
      }).item!;
      expect(item.inboxStatus).toBe("Snoozed");
      expect(item.snoozedUntil).toBeTruthy();

      item = center.performAction(alert.id, "resolve", { now: NOW }).item!;
      expect(item.inboxStatus).toBe("Resolved");
      expect(item.timestamps.resolved).toBeTruthy();
    });

    it("archives, restores, and soft-deletes", () => {
      const alert = makeAlert({ ticker: "TCS", eventType: "eps_beat" });
      center.ingest([alert]);
      center.performAction(alert.id, "archive", { now: NOW });
      expect(center.getDrawer(alert.id)?.inboxStatus).toBe("Archived");

      center.performAction(alert.id, "restore", { now: NOW });
      expect(getAlertDrawer(alert.id)?.inboxStatus).toBe("Unread");

      center.performAction(alert.id, "dismiss", { now: NOW });
      const view = center.getView({ filter: "all", now: NOW });
      expect(view.rows.find((r) => r.id === alert.id)).toBeUndefined();
    });
  });

  describe("Filtering", () => {
    it("filters unread, critical, portfolio, earnings, archived", () => {
      const a = makeAlert({ ticker: "RELIANCE", priority: "Critical" });
      const b = makeAlert({
        ticker: "INFY",
        priority: "Medium",
        category: "Opportunity",
        sourceEngine: "AI Research",
        eventType: "high_conviction",
        inPortfolio: false,
        inWatchlist: true,
        title: "INFY opportunity",
      });
      center.ingest([a, b]);
      center.performAction(a.id, "mark_read", { now: NOW });

      expect(center.getView({ filter: "unread", now: NOW }).total).toBe(1);
      expect(center.getView({ filter: "critical", now: NOW }).total).toBeGreaterThanOrEqual(1);
      expect(center.getView({ filter: "portfolio", now: NOW }).rows.every((r) => r.id === a.id || r.ticker === "RELIANCE")).toBe(true);
      expect(center.getView({ filter: "earnings", now: NOW }).total).toBeGreaterThanOrEqual(1);
      expect(center.getView({ filter: "opportunity", now: NOW }).total).toBeGreaterThanOrEqual(1);
      expect(center.getView({ filter: "watchlist", now: NOW }).total).toBeGreaterThanOrEqual(1);

      center.performAction(a.id, "archive", { now: NOW });
      expect(center.getView({ filter: "archived", now: NOW }).total).toBe(1);
    });
  });

  describe("Searching", () => {
    it("searches by ticker, company, keywords, confidence, portfolio only", () => {
      const a = makeAlert({ ticker: "HDFCBANK", company: "HDFC Bank" });
      const b = makeAlert({
        ticker: "WIPRO",
        company: "Wipro",
        inPortfolio: false,
        eventType: "guidance_raised",
        title: "WIPRO guidance",
      });
      center.ingest([a, b]);

      expect(center.search({ ticker: "HDFCBANK" }).length).toBe(1);
      expect(center.search({ company: "Wipro" }).length).toBe(1);
      expect(center.search({ keywords: ["guidance"] }).length).toBeGreaterThanOrEqual(1);
      expect(center.search({ minConfidence: 50 }).length).toBe(2);
      expect(center.search({ portfolioOnly: true }).length).toBe(1);
    });
  });

  describe("Grouping", () => {
    it("groups by company, category, severity, source", () => {
      center.ingest([
        makeAlert({ ticker: "RELIANCE" }),
        makeAlert({ ticker: "RELIANCE", eventType: "eps_beat", title: "beat" }),
        makeAlert({
          ticker: "TCS",
          category: "Technical",
          sourceEngine: "Market",
          eventType: "rsi_overbought",
          title: "RSI",
        }),
      ]);
      const byCompany = center.groupBy("company");
      expect(byCompany.some((g) => g.count >= 2)).toBe(true);
      expect(center.groupBy("category").length).toBeGreaterThanOrEqual(1);
      expect(center.groupBy("severity").length).toBeGreaterThanOrEqual(1);
      expect(center.groupBy("source").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("History & metrics", () => {
    it("records history for actions", () => {
      const alert = makeAlert();
      center.ingest([alert]);
      center.performAction(alert.id, "mark_read", { now: NOW });
      center.performAction(alert.id, "resolve", { now: NOW });
      const hist = center.getHistory(alert.id);
      expect(hist.length).toBeGreaterThanOrEqual(3);
      expect(hist.some((h) => h.action === "mark_read")).toBe(true);
      expect(hist.some((h) => h.action === "resolve")).toBe(true);
    });

    it("computes center metrics with safe labels", () => {
      const alert = makeAlert();
      center.ingest([alert]);
      center.performAction(alert.id, "resolve", { now: NOW });
      const metrics = center.getMetrics(NOW);
      expect(metrics.totalAlerts).toBeGreaterThanOrEqual(1);
      expect(metrics.resolved).toBeGreaterThanOrEqual(1);
      expect(metrics.labels.averageConfidence).not.toMatch(/null|undefined|NaN/i);
      expect(metrics.labels.alertVelocity).toContain("/h");
    });
  });

  describe("UI view & drawer", () => {
    it("builds summary cards and table rows", () => {
      center.ingest([makeAlert()]);
      const view = getAlertCenterView({ now: NOW });
      expect(view.empty).toBe(false);
      expect(view.summary.labels.unread).toBeTruthy();
      expect(view.rows[0]!.severityBadge).toBeTruthy();
      expect(view.rows[0]!.confidence).toBeTruthy();
      expect(view.rows[0]!.actions.length).toBeGreaterThan(0);
    });

    it("builds drawer with timeline, evidence, and related links", () => {
      const alert = makeAlert({
        category: "Opportunity",
        sourceEngine: "AI Research",
        eventType: "new_buy_opportunity",
        title: "New buy",
      });
      center.ingest([alert]);
      center.performAction(alert.id, "mark_read", { now: NOW });
      const drawer = getAlertDrawer(alert.id);
      expect(drawer).not.toBeNull();
      expect(drawer!.title).toBeTruthy();
      expect(drawer!.timeline.length).toBeGreaterThan(0);
      expect(drawer!.decisionTrace.length).toBeGreaterThan(0);
      expect(drawer!.relatedCompany).toContain("/company");
      expect(drawer!.evidence.length).toBeGreaterThan(0);
    });

    it("supports copy and open_* actions", () => {
      const alert = makeAlert({ ticker: "RELIANCE" });
      center.ingest([alert]);
      const copy = center.performAction(alert.id, "copy");
      expect(copy.copyText).toContain("RELIANCE");
      expect(center.performAction(alert.id, "open_company").href).toContain(
        "RELIANCE"
      );
      expect(center.performAction(alert.id, "open_research").href).toContain(
        "/research"
      );
    });
  });

  describe("Empty states", () => {
    it("returns awaiting generation when empty", () => {
      const view = getAlertCenterView({ now: NOW });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(ALERT_CENTER_EMPTY.awaitingGeneration);
    });

    it("returns no unread / no matching messages", () => {
      const alert = makeAlert();
      center.ingest([alert]);
      center.performAction(alert.id, "mark_read", { now: NOW });
      expect(
        center.getView({ filter: "unread", now: NOW }).emptyMessage
      ).toBe(ALERT_CENTER_EMPTY.noUnread);
      expect(
        center.getView({
          filter: "all",
          search: { ticker: "NOPE" },
          now: NOW,
        }).emptyMessage
      ).toBe(ALERT_CENTER_EMPTY.noMatching);
    });

    it("never exposes nullish row fields", () => {
      center.ingest([makeAlert({ company: "" })]);
      const row = center.getView({ now: NOW }).rows[0]!;
      expect(row.company).toBeTruthy();
      expect(row.confidence).not.toMatch(/^(null|undefined|NaN)$/);
      expect(row.reason).toBeTruthy();
    });
  });

  describe("Sync & regression", () => {
    it("syncs from R1 engine alerts", () => {
      makeAlert({ ticker: "SBIN", eventType: "upcoming_earnings" });
      const synced = center.syncFromEngine();
      expect(synced.length).toBeGreaterThan(0);
      expect(center.getView({ now: NOW }).total).toBeGreaterThan(0);
    });

    it("filters today and this_week", () => {
      center.ingest([makeAlert()]);
      expect(center.getView({ filter: "today", now: NOW }).total).toBeGreaterThanOrEqual(1);
      expect(center.getView({ filter: "this_week", now: NOW }).total).toBeGreaterThanOrEqual(1);
    });

    it("groups by date, portfolio, watchlist, and sector", () => {
      center.ingest([
        makeAlert({ ticker: "RELIANCE", inPortfolio: true }),
        makeAlert({
          ticker: "TCS",
          inPortfolio: false,
          inWatchlist: true,
          eventType: "rsi_overbought",
          sourceEngine: "Market",
          category: "Technical",
          title: "TCS RSI",
        }),
      ]);
      expect(center.groupBy("date").length).toBeGreaterThanOrEqual(1);
      expect(center.groupBy("portfolio").some((g) => g.label === "Portfolio")).toBe(true);
      expect(center.groupBy("watchlist").length).toBeGreaterThanOrEqual(1);
      expect(center.groupBy("sector").length).toBeGreaterThanOrEqual(1);
    });

    it("acknowledges and unpins via lifecycle manager", () => {
      const alert = makeAlert({ ticker: "ITC", eventType: "results_published" });
      center.ingest([alert]);
      center.performAction(alert.id, "pin", { now: NOW });
      const unpinned = center.performAction(alert.id, "unpin", { now: NOW }).item!;
      expect(unpinned.pinned).toBe(false);
      const mgr = new AlertLifecycleManager();
      const acked = mgr.acknowledge(unpinned, NOW);
      expect(acked.inboxStatus).toBe("Acknowledged");
      expect(acked.timestamps.acknowledged).toBeTruthy();
    });

    it("searches by severity, category, and date range", () => {
      center.ingest([makeAlert({ severity: "Critical", category: "Earnings" })]);
      expect(center.search({ severity: "Critical" }).length).toBeGreaterThanOrEqual(1);
      expect(center.search({ category: "Earnings" }).length).toBeGreaterThanOrEqual(1);
      expect(
        center.search({
          dateFrom: "2026-07-01T00:00:00.000Z",
          dateTo: "2026-07-31T23:59:59.000Z",
        }).length
      ).toBeGreaterThanOrEqual(1);
    });
  });
});
