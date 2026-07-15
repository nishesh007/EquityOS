/**
 * Institutional Research Workspace — tests (Sprint 10A.R1).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  WORKSPACE_EMPTY,
  WORKSPACE_PANELS,
  assertMetricLabelsSafe,
  assertNoSentinelText,
  archiveSession,
  archiveWorkspace,
  closeSession,
  closeWorkspace,
  createLayout,
  createSession,
  createWorkspace,
  deleteSession,
  deleteWorkspace,
  duplicateSession,
  emptyLayout,
  emptyResearchWorkspaceView,
  emptySession,
  emptyWorkspaceCard,
  emptyWorkspaceMetrics,
  emptyWorkspaceRecord,
  favoriteSession,
  getActiveWorkspace,
  getCacheUsage,
  getLayout,
  getMemoryUsage,
  getResearchWorkspace,
  getResearchWorkspaceView,
  getSession,
  getWorkspaceMetrics,
  listRecentWorkspaces,
  listSessions,
  listWorkspaces,
  normalizeSession,
  normalizeWorkspaceActivity,
  normalizeWorkspaceCard,
  normalizeWorkspaceRecord,
  openSession,
  openWorkspace,
  pinSession,
  recordExecutionTime,
  renameSession,
  renameWorkspace,
  resetResearchWorkspace,
  resolvePanelRoute,
  restoreSession,
  restoreWorkspace,
  safeWorkspaceNumber,
  safeWorkspaceText,
  sessionToCard,
  setActivePanel,
  workspaceToCard,
} from "./index";

describe("Sprint 10A.R1 — Institutional Research Workspace", () => {
  beforeEach(() => {
    resetResearchWorkspace();
  });

  afterEach(() => {
    resetResearchWorkspace();
  });

  describe("workspace lifecycle", () => {
    it("createWorkspace returns a non-empty active workspace", () => {
      const ws = createWorkspace({ name: "Alpha Desk", ticker: "INFY" });
      expect(ws.empty).toBe(false);
      expect(ws.status).toBe("active");
      expect(ws.name).toBe("Alpha Desk");
      expect(ws.sessionIds.length).toBe(1);
      expect(getActiveWorkspace()?.id).toBe(ws.id);
    });

    it("openWorkspace / closeWorkspace round-trip", () => {
      const ws = createWorkspace({ name: "Beta" });
      closeWorkspace(ws.id);
      expect(listWorkspaces().find((w) => w.id === ws.id)?.status).toBe("closed");
      expect(getActiveWorkspace()).toBeNull();

      const opened = openWorkspace(ws.id);
      expect(opened.status).toBe("active");
      expect(getActiveWorkspace()?.id).toBe(ws.id);
    });

    it("renameWorkspace updates name", () => {
      const ws = createWorkspace({ name: "Old" });
      const renamed = renameWorkspace(ws.id, "New Desk");
      expect(renamed.name).toBe("New Desk");
      expect(listWorkspaces().find((w) => w.id === ws.id)?.name).toBe("New Desk");
    });

    it("archiveWorkspace / restoreWorkspace lifecycle", () => {
      const ws = createWorkspace({ name: "Archive Me" });
      const archived = archiveWorkspace(ws.id);
      expect(archived.status).toBe("archived");
      expect(listWorkspaces().some((w) => w.id === ws.id)).toBe(false);
      expect(
        listWorkspaces({ includeArchived: true }).some((w) => w.id === ws.id)
      ).toBe(true);

      const restored = restoreWorkspace(ws.id);
      expect(restored.status).toBe("active");
      expect(getActiveWorkspace()?.id).toBe(ws.id);
    });

    it("deleteWorkspace soft-deletes", () => {
      const ws = createWorkspace({ name: "Gone" });
      expect(deleteWorkspace(ws.id)).toBe(true);
      expect(listWorkspaces().some((w) => w.id === ws.id)).toBe(false);
      expect(
        listWorkspaces({ includeDeleted: true, includeArchived: true }).some(
          (w) => w.id === ws.id && w.status === "deleted"
        )
      ).toBe(true);
    });

    it("listWorkspaces returns multiple workspaces", () => {
      createWorkspace({ name: "One" });
      createWorkspace({ name: "Two" });
      expect(listWorkspaces().length).toBe(2);
    });

    it("openWorkspace on missing id returns No Workspace empty", () => {
      const missing = openWorkspace("does-not-exist");
      expect(missing.empty).toBe(true);
      expect(missing.emptyMessage).toBe(WORKSPACE_EMPTY.noWorkspace);
    });
  });

  describe("session management", () => {
    it("open / close / duplicate / pin / favorite / rename", () => {
      const ws = createWorkspace({ name: "Session Desk", ticker: "TCS" });
      const engine = getResearchWorkspace();
      const sessionId = ws.activeSessionId!;

      expect(engine.openSession(sessionId)?.status).toBe("open");
      expect(engine.closeSession(sessionId)?.status).toBe("closed");
      expect(engine.openSession(sessionId)?.status).toBe("open");

      const dup = engine.duplicateSession(sessionId);
      expect(dup).not.toBeNull();
      expect(dup!.name).toContain("copy");

      expect(engine.pinSession(sessionId, true)?.pinned).toBe(true);
      expect(engine.favoriteSession(sessionId, true)?.favorite).toBe(true);
      expect(engine.renameSession(sessionId, "Primary Note")?.name).toBe(
        "Primary Note"
      );
    });

    it("archive / restore / delete session", () => {
      const ws = createWorkspace({ name: "Sess" });
      const engine = getResearchWorkspace();
      const id = ws.activeSessionId!;

      expect(engine.archiveSession(id)?.status).toBe("archived");
      expect(listSessions({ workspaceId: ws.id }).some((s) => s.id === id)).toBe(
        false
      );
      expect(
        listSessions({ workspaceId: ws.id, includeArchived: true }).some(
          (s) => s.id === id
        )
      ).toBe(true);

      expect(engine.restoreSession(id)?.status).toBe("open");
      expect(engine.deleteSession(id)).toBe(true);
      expect(getSession(id)).toBeNull();
    });

    it("createResearchSession attaches to workspace", () => {
      const ws = createWorkspace({ name: "Multi" });
      const engine = getResearchWorkspace();
      const session = engine.createResearchSession({
        workspaceId: ws.id,
        name: "Secondary",
        ticker: "HAL",
      });
      expect(session.empty).toBe(false);
      expect(
        listWorkspaces().find((w) => w.id === ws.id)?.sessionIds
      ).toContain(session.id);
    });

    it("recordResearch increments research count", () => {
      const ws = createWorkspace({ name: "Count" });
      const engine = getResearchWorkspace();
      const updated = engine.recordResearch(ws.activeSessionId!);
      expect(updated?.researchCount).toBe(1);
    });

    it("standalone session helpers work", () => {
      const session = createSession({
        workspaceId: "ws-manual",
        name: "Manual",
        ticker: "BEL",
      });
      expect(session.empty).toBe(false);
      expect(pinSession(session.id, true)?.pinned).toBe(true);
      expect(favoriteSession(session.id, true)?.favorite).toBe(true);
      expect(renameSession(session.id, "Renamed")?.name).toBe("Renamed");
      expect(closeSession(session.id)?.status).toBe("closed");
      expect(openSession(session.id)?.status).toBe("open");
      expect(duplicateSession(session.id)?.name).toContain("copy");
      expect(archiveSession(session.id)?.status).toBe("archived");
      expect(restoreSession(session.id)?.status).toBe("open");
      expect(deleteSession(session.id)).toBe(true);
    });
  });

  describe("registry", () => {
    it("tracks active and recent workspaces", () => {
      const a = createWorkspace({ name: "A" });
      const b = createWorkspace({ name: "B" });
      expect(getActiveWorkspace()?.id).toBe(b.id);
      const recent = listRecentWorkspaces();
      expect(recent[0]?.id).toBe(b.id);
      expect(recent.some((w) => w.id === a.id)).toBe(true);
    });

    it("close clears active workspace", () => {
      const ws = createWorkspace({ name: "Active" });
      closeWorkspace(ws.id);
      expect(getActiveWorkspace()).toBeNull();
    });
  });

  describe("metrics", () => {
    it("getWorkspaceMetrics reflects open sessions and pinned", () => {
      expect(getWorkspaceMetrics().empty).toBe(true);
      expect(getWorkspaceMetrics().emptyMessage).toBe(WORKSPACE_EMPTY.noWorkspace);

      const ws = createWorkspace({ name: "Metrics" });
      const engine = getResearchWorkspace();
      engine.pinSession(ws.activeSessionId!, true);
      engine.recordResearch(ws.activeSessionId!);

      const metrics = getWorkspaceMetrics();
      expect(metrics.empty).toBe(false);
      expect(metrics.openSessions).toBeGreaterThanOrEqual(1);
      expect(metrics.pinned).toBeGreaterThanOrEqual(1);
      expect(metrics.researchCount).toBeGreaterThanOrEqual(1);
      expect(metrics.workspaceCount).toBe(1);
      expect(assertMetricLabelsSafe(metrics)).toBe(true);
    });

    it("records execution time and cache/memory usage", () => {
      createWorkspace({ name: "Perf" });
      recordExecutionTime(42);
      const metrics = getWorkspaceMetrics();
      expect(metrics.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(getCacheUsage()).toBeGreaterThan(0);
      expect(getMemoryUsage()).toBeGreaterThan(0);
      expect(emptyWorkspaceMetrics().labels.workspaces).toBe(
        WORKSPACE_EMPTY.noWorkspace
      );
    });
  });

  describe("caching and layout", () => {
    it("creates persistent cached layout with all panels", () => {
      const ws = createWorkspace({ name: "Layout", ticker: "INFY" });
      const layout = getLayout(ws.id);
      expect(layout).not.toBeNull();
      expect(layout!.cached).toBe(true);
      expect(layout!.panels.length).toBe(WORKSPACE_PANELS.length);
      expect(layout!.panels.every((p) => p.visible)).toBe(true);
    });

    it("setActivePanel and persist layout", () => {
      const ws = createWorkspace({ name: "Panels" });
      const engine = getResearchWorkspace();
      const layout = engine.setActivePanel(ws.id, "earnings");
      expect(layout.activePanel).toBe("earnings");

      const toggled = engine.togglePanel(ws.id, "notes", false);
      expect(toggled.panels.find((p) => p.id === "notes")?.visible).toBe(false);
    });

    it("createLayout cache survives getLayout", () => {
      const layout = createLayout("cache-ws", { ticker: "TCS" });
      expect(layout.empty).toBe(false);
      expect(getLayout("cache-ws")?.workspaceId).toBe("cache-ws");
      expect(emptyLayout().emptyMessage).toBe(WORKSPACE_EMPTY.noWorkspace);
    });
  });

  describe("presentation", () => {
    it("getResearchWorkspaceView empty before create", () => {
      const view = getResearchWorkspaceView();
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(WORKSPACE_EMPTY.noWorkspace);
      expect(view.surfaceHints.research).toBe("/research");
      expect(view.surfaceHints.dashboard).toBe("/");
      expect(view.surfaceHints.company).toBe("/company");
      expect(view.surfaceHints.results).toBe("/results");
    });

    it("getResearchWorkspaceView populates after create + research", () => {
      const ws = createWorkspace({ name: "View Desk", ticker: "HAL" });
      const engine = getResearchWorkspace();
      engine.recordResearch(ws.activeSessionId!);
      const view = getResearchWorkspaceView();
      expect(view.empty).toBe(false);
      expect(view.active?.id).toBe(ws.id);
      expect(view.sessions.length).toBeGreaterThanOrEqual(1);
      expect(view.panels.length).toBeGreaterThan(0);
      expect(view.recentActivity.some((a) => a.action === "create_workspace")).toBe(
        true
      );
    });

    it("normalizers never surface sentinel strings", () => {
      expect(safeWorkspaceText(null, "fallback")).toBe("fallback");
      expect(safeWorkspaceText("null", "fallback")).toBe("fallback");
      expect(safeWorkspaceNumber(NaN, 3)).toBe(3);
      expect(assertNoSentinelText("ok")).toBe(true);
      expect(assertNoSentinelText("undefined")).toBe(false);

      const card = normalizeWorkspaceCard({ id: "c1", title: "Title" });
      expect(card.empty).toBe(false);
      expect(assertNoSentinelText(card.title)).toBe(true);

      const activity = normalizeWorkspaceActivity({
        id: "a1",
        action: "open",
        target: "x",
      });
      expect(activity.empty).toBe(false);

      expect(emptyWorkspaceCard().emptyMessage).toBe(WORKSPACE_EMPTY.noWorkspace);
      expect(emptyResearchWorkspaceView().empty).toBe(true);
      expect(emptySession().emptyMessage).toBe(WORKSPACE_EMPTY.noActiveResearch);
      expect(emptyWorkspaceRecord().emptyMessage).toBe(WORKSPACE_EMPTY.noWorkspace);
    });

    it("workspaceToCard and sessionToCard map domains", () => {
      const ws = createWorkspace({ name: "Card Desk" });
      const card = workspaceToCard(ws, "active");
      expect(card.kind).toBe("active");
      expect(card.empty).toBe(false);

      const session = getSession(ws.activeSessionId!);
      expect(session).not.toBeNull();
      const sCard = sessionToCard(session!);
      expect(sCard.kind).toBe("session");
    });

    it("normalizeSession and normalizeWorkspaceRecord handle partials", () => {
      expect(normalizeSession(null).empty).toBe(true);
      expect(normalizeWorkspaceRecord(null).empty).toBe(true);
      const session = normalizeSession({
        id: "s1",
        workspaceId: "w1",
        name: "N",
        status: "open",
      });
      expect(session.empty).toBe(false);
    });
  });

  describe("empty states", () => {
    it("exposes institutional empty copy", () => {
      expect(WORKSPACE_EMPTY.noWorkspace).toBe("No Workspace");
      expect(WORKSPACE_EMPTY.noActiveResearch).toBe("No Active Research");
      expect(WORKSPACE_EMPTY.noRecentSessions).toBe("No Recent Sessions");
      expect(WORKSPACE_EMPTY.awaitingResearch).toBe("Awaiting Research");
    });

    it("view uses No Active Research when all closed", () => {
      const ws = createWorkspace({ name: "Close Active" });
      closeWorkspace(ws.id);
      const view = getResearchWorkspaceView();
      expect(view.active).toBeNull();
      expect(
        view.emptyMessage === WORKSPACE_EMPTY.noActiveResearch ||
          view.emptyMessage === WORKSPACE_EMPTY.noRecentSessions ||
          !view.empty
      ).toBe(true);
    });
  });

  describe("panel composition routes", () => {
    it("resolvePanelRoute reuses existing platform paths", () => {
      expect(resolvePanelRoute("research", "INFY")).toContain("/ai/research");
      expect(resolvePanelRoute("company", "INFY")).toContain("/company/INFY");
      expect(resolvePanelRoute("earnings", "INFY")).toContain("/results");
      expect(resolvePanelRoute("alerts", "INFY")).toContain("/results");
      expect(resolvePanelRoute("screener", "INFY")).toContain("/screener");
      expect(resolvePanelRoute("portfolio")).toBe("/portfolio");
      expect(resolvePanelRoute("opportunity")).toBe("/opportunities");
      expect(WORKSPACE_PANELS).toHaveLength(11);
    });
  });

  describe("regression", () => {
    it("public API surface is callable and never throws on bad input", () => {
      expect(() => createWorkspace(null)).not.toThrow();
      expect(() => openWorkspace("")).not.toThrow();
      expect(() => closeWorkspace("")).not.toThrow();
      expect(() => renameWorkspace("", "")).not.toThrow();
      expect(() => archiveWorkspace("")).not.toThrow();
      expect(() => restoreWorkspace("")).not.toThrow();
      expect(() => listWorkspaces()).not.toThrow();
      expect(() => getWorkspaceMetrics()).not.toThrow();
      expect(() => getResearchWorkspaceView()).not.toThrow();
    });

    it("does not rebuild sprint 9 modules — surface hints stay thin", () => {
      const view = getResearchWorkspaceView();
      expect(view.surfaceHints).toEqual({
        research: "/research",
        dashboard: "/",
        company: "/company",
        results: "/results",
      });
    });

    it("resetResearchWorkspace clears registry and metrics", () => {
      createWorkspace({ name: "Temp" });
      resetResearchWorkspace();
      expect(listWorkspaces()).toEqual([]);
      expect(getWorkspaceMetrics().empty).toBe(true);
      expect(getResearchWorkspaceView().empty).toBe(true);
    });
  });
});
