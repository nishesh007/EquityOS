/**
 * Institutional Workspace — tests (Sprint 10B.R7).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WatchlistItemSnapshot } from "@/src/core/alerts/intelligence/AlertPresentationModels";
import { createWatchlist, ensureDefaultWatchlists, resetInstitutionalWatchlists } from "../index";
import {
  WORKSPACE_HISTORY_KINDS,
  WORKSPACE_PRODUCTIVITY_EMPTY,
  QUICK_ACTIONS,
  archiveSavedWatchlist,
  cloneSavedWatchlist,
  compareWorkspaceWatchlists,
  duplicateWatchlist,
  emptyInstitutionalWorkspace,
  getInstitutionalWorkspace,
  getInstitutionalWorkspaceHealth,
  getProductivityView,
  getWorkspaceResearchBridge,
  getWorkspaceTimeline,
  isSprint10BR7Frozen,
  listWatchlists,
  loadWatchlist,
  logExportedWatchlist,
  recordWorkspaceHistoryEvent,
  renameWatchlist,
  resetWatchlistWorkspace,
  restoreSavedWatchlist,
  saveWatchlist,
  favoriteWatchlist,
  pinWatchlist,
  type InstitutionalWorkspaceContext,
} from "./index";

const NOW = new Date("2026-07-15T06:30:00.000Z");

function snap(symbol: string, overrides: Partial<WatchlistItemSnapshot> = {}): WatchlistItemSnapshot {
  return {
    symbol,
    name: symbol,
    price: 100,
    changePercent: 1.5,
    convictionScore: 72,
    trustScore: 68,
    ...overrides,
  };
}

function ctx(
  watchlistId: string,
  symbols: string[] = ["INFY", "TCS"],
  overrides: Partial<InstitutionalWorkspaceContext> = {}
): InstitutionalWorkspaceContext {
  const snapshots: Record<string, WatchlistItemSnapshot> = {
    INFY: snap("INFY", { changePercent: 3.2, convictionScore: 82 }),
    TCS: snap("TCS", { changePercent: -1.1, convictionScore: 85 }),
  };
  return {
    watchlistId,
    symbols,
    snapshots,
    sectorBySymbol: { INFY: "IT", TCS: "IT" },
    workspaceId: "ws-institutional",
    now: NOW,
    ...overrides,
  };
}

describe("Sprint 10B.R7 — Institutional Workspace", () => {
  let watchlistId: string;

  beforeEach(() => {
    resetWatchlistWorkspace();
    resetInstitutionalWatchlists();
    ensureDefaultWatchlists(NOW);
    const wl = createWatchlist({
      name: "Institutional Desk",
      symbols: ["INFY", "TCS"],
      now: NOW,
    });
    watchlistId = wl.id;
  });

  afterEach(() => {
    resetWatchlistWorkspace();
    resetInstitutionalWatchlists();
  });

  describe("workspace", () => {
    it("saveWatchlist creates and updates records", () => {
      const created = saveWatchlist({
        name: "Saved Alpha",
        symbols: ["INFY"],
        now: NOW,
      });
      expect(created.metadata.name).toBe("Saved Alpha");
      const updated = saveWatchlist({
        id: created.id,
        name: "Saved Alpha Plus",
        symbols: ["INFY", "TCS"],
        now: NOW,
      });
      expect(updated.symbols).toHaveLength(2);
    });

    it("loadWatchlist and listWatchlists return saved items", () => {
      const loaded = loadWatchlist(watchlistId);
      expect(loaded?.id).toBe(watchlistId);
      const list = listWatchlists();
      expect(list.empty).toBe(false);
      expect(list.items.some((w) => w.id === watchlistId)).toBe(true);
    });

    it("listWatchlists returns empty when no records after reset", () => {
      resetWatchlistWorkspace();
      resetInstitutionalWatchlists();
      const list = listWatchlists();
      expect(list.empty).toBe(true);
      expect(list.emptyMessage).toBe(WORKSPACE_PRODUCTIVITY_EMPTY.noSavedWatchlists);
    });

    it("duplicate clone rename archive and restore lifecycle", () => {
      const dup = duplicateWatchlist(watchlistId, NOW);
      expect(dup.id).not.toBe(watchlistId);
      const cloned = cloneSavedWatchlist(watchlistId, { name: "Clone B", now: NOW });
      expect(cloned.metadata.name).toBe("Clone B");
      renameWatchlist(watchlistId, "Renamed Desk", NOW);
      expect(loadWatchlist(watchlistId)?.metadata.name).toBe("Renamed Desk");
      archiveSavedWatchlist(watchlistId, NOW);
      expect(loadWatchlist(watchlistId)?.status).toBe("archived");
      restoreSavedWatchlist(watchlistId, NOW);
      expect(loadWatchlist(watchlistId)?.status).toBe("active");
    });
  });

  describe("history", () => {
    it("records workspace history events", () => {
      recordWorkspaceHistoryEvent({
        watchlistId,
        kind: "ai_updated",
        summary: "AI recommendation refreshed",
        now: NOW,
      });
      const history = getWorkspaceTimeline(ctx(watchlistId));
      expect(history.empty).toBe(false);
      expect(history.entries.some((e) => e.kind === "ai_updated")).toBe(true);
    });

    it("merges timeline with activity events", () => {
      recordWorkspaceHistoryEvent({
        watchlistId,
        kind: "research_updated",
        summary: "Research linked",
        now: NOW,
      });
      logExportedWatchlist(watchlistId, "Desk", NOW);
      const timeline = getWorkspaceTimeline(ctx(watchlistId));
      expect(timeline.entries.length).toBeGreaterThan(0);
    });

    it("exports workspace history kinds", () => {
      expect(WORKSPACE_HISTORY_KINDS).toContain("created");
      expect(WORKSPACE_HISTORY_KINDS).toContain("exported");
    });

    it("records alert triggered history", () => {
      recordWorkspaceHistoryEvent({
        watchlistId,
        kind: "alert_triggered",
        summary: "Price alert on INFY",
        ticker: "INFY",
        now: NOW,
      });
      expect(
        getWorkspaceTimeline(ctx(watchlistId)).entries.some((e) => e.kind === "alert_triggered")
      ).toBe(true);
    });
  });

  describe("comparison", () => {
    it("compareWorkspaceWatchlists returns returns conviction and risk rows", () => {
      const view = compareWorkspaceWatchlists(
        ctx(watchlistId, ["INFY", "TCS"], {
          compareWatchlistId: "peer",
          compareSymbols: ["INFY", "RELIANCE"],
        })
      );
      expect(view.empty).toBe(false);
      expect(view.rows.some((r) => r.label === "Returns")).toBe(true);
      expect(view.rows.some((r) => r.label === "Diversification")).toBe(true);
    });

    it("returns empty comparison without peer watchlist", () => {
      const view = compareWorkspaceWatchlists(ctx(watchlistId, ["INFY"], { compareSymbols: [] }));
      expect(view.empty).toBe(true);
    });

    it("compareWorkspaceWatchlists compares sector spread", () => {
      const view = compareWorkspaceWatchlists(
        ctx(watchlistId, ["INFY", "TCS"], {
          compareWatchlistId: "peer",
          compareSymbols: ["INFY", "HDFC"],
        })
      );
      expect(view.rows.some((r) => r.label === "Sectors")).toBe(true);
    });
  });

  describe("timeline", () => {
    it("getWorkspaceTimeline scopes to watchlist", () => {
      recordWorkspaceHistoryEvent({
        watchlistId,
        kind: "modified",
        summary: "Edited symbols",
        now: NOW,
      });
      expect(getWorkspaceTimeline({ watchlistId }).entries.length).toBeGreaterThan(0);
    });

    it("returns no timeline empty state", () => {
      resetWatchlistWorkspace();
      const timeline = getWorkspaceTimeline({ watchlistId: "empty-id", symbols: [] });
      expect(timeline.empty).toBe(true);
      expect(timeline.emptyMessage).toBe(WORKSPACE_PRODUCTIVITY_EMPTY.noTimeline);
    });
  });

  describe("research bridge", () => {
    it("exposes research company earnings reports notes and journal routes", () => {
      const bridge = getWorkspaceResearchBridge(ctx(watchlistId, ["INFY"], { ticker: "INFY" }));
      expect(bridge.empty).toBe(false);
      expect(bridge.links.some((l) => l.kind === "research")).toBe(true);
      expect(bridge.links.some((l) => l.kind === "decision_journal")).toBe(true);
    });

    it("links company and earnings surfaces", () => {
      const bridge = getWorkspaceResearchBridge(ctx(watchlistId, ["TCS"], { ticker: "TCS" }));
      expect(bridge.links.some((l) => l.kind === "company")).toBe(true);
      expect(bridge.links.some((l) => l.kind === "earnings")).toBe(true);
    });

    it("research bridge returns awaiting workspace when empty", () => {
      const bridge = getWorkspaceResearchBridge({ symbols: [], now: NOW });
      expect(bridge.empty).toBe(true);
    });
  });

  describe("presentation", () => {
    it("productivity surfaces pinned favorites search and shortcuts", () => {
      pinWatchlist(watchlistId, true, NOW);
      favoriteWatchlist(watchlistId, true, NOW);
      const view = getProductivityView({ searchQuery: "inst", now: NOW });
      expect(view.quickActions).toEqual(expect.arrayContaining(QUICK_ACTIONS.slice(0, 3)));
      expect(Object.keys(view.shortcuts).length).toBeGreaterThan(0);
      expect(view.pinnedWatchlists.length).toBeGreaterThan(0);
    });

    it("empty institutional workspace surfaces route hints", () => {
      const bundle = emptyInstitutionalWorkspace();
      expect(bundle.empty).toBe(true);
      expect(bundle.surfaceHints.portfolio).toBe("/portfolio");
    });

    it("getInstitutionalWorkspace composes full bundle", () => {
      const bundle = getInstitutionalWorkspace(ctx(watchlistId));
      expect(bundle.empty).toBe(false);
      expect(bundle.saved.items.length).toBeGreaterThan(0);
      expect(bundle.research.links.length).toBeGreaterThan(0);
    });

    it("productivity search filters watchlists by symbol", () => {
      const view = getProductivityView({ searchQuery: "infy", now: NOW });
      expect(view.searchResults.some((w) => w.symbols.includes("INFY"))).toBe(true);
    });

    it("productivity tracks recent activity after save", () => {
      saveWatchlist({ name: "Recent WL", symbols: ["INFY"], now: NOW });
      const view = getProductivityView({ now: NOW });
      expect(view.recentActivity.length).toBeGreaterThan(0);
    });
  });

  describe("regression", () => {
    it("institutional workspace health reports readiness", () => {
      const health = getInstitutionalWorkspaceHealth(ctx(watchlistId));
      expect(health.ready).toBe(true);
      expect(health.savedCount).toBeGreaterThan(0);
      expect(health.sprint10BR7Frozen).toBe(true);
      expect(isSprint10BR7Frozen()).toBe(true);
    });

    it("reset clears workspace productivity state", () => {
      saveWatchlist({ name: "Temp", symbols: ["INFY"], now: NOW });
      recordWorkspaceHistoryEvent({
        watchlistId,
        kind: "created",
        summary: "Test",
        now: NOW,
      });
      resetWatchlistWorkspace();
      expect(getWorkspaceTimeline({ watchlistId }).empty).toBe(true);
    });

    it("favorite watchlists surface in productivity view", () => {
      favoriteWatchlist(watchlistId, true, NOW);
      const view = getProductivityView({ now: NOW });
      expect(view.favoriteWatchlists.some((w) => w.id === watchlistId)).toBe(true);
    });

    it("comparison workspace includes conviction row values", () => {
      const view = compareWorkspaceWatchlists(
        ctx(watchlistId, ["INFY", "TCS"], {
          compareWatchlistId: "peer",
          compareSymbols: ["INFY", "TCS"],
        })
      );
      const conviction = view.rows.find((r) => r.label === "Conviction");
      expect(conviction?.left).toBeTruthy();
      expect(conviction?.right).toBeTruthy();
    });
  });
});
