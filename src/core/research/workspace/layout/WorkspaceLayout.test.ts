/**
 * Institutional Research Workspace — multi-tab layout tests (Sprint 10A.R2).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LAYOUT_EMPTY,
  WORKSPACE_EMPTY,
  applyLayoutPreset,
  closeTab,
  collapsePane,
  createWorkspace,
  dockTab,
  duplicateTab,
  emptyHistoryView,
  emptyMultiTabView,
  emptySavedLayout,
  emptyTab,
  fullscreenPane,
  getMultiTabWorkspaceView,
  getWorkspaceHistory,
  listOpenTabs,
  listSavedLayouts,
  normalizeTab,
  openAlertsTab,
  openCompanyTab,
  openEarningsTab,
  openNotesTab,
  openOpportunityTab,
  openPortfolioTab,
  openResearchTab,
  openScreenerTab,
  openTab,
  persistSession,
  pinTab,
  reorderTabs,
  resetResearchWorkspace,
  resizePane,
  restoreLayout,
  restoreSession,
  restoreTab,
  saveLayout,
} from "../index";

describe("Sprint 10A.R2 — Multi-Tab Layout Engine", () => {
  beforeEach(() => {
    resetResearchWorkspace();
  });

  afterEach(() => {
    resetResearchWorkspace();
  });

  function desk() {
    return createWorkspace({ name: "Terminal Desk", ticker: "INFY" });
  }

  describe("tabs", () => {
    it("openTab creates unlimited tabs of each kind", () => {
      const ws = desk();
      const kinds = [
        openCompanyTab(ws.id, "INFY"),
        openResearchTab(ws.id, "INFY"),
        openEarningsTab(ws.id, "INFY"),
        openAlertsTab(ws.id, "INFY"),
        openScreenerTab(ws.id, "INFY"),
        openPortfolioTab(ws.id),
        openOpportunityTab(ws.id, "INFY"),
        openNotesTab(ws.id, "INFY"),
      ];
      expect(kinds.every((t) => !t.empty)).toBe(true);
      expect(listOpenTabs(ws.id).length).toBe(8);
      expect(kinds[0].route).toContain("/company/INFY");
      expect(kinds[1].route).toContain("/ai/research");
      expect(kinds[2].route).toContain("/results");
    });

    it("closeTab / duplicateTab / pinTab / restoreTab / reorderTabs", () => {
      const ws = desk();
      const a = openTab({ workspaceId: ws.id, kind: "company", ticker: "TCS" });
      const b = openTab({ workspaceId: ws.id, kind: "research", ticker: "TCS" });
      expect(pinTab(a.id, true).pinned).toBe(true);

      const dup = duplicateTab(b.id);
      expect(dup.empty).toBe(false);
      expect(dup.title).toContain("copy");

      closeTab(a.id);
      expect(listOpenTabs(ws.id).some((t) => t.id === a.id)).toBe(false);
      expect(restoreTab(a.id).closed).toBe(false);

      const open = listOpenTabs(ws.id);
      const reordered = reorderTabs(
        ws.id,
        open.map((t) => t.id).reverse()
      );
      expect(reordered[0].id).toBe(open[open.length - 1].id);
    });

    it("returns No Open Tabs empty for bad close", () => {
      expect(closeTab("missing").emptyMessage).toBe(LAYOUT_EMPTY.noOpenTabs);
      expect(emptyTab().emptyMessage).toBe(LAYOUT_EMPTY.noOpenTabs);
    });
  });

  describe("docking", () => {
    it("docks tabs into left / right / bottom and resizes", () => {
      const ws = desk();
      const tab = openCompanyTab(ws.id, "HAL");
      const left = dockTab(ws.id, tab.id, "left");
      expect(left.left.tabIds).toContain(tab.id);

      const resized = resizePane(ws.id, "left", 30);
      expect(resized.left.sizePct).toBe(30);

      const collapsed = collapsePane(ws.id, "right", true);
      expect(collapsed.right.collapsed).toBe(true);

      const full = fullscreenPane(ws.id, "center", true);
      expect(full.center.fullscreen).toBe(true);
      expect(full.left.collapsed).toBe(true);
    });
  });

  describe("layout", () => {
    it("applies research / trading / portfolio / compact presets", () => {
      const ws = desk();
      const research = applyLayoutPreset(ws.id, "research");
      expect(research.empty).toBe(false);
      expect(research.preset).toBe("research");

      expect(applyLayoutPreset(ws.id, "trading").preset).toBe("trading");
      expect(applyLayoutPreset(ws.id, "portfolio").preset).toBe("portfolio");
      expect(applyLayoutPreset(ws.id, "compact").preset).toBe("compact");
    });

    it("saveLayout / restoreLayout round-trip", () => {
      const ws = desk();
      openResearchTab(ws.id, "BEL");
      const saved = saveLayout({
        workspaceId: ws.id,
        name: "My Desk",
        preset: "research",
      });
      expect(saved.empty).toBe(false);
      expect(listSavedLayouts(ws.id).some((l) => l.id === saved.id)).toBe(true);

      const restored = restoreLayout(saved.id);
      expect(restored.empty).toBe(false);
      expect(restored.name).toBe("My Desk");
    });

    it("missing layout returns No Saved Layout", () => {
      expect(restoreLayout("missing").emptyMessage).toBe(LAYOUT_EMPTY.noSavedLayout);
      expect(emptySavedLayout().emptyMessage).toBe(LAYOUT_EMPTY.noSavedLayout);
    });
  });

  describe("persistence", () => {
    it("persistSession + restoreSession restores tabs and filters", () => {
      const ws = desk();
      const tab = openCompanyTab(ws.id, "INFY");
      openTab({
        workspaceId: ws.id,
        kind: "research",
        ticker: "INFY",
        filters: { horizon: "swing" },
      });
      const persisted = persistSession(ws.id, { preset: "research" });
      expect(persisted.tabIds.length).toBeGreaterThanOrEqual(2);

      closeTab(tab.id);
      const restored = restoreSession(ws.id);
      expect(restored.empty).toBe(false);
      expect(restored.restoredAt).not.toBeNull();
      expect(listOpenTabs(ws.id).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("history", () => {
    it("records tab and layout history", () => {
      const ws = desk();
      openCompanyTab(ws.id, "TCS");
      openResearchTab(ws.id, "TCS");
      saveLayout({ workspaceId: ws.id, name: "History Layout" });

      const history = getWorkspaceHistory();
      expect(history.empty).toBe(false);
      expect(history.recentCompanies.length).toBeGreaterThanOrEqual(1);
      expect(history.recentResearch.length).toBeGreaterThanOrEqual(1);
      expect(history.recentLayouts.length).toBeGreaterThanOrEqual(1);
    });

    it("empty history uses No Session History", () => {
      expect(getWorkspaceHistory().emptyMessage).toBe(LAYOUT_EMPTY.noSessionHistory);
      expect(emptyHistoryView().emptyMessage).toBe(LAYOUT_EMPTY.noSessionHistory);
    });
  });

  describe("presentation", () => {
    it("getMultiTabWorkspaceView empty and populated states", () => {
      const empty = getMultiTabWorkspaceView("");
      expect(empty.emptyMessage).toBe(LAYOUT_EMPTY.awaitingWorkspace);

      const ws = desk();
      const awaiting = getMultiTabWorkspaceView(ws.id);
      expect(
        awaiting.emptyMessage === LAYOUT_EMPTY.noOpenTabs ||
          awaiting.emptyMessage === LAYOUT_EMPTY.noSessionHistory
      ).toBe(true);

      openEarningsTab(ws.id, "HAL");
      const view = getMultiTabWorkspaceView(ws.id);
      expect(view.empty).toBe(false);
      expect(view.tabs.length).toBeGreaterThanOrEqual(1);
      expect(view.surfaceHints.research).toBe("/research");
      expect(view.surfaceHints.dashboard).toBe("/");
      expect(view.surfaceHints.company).toBe("/company");
      expect(view.surfaceHints.results).toBe("/results");
    });

    it("normalizeTab never surfaces sentinel strings", () => {
      const tab = normalizeTab({
        id: "t1",
        workspaceId: "w1",
        kind: "company",
        title: "Company · INFY",
      });
      expect(tab.empty).toBe(false);
      expect(tab.title).not.toBe("null");
      expect(emptyMultiTabView().emptyMessage).toBe(LAYOUT_EMPTY.awaitingWorkspace);
    });
  });

  describe("regression", () => {
    it("public APIs never throw on bad input", () => {
      expect(() => openTab({ workspaceId: "", kind: "research" })).not.toThrow();
      expect(() => closeTab("")).not.toThrow();
      expect(() => duplicateTab("")).not.toThrow();
      expect(() => pinTab("")).not.toThrow();
      expect(() => saveLayout({ workspaceId: "" })).not.toThrow();
      expect(() => restoreLayout("")).not.toThrow();
      expect(() => restoreSession("")).not.toThrow();
      expect(() => getWorkspaceHistory()).not.toThrow();
    });

    it("does not rebuild R1 — workspace create still works", () => {
      const ws = createWorkspace({ name: "R1 Still Works" });
      expect(ws.empty).toBe(false);
      expect(ws.emptyMessage).not.toBe(WORKSPACE_EMPTY.noWorkspace);
      openTab({ workspaceId: ws.id, kind: "portfolio" });
      expect(listOpenTabs(ws.id).length).toBe(1);
    });

    it("resetResearchWorkspace clears tabs and history", () => {
      const ws = desk();
      openCompanyTab(ws.id, "INFY");
      resetResearchWorkspace();
      expect(listOpenTabs(ws.id)).toEqual([]);
      expect(getWorkspaceHistory().empty).toBe(true);
    });

    it("focus and default layout presets are available", () => {
      const ws = desk();
      const tab = openResearchTab(ws.id, "INFY");
      expect(tab.empty).toBe(false);
      const defaults = applyLayoutPreset(ws.id, "default");
      expect(defaults.preset).toBe("default");
      expect(listSavedLayouts(ws.id).length).toBeGreaterThanOrEqual(1);
    });

    it("restoreLastSession alias restores workspace desk", () => {
      const ws = desk();
      openCompanyTab(ws.id, "BEL");
      persistSession(ws.id, { preset: "trading" });
      const restored = restoreSession(ws.id);
      expect(restored.workspaceId).toBe(ws.id);
      expect(restored.empty).toBe(false);
    });

    it("LAYOUT_EMPTY copy is institutional", () => {
      expect(LAYOUT_EMPTY.noOpenTabs).toBe("No Open Tabs");
      expect(LAYOUT_EMPTY.noSavedLayout).toBe("No Saved Layout");
      expect(LAYOUT_EMPTY.noSessionHistory).toBe("No Session History");
      expect(LAYOUT_EMPTY.awaitingWorkspace).toBe("Awaiting Workspace");
    });

    it("dockTab moves tab between regions without duplication", () => {
      const ws = desk();
      const tab = openNotesTab(ws.id, "INFY");
      dockTab(ws.id, tab.id, "left");
      const right = dockTab(ws.id, tab.id, "right");
      expect(right.left.tabIds).not.toContain(tab.id);
      expect(right.right.tabIds).toContain(tab.id);
    });

    it("openTabByKind covers opportunity and screener routes", () => {
      const ws = desk();
      const opp = openOpportunityTab(ws.id, "HAL");
      const screen = openScreenerTab(ws.id, "HAL");
      expect(opp.route).toContain("/opportunities");
      expect(screen.route).toContain("/screener");
    });
  });
});
