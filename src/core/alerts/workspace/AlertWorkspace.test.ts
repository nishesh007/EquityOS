/**
 * Alert Workspace — rules, automation, personalization tests (Sprint 9C.R7).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  generateAlert,
  registerAlertEngine,
  resetAlertEngine,
  type InstitutionalAlert,
} from "../index";
import {
  getAlertCenter,
  resetAlertCenter,
} from "../center";
import {
  WORKSPACE_EMPTY,
  AlertWorkspace,
  buildTemplateRules,
  createAlertRule,
  evaluateRule,
  getAlertWorkspace,
  getAlertWorkspaceView,
  resetAlertWorkspace,
} from "./index";

const NOW = new Date("2026-07-15T10:00:00.000Z");

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
      company: "Test Co",
      ticker: overrides.ticker ?? "RELIANCE",
      inPortfolio: overrides.inPortfolio ?? true,
      inWatchlist: overrides.inWatchlist ?? false,
      suggestedCategory: overrides.category ?? "Earnings",
      suggestedPriority: overrides.priority ?? "High",
      suggestedSeverity: "Major",
      confidenceScore: overrides.confidence ?? 92,
      dedupeKey: `r7::${overrides.ticker ?? "RELIANCE"}::${overrides.eventType ?? "eps_beat"}::${Math.random()}`,
      groupKey: `r7::${overrides.ticker ?? "RELIANCE"}::${overrides.eventType ?? "eps_beat"}::${Math.random()}`,
      metadata: { sector: overrides.sector ?? "Banking" },
    },
    NOW
  );
  expect(result.alert).not.toBeNull();
  return result.alert!;
}

describe("Alert Workspace (9C.R7)", () => {
  let workspace: AlertWorkspace;

  beforeEach(() => {
    resetAlertEngine();
    resetAlertCenter();
    resetAlertWorkspace();
    registerAlertEngine();
    workspace = getAlertWorkspace();
    workspace.setCenter(getAlertCenter());
  });

  afterEach(() => {
    resetAlertWorkspace();
    resetAlertCenter();
    resetAlertEngine();
  });

  describe("Rule evaluation", () => {
    it("matches confidence + portfolio then pin", () => {
      const alert = makeAlert({ confidence: 95, inPortfolio: true });
      getAlertCenter().ingest([alert]);
      const item = getAlertCenter().performAction(alert.id, "copy").item!;
      const rule = createAlertRule({
        name: "High confidence portfolio pin",
        enabled: true,
        conditions: [
          { field: "confidence", operator: "gt", value: 90 },
          { field: "portfolio", operator: "is_true", value: true },
        ],
        actions: [{ type: "pin" }],
      });
      const result = evaluateRule(item, rule);
      expect(result.matched).toBe(true);
      expect(result.actions[0]!.type).toBe("pin");
    });

    it("matches sector + priority highlight rule", () => {
      const alert = makeAlert({
        sector: "Banking",
        confidence: 95,
        priority: "Critical",
        inPortfolio: true,
      });
      getAlertCenter().ingest([alert]);
      const item = getAlertCenter().performAction(alert.id, "copy").item!;
      // Boost priority score via critical + portfolio — rule uses priority score
      const rule = createAlertRule({
        name: "Banking highlight",
        enabled: true,
        conditions: [
          { field: "sector", operator: "contains", value: "Bank" },
          { field: "priority", operator: "gt", value: 50 },
        ],
        actions: [{ type: "highlight", value: "#C4A35A" }],
      });
      expect(evaluateRule(item, rule).matched).toBe(true);
    });

    it("does not match disabled rules", () => {
      const alert = makeAlert();
      getAlertCenter().ingest([alert]);
      const item = getAlertCenter().performAction(alert.id, "copy").item!;
      const rule = createAlertRule({
        name: "Disabled",
        enabled: false,
        conditions: [{ field: "confidence", operator: "gt", value: 1 }],
        actions: [{ type: "favorite" }],
      });
      expect(evaluateRule(item, rule).matched).toBe(false);
    });
  });

  describe("Automation", () => {
    it("auto pins and favorites via runAutomation", () => {
      const alert = makeAlert({ confidence: 95, inPortfolio: true });
      getAlertCenter().ingest([alert]);
      workspace.addRule({
        name: "Auto pin",
        enabled: true,
        conditions: [
          { field: "confidence", operator: "gt", value: 90 },
          { field: "portfolio", operator: "is_true", value: true },
        ],
        actions: [{ type: "pin" }, { type: "favorite" }],
      });
      const results = workspace.runAutomation({ now: NOW });
      expect(results.some((r) => r.triggeredRules > 0)).toBe(true);
      expect(
        results.some((r) => r.actionsApplied.includes("pin"))
      ).toBe(true);
      const hist = workspace.getAutomationHistory();
      expect(hist.empty).toBe(false);
      expect(hist.entries[0]!.ruleName).toBeTruthy();
    });

    it("records automation metrics", () => {
      const alert = makeAlert({ confidence: 95 });
      getAlertCenter().ingest([alert]);
      workspace.addRule({
        name: "Mark read automation",
        enabled: true,
        conditions: [{ field: "confidence", operator: "gte", value: 90 }],
        actions: [{ type: "mark_read" }],
      });
      workspace.runAutomation({ now: NOW });
      const metrics = workspace.getMetrics();
      expect(metrics.rulesCreated).toBeGreaterThanOrEqual(1);
      expect(metrics.rulesTriggered).toBeGreaterThanOrEqual(1);
      expect(metrics.labels.automationHistory).not.toMatch(/null|undefined|NaN/i);
    });
  });

  describe("Favorites & quick actions", () => {
    it("favorites and pins via quick actions", () => {
      const alert = makeAlert();
      getAlertCenter().ingest([alert]);
      const fav = workspace.quickAction(alert.id, "favorite", { now: NOW });
      expect(fav.favorite).toBe(true);
      const pin = workspace.quickAction(alert.id, "pin", { now: NOW });
      expect(pin.pinned).toBe(true);
      expect(workspace.listQuickActions()).toContain("open_company");
    });
  });

  describe("Saved views & preferences", () => {
    it("saves views, filters, searches and preferences", () => {
      const view = workspace.saveView({
        name: "Portfolio critical",
        filter: "portfolio",
        groupBy: "severity",
        sort: "priority",
        density: "compact",
      });
      expect(view.name).toBe("Portfolio critical");
      expect(workspace.listSavedViews().length).toBe(1);

      const filter = workspace.saveFilter({
        name: "Unread",
        filter: "unread",
      });
      expect(filter.id).toContain("filter::");

      const search = workspace.saveSearch({
        name: "RELIANCE",
        query: "earnings",
        ticker: "RELIANCE",
      });
      expect(search.ticker).toBe("RELIANCE");

      const prefs = workspace.setPreferences({
        defaultDensity: "compact",
        defaultSort: "confidence",
      });
      expect(prefs.defaultDensity).toBe("compact");
      expect(prefs.defaultSort).toBe("confidence");
    });

    it("returns No Saved Views empty messaging when none", () => {
      expect(workspace.listSavedViews()).toEqual([]);
      expect(WORKSPACE_EMPTY.noSavedViews).toBe("No Saved Views");
    });
  });

  describe("Templates", () => {
    it("applies portfolio manager template rules", () => {
      const applied = workspace.applyTemplate("portfolio_manager");
      expect(applied.rulesAdded).toBeGreaterThan(0);
      expect(applied.label).toBe("Portfolio Manager");
      expect(workspace.listRules().length).toBeGreaterThanOrEqual(
        applied.rulesAdded
      );
      expect(workspace.getPreferences().defaultFilter).toBe("portfolio");
    });

    it("exposes all template presets", () => {
      expect(buildTemplateRules("growth_investor").length).toBeGreaterThan(0);
      expect(buildTemplateRules("swing_trader").length).toBeGreaterThan(0);
      expect(buildTemplateRules("custom").length).toBe(0);
    });
  });

  describe("Workspace view", () => {
    it("builds sidebar sections and section alert ids", () => {
      const alert = makeAlert({ inPortfolio: true, priority: "Critical" });
      getAlertCenter().ingest([alert]);
      workspace.quickAction(alert.id, "favorite", { now: NOW });
      workspace.quickAction(alert.id, "pin", { now: NOW });

      const view = getAlertWorkspaceView({ section: "portfolio", now: NOW });
      expect(view.sidebar.sections.length).toBeGreaterThan(5);
      expect(view.sidebar.sections.some((s) => s.id === "portfolio")).toBe(true);
      expect(view.preferences.highlightColor).toBeTruthy();
      expect(view.templates.length).toBeGreaterThan(0);
    });

    it("returns empty states safely", () => {
      const view = getAlertWorkspaceView({ section: "favorites", now: NOW });
      expect(view.empty).toBe(true);
      expect([
        WORKSPACE_EMPTY.noFavorites,
        WORKSPACE_EMPTY.noWorkspaceAlerts,
      ]).toContain(view.emptyMessage);
      expect(WORKSPACE_EMPTY.noRules).toBe("No Rules");
      expect(WORKSPACE_EMPTY.noAutomationHistory).toBe("No Automation History");
    });
  });

  describe("Risk critical move to top", () => {
    it("applies move_to_top for critical risk via automation", () => {
      const alert = makeAlert({
        eventType: "major_miss",
        title: "Major miss",
        category: "Earnings",
        priority: "Critical",
        confidence: 88,
        inPortfolio: true,
      });
      getAlertCenter().ingest([alert]);
      workspace.addRule({
        name: "Critical risk to top",
        enabled: true,
        conditions: [
          { field: "risk", operator: "gte", value: 70 },
          { field: "portfolio", operator: "is_true", value: true },
        ],
        actions: [{ type: "move_to_top" }, { type: "assign_color", value: "#8B3A3A" }],
      });
      const run = workspace.runAutomation({ now: NOW });
      const hit = run.find((r) => r.alertId === alert.id);
      expect(hit?.actionsApplied).toContain("move_to_top");
      expect(hit?.decoration.moveToTop || hit?.decoration.pinned).toBe(true);
    });

    it("lists no rules empty constant", () => {
      expect(workspace.listRules()).toEqual([]);
      expect(WORKSPACE_EMPTY.noRules).toBe("No Rules");
    });

    it("groups and snoozes via rule actions", () => {
      const alert = makeAlert({ confidence: 91 });
      getAlertCenter().ingest([alert]);
      workspace.addRule({
        name: "Group and snooze",
        enabled: true,
        conditions: [{ field: "confidence", operator: "gte", value: 90 }],
        actions: [
          { type: "group", value: "high-confidence" },
          { type: "snooze" },
        ],
      });
      const run = workspace.runAutomation({ now: NOW });
      const hit = run.find((r) => r.alertId === alert.id);
      expect(hit?.actionsApplied).toContain("group");
      expect(hit?.decoration.groupKey).toBe("high-confidence");
    });
  });
});
