/**
 * Workspace automation — tests (Sprint 10A.R7).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AUTOMATION_EMPTY,
  addFavorite,
  applyTemplate,
  completeTask,
  createNote,
  createTask,
  createTemplate,
  createWorkspace,
  getFavoritesView,
  getProductivityView,
  getTasksView,
  getTemplateView,
  getWorkspaceAnalytics,
  getWorkspaceShortcuts,
  listOpenTabs,
  listTemplates,
  recordRecentAction,
  resetResearchWorkspace,
  runAutomation,
  searchWorkspace,
} from "../index";

describe("Sprint 10A.R7 — Workspace Automation & Productivity", () => {
  let workspaceId = "";

  beforeEach(() => {
    resetResearchWorkspace();
    workspaceId = createWorkspace({ name: "Automation Desk" }).id;
  });

  afterEach(() => {
    resetResearchWorkspace();
  });

  describe("templates", () => {
    it("createTemplate for research earnings portfolio company sector watchlist custom", () => {
      const kinds = [
        "research",
        "earnings",
        "portfolio_review",
        "company_deep_dive",
        "sector_analysis",
        "watchlist_review",
        "custom",
      ] as const;
      const created = kinds.map((kind) =>
        createTemplate({ workspaceId, kind, ticker: "INFY" })
      );
      expect(created.every((t) => !t.empty)).toBe(true);
      expect(listTemplates({ workspaceId }).length).toBe(7);
    });

    it("applyTemplate opens tabs and applies layout preset", () => {
      const tpl = createTemplate({
        workspaceId,
        kind: "earnings",
        ticker: "TCS",
      });
      const result = applyTemplate(tpl.id, { ticker: "TCS" });
      expect(result.tabsOpened).toBeGreaterThanOrEqual(1);
      expect(listOpenTabs(workspaceId).length).toBeGreaterThanOrEqual(1);
    });

    it("empty templates uses No Templates", () => {
      const view = getTemplateView({ workspaceId: "fresh-empty" });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(AUTOMATION_EMPTY.noTemplates);
    });

    it("custom template accepts explicit tabs", () => {
      const tpl = createTemplate({
        workspaceId,
        kind: "custom",
        name: "My Flow",
        tabs: ["research", "alerts", "portfolio"],
      });
      expect(tpl.tabs).toEqual(["research", "alerts", "portfolio"]);
    });
  });

  describe("automation", () => {
    it("runAutomation auto-opens research earnings alerts and loads notes", () => {
      createNote({ workspaceId, ticker: "INFY", body: "Thesis note" });
      const result = runAutomation({
        workspaceId,
        ticker: "INFY",
        rules: [
          "auto_open_research",
          "auto_open_earnings",
          "auto_open_alerts",
          "auto_load_notes",
          "auto_save_workspace",
        ],
      });
      expect(result.empty).toBe(false);
      expect(result.tabsOpened).toBeGreaterThanOrEqual(3);
      expect(result.notesLoaded).toBeGreaterThanOrEqual(1);
      expect(result.saved).toBe(true);
      expect(result.actions.length).toBeGreaterThanOrEqual(4);
    });

    it("runAutomation with template applies workflow", () => {
      const tpl = createTemplate({
        workspaceId,
        kind: "company_deep_dive",
        ticker: "RELIANCE",
      });
      const result = runAutomation({
        workspaceId,
        ticker: "RELIANCE",
        templateId: tpl.id,
        rules: ["auto_load_portfolio", "auto_load_watchlist"],
      });
      expect(result.empty).toBe(false);
      expect(result.actions.some((a) => a.includes("template"))).toBe(true);
    });

    it("auto_load_portfolio and auto_load_watchlist open tabs", () => {
      const result = runAutomation({
        workspaceId,
        rules: ["auto_load_portfolio", "auto_load_watchlist"],
      });
      expect(result.tabsOpened).toBeGreaterThanOrEqual(2);
    });

    it("empty automation uses No Automation Rules", () => {
      const result = runAutomation({ workspaceId: "" });
      expect(result.empty).toBe(true);
      expect(result.emptyMessage).toBe(AUTOMATION_EMPTY.noAutomationRules);
    });
  });

  describe("favorites", () => {
    it("addFavorite for company workspace template layout research", () => {
      const kinds = [
        addFavorite({
          workspaceId,
          kind: "company",
          label: "Infosys",
          target: "INFY",
          ticker: "INFY",
          pinned: true,
        }),
        addFavorite({
          workspaceId,
          kind: "workspace",
          label: "Desk",
          target: workspaceId,
        }),
        addFavorite({
          workspaceId,
          kind: "template",
          label: "Earnings flow",
          target: "earnings",
        }),
        addFavorite({
          workspaceId,
          kind: "layout",
          label: "Research layout",
          target: "research",
          pinned: true,
        }),
        addFavorite({
          workspaceId,
          kind: "research",
          label: "AI desk",
          target: "desk",
        }),
      ];
      expect(kinds.every((f) => !f.empty)).toBe(true);
      const view = getFavoritesView({ workspaceId });
      expect(view.empty).toBe(false);
      expect(view.favorites.length).toBe(5);
    });

    it("pinned favorites filter works", () => {
      addFavorite({
        workspaceId,
        kind: "company",
        label: "INFY",
        target: "INFY",
        pinned: true,
      });
      addFavorite({
        workspaceId,
        kind: "company",
        label: "TCS",
        target: "TCS",
      });
      const pinned = getFavoritesView({ workspaceId }).favorites.filter((f) => f.pinned);
      expect(pinned.length).toBe(1);
    });

    it("empty favorites uses No Favorites", () => {
      const view = getFavoritesView({ workspaceId: "none" });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(AUTOMATION_EMPTY.noFavorites);
    });
  });

  describe("tasks", () => {
    it("createTask and completeTask with priority due date links", () => {
      const task = createTask({
        workspaceId,
        title: "Review INFY earnings",
        body: "Check margin guidance",
        priority: "high",
        dueDate: "2026-07-20",
        linkedTicker: "INFY",
        linkedResearch: "earnings",
      });
      expect(task.empty).toBe(false);
      expect(task.status).toBe("pending");

      const pending = getTasksView({ workspaceId }).pending;
      expect(pending[0]?.priority).toBe("high");
      expect(pending[0]?.linkedTicker).toBe("INFY");

      const done = completeTask(task.id);
      expect(done.status).toBe("completed");
      expect(done.completedAt).not.toBe("");

      const view = getTasksView({ workspaceId });
      expect(view.pending.length).toBe(0);
      expect(view.completed.length).toBe(1);
    });

    it("empty tasks uses No Tasks", () => {
      const view = getTasksView({ workspaceId: "none" });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(AUTOMATION_EMPTY.noTasks);
    });

    it("createTask rejects empty title", () => {
      const task = createTask({ workspaceId, title: "" });
      expect(task.empty).toBe(true);
    });
  });

  describe("analytics", () => {
    it("getWorkspaceAnalytics tracks productivity and completion rate", () => {
      const task = createTask({ workspaceId, title: "Checklist item" });
      completeTask(task.id);
      runAutomation({ workspaceId, rules: ["auto_open_research"] });
      applyTemplate(
        createTemplate({ workspaceId, kind: "research" }).id
      );

      const analytics = getWorkspaceAnalytics({ workspaceId });
      expect(analytics.empty).toBe(false);
      expect(analytics.tasksCompleted).toBe(1);
      expect(analytics.completionRate).toBe(100);
      expect(analytics.templatesApplied).toBeGreaterThanOrEqual(1);
      expect(analytics.automationsRun).toBeGreaterThanOrEqual(1);
      expect(analytics.researchProductivity).toBeGreaterThan(0);
    });

    it("session duration is tracked", () => {
      const analytics = getWorkspaceAnalytics({ workspaceId });
      expect(analytics.sessionDurationMinutes).toBeGreaterThanOrEqual(1);
    });
  });

  describe("productivity", () => {
    it("exposes keyboard shortcuts and command palette routes", () => {
      const shortcuts = getWorkspaceShortcuts();
      expect(shortcuts.length).toBeGreaterThanOrEqual(5);
      expect(shortcuts.some((s) => s.action === "command_palette")).toBe(true);
    });

    it("searchWorkspace finds tabs templates favorites tasks", () => {
      createTemplate({ workspaceId, kind: "research", name: "Research Flow" });
      addFavorite({
        workspaceId,
        kind: "company",
        label: "TCS",
        target: "TCS",
        ticker: "TCS",
      });
      createTask({ workspaceId, title: "Pending review" });
      runAutomation({ workspaceId, rules: ["auto_open_research"] });

      const results = searchWorkspace({ workspaceId, query: "research" });
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("recordRecentAction tracks quick switch history", () => {
      recordRecentAction("Opened INFY", "/company/INFY");
      const view = getProductivityView({ workspaceId });
      expect(view.recentActions.length).toBeGreaterThanOrEqual(1);
    });

    it("global search returns shortcut routes", () => {
      const results = searchWorkspace({ query: "portfolio" });
      expect(results.some((r) => r.route === "/portfolio")).toBe(true);
    });

    it("productivity view includes shortcuts and analytics", () => {
      const view = getProductivityView({ workspaceId });
      expect(view.shortcuts.length).toBeGreaterThanOrEqual(5);
      expect(view.analytics.empty).toBe(false);
    });
  });

  describe("presentation", () => {
    it("AUTOMATION_EMPTY copy is institutional", () => {
      expect(AUTOMATION_EMPTY.noTemplates).toBe("No Templates");
      expect(AUTOMATION_EMPTY.noFavorites).toBe("No Favorites");
      expect(AUTOMATION_EMPTY.noTasks).toBe("No Tasks");
      expect(AUTOMATION_EMPTY.awaitingWorkspace).toBe("Awaiting Workspace");
      expect(AUTOMATION_EMPTY.noAutomationRules).toBe("No Automation Rules");
    });
  });

  describe("regression", () => {
    it("public APIs never throw on bad input", () => {
      expect(() => createTemplate({ workspaceId: "" })).not.toThrow();
      expect(() => applyTemplate("")).not.toThrow();
      expect(() => runAutomation({ workspaceId: "" })).not.toThrow();
      expect(() =>
        addFavorite({
          workspaceId: "",
          kind: "company",
          label: "x",
          target: "y",
        })
      ).not.toThrow();
      expect(() => createTask({ workspaceId: "", title: "" })).not.toThrow();
      expect(() => completeTask("")).not.toThrow();
      expect(() => getWorkspaceAnalytics()).not.toThrow();
    });

    it("does not rebuild R1–R6 — workspace still creatable", () => {
      const ws = createWorkspace({ name: "Still Works" });
      expect(ws.empty).toBe(false);
      createTask({ workspaceId: ws.id, title: "Task" });
      expect(getTasksView({ workspaceId: ws.id }).tasks.length).toBe(1);
    });

    it("resetResearchWorkspace clears automation stores", () => {
      createTask({ workspaceId, title: "temp" });
      addFavorite({
        workspaceId,
        kind: "company",
        label: "X",
        target: "X",
      });
      resetResearchWorkspace();
      expect(getTasksView({ workspaceId }).empty).toBe(true);
      expect(getFavoritesView({ workspaceId }).empty).toBe(true);
      expect(getTemplateView({ workspaceId }).empty).toBe(true);
    });
  });
});
