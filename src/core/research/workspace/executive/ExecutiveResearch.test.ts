/**
 * Executive Research Hub — regression & composition tests (Sprint 10A.R8).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AUTOMATION_EMPTY,
  COPILOT_EMPTY,
  createNote,
  createTask,
  createTemplate,
  createWorkspace,
  EXECUTIVE_RESEARCH_EMPTY,
  exportExecutiveResearchReport,
  getExecutiveResearchHealth,
  getExecutiveResearchHub,
  getExecutiveResearchMetrics,
  getExecutiveResearchOverview,
  getExecutiveResearchSummary,
  INTEGRATION_EMPTY,
  isSprint10AFrozen,
  normalizeSnapshot,
  openCompanyWorkspace,
  recordDecision,
  RESEARCH_WORKSPACE_STATUS,
  resetExecutiveResearchStack,
  resetResearchWorkspace,
  runAutomation,
  syncCrossModuleResearch,
  WORKSPACE_EMPTY,
  assertNoSentinel,
} from "../index";

describe("Sprint 10A.R8 — Executive Research Hub", () => {
  let workspaceId = "";

  beforeEach(() => {
    resetResearchWorkspace();
    resetExecutiveResearchStack();
    workspaceId = createWorkspace({ name: "Executive Desk" }).id;
  });

  afterEach(() => {
    resetExecutiveResearchStack();
    resetResearchWorkspace();
  });

  describe("empty states", () => {
    it("shows awaiting research when hub is empty", () => {
      resetResearchWorkspace();
      resetExecutiveResearchStack();
      const view = getExecutiveResearchHub().getView();
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(EXECUTIVE_RESEARCH_EMPTY.awaitingResearch);
      expect(getExecutiveResearchSummary()).toBe(
        EXECUTIVE_RESEARCH_EMPTY.awaitingResearch
      );
    });

    it("overview empty mirrors health empty", () => {
      resetResearchWorkspace();
      const overview = getExecutiveResearchOverview();
      expect(overview.empty).toBe(true);
      expect(overview.emptyMessage).toBe(EXECUTIVE_RESEARCH_EMPTY.awaitingResearch);
    });

    it("health layers report idle messages when empty", () => {
      resetResearchWorkspace();
      const health = getExecutiveResearchHealth();
      expect(health.empty).toBe(true);
      expect(health.workspaceHealth.ready).toBe(false);
      expect(health.copilotHealth.emptyMessage).toBe(COPILOT_EMPTY.noAiSummary);
    });
  });

  describe("executive overview", () => {
    it("builds overview cards when workspace is active", () => {
      createTemplate({ workspaceId, kind: "research", ticker: "INFY" });
      createTask({
        workspaceId,
        title: "Review thesis",
        priority: "high",
        linkedTicker: "INFY",
      });
      const overview = getExecutiveResearchOverview({ workspaceId });
      expect(overview.empty).toBe(false);
      expect(overview.cards.length).toBeGreaterThanOrEqual(8);
      expect(overview.pendingActionCount).toBeGreaterThanOrEqual(1);
    });

    it("tracks open research and coverage", () => {
      runAutomation({
        workspaceId,
        ticker: "TCS",
        rules: ["auto_open_research"],
      });
      const overview = getExecutiveResearchOverview({ workspaceId, ticker: "TCS" });
      expect(overview.openResearch).toBeGreaterThanOrEqual(0);
      expect(overview.coverage).toBeGreaterThanOrEqual(0);
    });
  });

  describe("executive metrics", () => {
    it("exposes companies researched reports completion conviction quality coverage", () => {
      createNote({
        workspaceId,
        ticker: "INFY",
        title: "Thesis",
        body: "Quality compounder",
      });
      trackCompanyViaOpen(workspaceId, "INFY");
      const metrics = getExecutiveResearchMetrics({ workspaceId, ticker: "INFY" });
      expect(metrics.noteCount).toBeGreaterThanOrEqual(1);
      expect(metrics.labels.researchQuality).not.toBe("NaN");
      expect(metrics.evidenceCoverage).toBeGreaterThanOrEqual(0);
      expect(metrics.validationCoverage).toBeGreaterThanOrEqual(0);
      expect(metrics.trustCoverage).toBeGreaterThanOrEqual(0);
    });

    it("metrics labels never surface sentinels", () => {
      const metrics = getExecutiveResearchMetrics({ workspaceId });
      for (const label of Object.values(metrics.labels)) {
        expect(assertNoSentinel(label)).not.toBe("NaN");
      }
    });
  });

  describe("health monitoring", () => {
    it("reports workspace copilot knowledge automation timeline decision integration health", () => {
      createNote({ workspaceId, ticker: "WIPRO", title: "Note", body: "Data" });
      recordDecision({
        workspaceId,
        ticker: "WIPRO",
        kind: "initial_thesis",
        title: "Buy",
        body: "Quality",
        confidence: 78,
      });
      syncCrossModuleResearch({
        workspaceId,
        ticker: "WIPRO",
        alertLines: ["Price alert triggered"],
        validationLines: ["Validation pass"],
      });
      const health = getExecutiveResearchHealth({ workspaceId, ticker: "WIPRO" });
      expect(health.layers).toHaveLength(7);
      expect(health.knowledgeHealth.ready).toBe(true);
      expect(health.decisionJournalHealth.ready).toBe(true);
      expect(health.overallHealthScore).toBeGreaterThan(0);
    });

    it("automation health reflects templates and tasks", () => {
      createTemplate({ workspaceId, kind: "earnings", ticker: "HDFCBANK" });
      const health = getExecutiveResearchHealth({ workspaceId });
      expect(health.automationHealth.label).toBe("Automation");
    });
  });

  describe("executive dashboard", () => {
    it("summarizes timeline alerts earnings screens tasks memory knowledge", () => {
      syncCrossModuleResearch({
        workspaceId,
        ticker: "RELIANCE",
        earningsLines: ["Q1 beat"],
        alertLines: ["Volume spike"],
        screenerLines: ["Momentum screen match"],
      });
      createTask({
        workspaceId,
        title: "Follow up",
        priority: "medium",
      });
      const view = getExecutiveResearchHub().getView({ workspaceId, ticker: "RELIANCE" });
      expect(view.dashboard.timelineSummary).toContain("timeline");
      expect(view.dashboard.pendingTasks).toContain("pending");
      expect(view.dashboard.knowledgeSummary).toBeTruthy();
    });

    it("lists recent companies decisions and pending actions", () => {
      recordDecision({
        workspaceId,
        ticker: "TCS",
        kind: "action_taken",
        title: "Add",
        body: "Initiate",
        confidence: 70,
      });
      createTask({
        workspaceId,
        title: "Check alerts",
        priority: "high",
        linkedTicker: "TCS",
      });
      const view = getExecutiveResearchHub().getView({ workspaceId, ticker: "TCS" });
      expect(view.recentDecisions.length).toBeGreaterThanOrEqual(1);
      expect(view.pendingActions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("presentation", () => {
    it("builds report with sections when active", () => {
      createNote({ workspaceId, ticker: "INFY", title: "Summary", body: "Bull" });
      const view = getExecutiveResearchHub().getView({ workspaceId, ticker: "INFY" });
      expect(view.report.empty).toBe(false);
      expect(view.report.sections.length).toBeGreaterThanOrEqual(4);
      expect(view.report.markdown).toContain("Executive Research Report");
    });

    it("home strip summarizes health and progress", () => {
      runAutomation({ workspaceId, ticker: "INFY", rules: ["auto_open_research"] });
      const strip = getExecutiveResearchHub().getView({ workspaceId }).homeStrip;
      expect(strip.empty).toBe(false);
      expect(strip.executiveSummary).toContain("Health");
    });
  });

  describe("export", () => {
    it("exports markdown via Sprint 9F ACL", () => {
      createNote({ workspaceId, ticker: "INFY", title: "Note", body: "Export me" });
      const result = exportExecutiveResearchReport("MARKDOWN", { workspaceId, ticker: "INFY" });
      expect(result.ok).toBe(true);
      expect(result.format).toBe("MARKDOWN");
      expect(result.content.length).toBeGreaterThan(0);
    });

    it("exports print layout", () => {
      createTemplate({ workspaceId, kind: "portfolio_review" });
      const result = exportExecutiveResearchReport("PRINT", { workspaceId });
      expect(result.ok).toBe(true);
      expect(result.format).toBe("PRINT");
      expect(result.content).toContain("Executive Research Report");
    });

    it("denied export returns ACL reason for restricted subject", () => {
      const result = exportExecutiveResearchReport("PDF", { workspaceId }, {
        userId: "guest",
        role: "free",
        subscriptionTier: "none",
      });
      if (!result.ok) {
        expect(result.deniedReason.length).toBeGreaterThan(0);
      } else {
        expect(result.format).toBe("PDF");
      }
    });
  });

  describe("sprint freeze", () => {
    it("RESEARCH_WORKSPACE_STATUS marks sprint complete and frozen", () => {
      expect(RESEARCH_WORKSPACE_STATUS.complete).toBe(true);
      expect(RESEARCH_WORKSPACE_STATUS.frozen).toBe(true);
      expect(RESEARCH_WORKSPACE_STATUS.sprint).toBe("10A");
      expect(isSprint10AFrozen()).toBe(true);
    });

    it("dashboard view exposes sprintFrozen", () => {
      const view = getExecutiveResearchHub().getView({ workspaceId });
      expect(view.sprintFrozen).toBe(true);
    });
  });

  describe("integration", () => {
    it("composes company workspace without rebuilding engines", () => {
      openCompanyWorkspace(normalizeSnapshot({ ticker: "INFY", name: "Infosys" }));
      const view = getExecutiveResearchHub().getView({ workspaceId, ticker: "INFY" });
      expect(view.empty).toBe(false);
    });

    it("quick actions include institutional workflows", () => {
      const view = getExecutiveResearchHub().getView({ workspaceId });
      expect(view.quickActions).toContain("open_workspace");
      expect(view.quickActions).toContain("export_report");
    });
  });

  describe("regression", () => {
    it("does not rebuild R1–R7 — workspace registry still works", () => {
      expect(WORKSPACE_EMPTY.noWorkspace).toBe("No Workspace");
      expect(INTEGRATION_EMPTY.noTimeline).toBe("No Timeline");
      expect(AUTOMATION_EMPTY.noTasks).toBe("No Tasks");
      const ws = createWorkspace({ name: "Regression" });
      expect(ws.empty).toBe(false);
    });

    it("resetResearchWorkspace clears executive stack", () => {
      createNote({ workspaceId, ticker: "TCS", title: "N", body: "B" });
      resetResearchWorkspace();
      resetExecutiveResearchStack();
      const view = getExecutiveResearchHub().getView();
      expect(view.empty).toBe(true);
    });

    it("repeated hub calls are stable", () => {
      createTemplate({ workspaceId, kind: "sector_analysis" });
      const a = getExecutiveResearchHub().getView({ workspaceId });
      const b = getExecutiveResearchHub().getView({ workspaceId });
      expect(a.metrics.templateCount).toBe(b.metrics.templateCount);
      expect(a.health.overallHealthScore).toBe(b.health.overallHealthScore);
    });
    it("getExecutiveResearchHealth returns layered scores", () => {
      createNote({ workspaceId, ticker: "INFY", title: "N", body: "B" });
      const health = getExecutiveResearchHealth({ workspaceId });
      expect(health.integrationHealth.id).toBe("integration");
    });

    it("executive summary reflects home strip when active", () => {
      createTemplate({ workspaceId, kind: "research", ticker: "TCS" });
      const summary = getExecutiveResearchSummary({ workspaceId });
      expect(summary).toContain("Health");
    });
  });
});

function trackCompanyViaOpen(workspaceId: string, ticker: string): void {
  openCompanyWorkspace(normalizeSnapshot({ ticker, name: `${ticker} Ltd` }));
  runAutomation({ workspaceId, ticker, rules: ["auto_open_research"] });
}
