/**
 * Watchlist Workspace — tests (Sprint 10B.R4).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WatchlistItemSnapshot } from "@/src/core/alerts/intelligence/AlertPresentationModels";
import { createWatchlist, ensureDefaultWatchlists, resetInstitutionalWatchlists } from "../index";
import {
  WORKSPACE_EMPTY,
  addWatchlistComment,
  dismissWatchlistAlert,
  emptyWatchlistWorkspace,
  executeWatchlistAction,
  getCollaborationView,
  getPortfolioBridge,
  getWatchlistActions,
  getWatchlistAlerts,
  getWatchlistResearch,
  getWatchlistTimeline,
  getWatchlistWorkspace,
  getWatchlistWorkspaceHealth,
  isSprint10BR4Frozen,
  moveToPortfolio,
  pinWatchlistAlert,
  recordTimelineEvent,
  resetWatchlistTimeline,
  resetWatchlistWorkspace,
  shareWatchlist,
  snoozeWatchlistAlert,
  wasMovedToPortfolio,
  ACTION_CENTER_ACTIONS,
  TIMELINE_EVENT_KINDS,
  WATCHLIST_WORKSPACE_ROUTES,
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

function workspaceCtx(watchlistId: string, symbols: string[]) {
  const snapshots: Record<string, WatchlistItemSnapshot> = {};
  for (const s of symbols) {
    snapshots[s] = snap(s, {
      convictionScore: s === "TCS" ? 85 : s === "SBIN" ? 30 : 72,
      trustScore: s === "SBIN" ? 40 : 68,
    });
  }
  return {
    watchlistId,
    symbols,
    portfolioSymbols: ["RELIANCE", "TCS"],
    portfolioWeights: { RELIANCE: 40, TCS: 20 },
    workspaceId: "ws-test",
    snapshots,
    now: NOW,
  };
}

describe("Sprint 10B.R4 — Watchlist Workspace", () => {
  let watchlistId: string;

  beforeEach(() => {
    resetWatchlistWorkspace();
    resetInstitutionalWatchlists();
    ensureDefaultWatchlists(NOW);
    const wl = createWatchlist({
      name: "Action Desk",
      symbols: ["INFY", "TCS", "SBIN"],
      now: NOW,
    });
    watchlistId = wl.id;
  });

  afterEach(() => {
    resetWatchlistWorkspace();
    resetInstitutionalWatchlists();
  });

  describe("portfolio bridge", () => {
    it("computes overlap missing holdings and candidates", () => {
      const bridge = getPortfolioBridge(workspaceCtx(watchlistId, ["INFY", "TCS", "SBIN"]));
      expect(bridge.overlap).toContain("TCS");
      expect(bridge.overlapPercent).toBeGreaterThan(0);
      expect(bridge.missingHoldings).toContain("RELIANCE");
      expect(bridge.watchlistCandidates).toContain("INFY");
    });

    it("identifies upgrade and exit candidates", () => {
      const ctx = {
        ...workspaceCtx(watchlistId, ["TCS", "SBIN", "INFY"]),
        portfolioSymbols: ["RELIANCE", "TCS", "SBIN"],
      };
      const bridge = getPortfolioBridge(ctx);
      expect(bridge.upgradeCandidates).toContain("TCS");
      expect(bridge.exitCandidates).toContain("SBIN");
      expect(bridge.allocationImpact.length).toBeGreaterThan(0);
    });

    it("moveToPortfolio updates symbols and timeline", () => {
      const result = moveToPortfolio({
        watchlistId,
        symbols: ["INFY"],
        portfolioSymbols: ["RELIANCE"],
        now: NOW,
      });
      expect(result.moved).toEqual(["INFY"]);
      expect(result.portfolioSymbols).toContain("INFY");
      expect(wasMovedToPortfolio(watchlistId, "INFY")).toBe(true);
      expect(getWatchlistTimeline({ watchlistId }).entries.some((e) => e.kind === "portfolio_moved")).toBe(
        true
      );
    });
  });

  describe("alert bridge", () => {
    it("returns empty alerts when no watchlist alerts exist", () => {
      const alerts = getWatchlistAlerts(workspaceCtx(watchlistId, ["INFY"]));
      expect(alerts.emptyMessage).toBe(WORKSPACE_EMPTY.noAlerts);
    });

    it("supports dismiss snooze and pin lifecycle", () => {
      const id = "test-alert-1";
      expect(dismissWatchlistAlert(id, { watchlistId, now: NOW })).toBe(true);
      expect(snoozeWatchlistAlert(id, new Date(Date.now() + 60_000), { watchlistId, now: NOW })).toBe(
        true
      );
      expect(pinWatchlistAlert(id, { watchlistId, now: NOW })).toBe(true);
    });
  });

  describe("research bridge", () => {
    it("composes research routes and links", () => {
      const research = getWatchlistResearch(workspaceCtx(watchlistId, ["INFY", "TCS"]));
      expect(research.openResearchRoute).toContain("/research");
      expect(research.latestReportRoute).toBe("/results");
      expect(research.links.length).toBe(2);
    });

    it("returns no research empty without workspace", () => {
      const research = getWatchlistResearch({ symbols: [], now: NOW });
      expect(research.empty).toBe(true);
      expect(research.emptyMessage).toBe(WORKSPACE_EMPTY.noResearch);
    });
  });

  describe("action center", () => {
    it("surfaces buy monitor reduce and portfolio actions", () => {
      const ctx = {
        ...workspaceCtx(watchlistId, ["INFY", "TCS", "SBIN"]),
        portfolioSymbols: ["RELIANCE", "TCS", "SBIN"],
      };
      const actions = getWatchlistActions(ctx);
      expect(actions.empty).toBe(false);
      expect(actions.actions.some((a) => a.action === "buy_candidate")).toBe(true);
      expect(actions.actions.some((a) => a.action === "move_to_portfolio")).toBe(true);
      expect(actions.actions.some((a) => a.action === "reduce" || a.action === "exit")).toBe(true);
      expect(actions.actions.some((a) => a.action === "monitor")).toBe(true);
    });

    it("executeWatchlistAction records timeline events", () => {
      expect(
        executeWatchlistAction({
          watchlistId,
          action: "monitor",
          ticker: "INFY",
          now: NOW,
        })
      ).toBe(true);
      expect(
        getWatchlistTimeline({ watchlistId }).entries.some((e) => e.kind === "ai_recommendation")
      ).toBe(true);
    });
  });

  describe("timeline", () => {
    it("records added removed and research events", () => {
      recordTimelineEvent({
        watchlistId,
        kind: "added",
        ticker: "INFY",
        summary: "Added INFY",
        now: NOW,
      });
      recordTimelineEvent({
        watchlistId,
        kind: "research_updated",
        ticker: "TCS",
        summary: "Research updated",
        now: NOW,
      });
      const timeline = getWatchlistTimeline({ watchlistId });
      expect(timeline.empty).toBe(false);
      expect(timeline.entries.some((e) => e.kind === "added")).toBe(true);
      expect(timeline.entries.some((e) => e.kind === "research_updated")).toBe(true);
    });

    it("returns no activity empty state", () => {
      resetWatchlistTimeline();
      const timeline = getWatchlistTimeline({ watchlistId });
      expect(timeline.empty).toBe(true);
      expect(timeline.emptyMessage).toBe(WORKSPACE_EMPTY.noActivity);
    });
  });

  describe("collaboration", () => {
    it("shareWatchlist registers collaborators", () => {
      const view = shareWatchlist({
        watchlistId,
        collaborators: [
          { name: "Alice", role: "editor" },
          { name: "Bob", role: "viewer" },
        ],
        now: NOW,
      });
      expect(view.shared).toBe(true);
      expect(view.collaborators.length).toBe(2);
      expect(getCollaborationView(watchlistId).shared).toBe(true);
    });

    it("supports comments and read-only viewers", () => {
      shareWatchlist({
        watchlistId,
        collaborators: [{ name: "Viewer", role: "viewer" }],
        readOnly: true,
        now: NOW,
      });
      const comment = addWatchlistComment({
        watchlistId,
        author: "Alice",
        body: "Check @INFY earnings",
        mentions: ["INFY"],
        now: NOW,
      });
      expect(comment.mentions).toContain("INFY");
      expect(getCollaborationView(watchlistId).readOnly).toBe(true);
    });
  });

  describe("presentation", () => {
    it("empty workspace surfaces route hints", () => {
      const view = emptyWatchlistWorkspace();
      expect(view.empty).toBe(true);
      expect(view.surfaceHints.portfolio).toBe("/portfolio");
      expect(view.surfaceHints.watchlist).toBe("/watchlist");
    });

    it("getWatchlistWorkspace composes full action center", () => {
      shareWatchlist({
        watchlistId,
        collaborators: [{ name: "Team", role: "editor" }],
        now: NOW,
      });
      const view = getWatchlistWorkspace(workspaceCtx(watchlistId, ["INFY", "TCS", "SBIN"]));
      expect(view.watchlistId).toBe(watchlistId);
      expect(view.portfolio.watchlistCandidates.length).toBeGreaterThan(0);
      expect(view.actions.actions.length).toBeGreaterThan(0);
      expect(view.collaboration.shared).toBe(true);
    });
  });

  describe("empty states", () => {
    it("portfolio bridge returns empty when no symbols", () => {
      const bridge = getPortfolioBridge({ watchlistId, symbols: [], now: NOW });
      expect(bridge.empty).toBe(true);
      expect(bridge.emptyMessage).toBe(WORKSPACE_EMPTY.noPortfolioLinks);
    });

    it("collaboration returns no shared users empty state", () => {
      const view = getCollaborationView(watchlistId);
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(WORKSPACE_EMPTY.noSharedUsers);
    });

    it("workspace routes include portfolio surface", () => {
      expect(WATCHLIST_WORKSPACE_ROUTES.portfolio).toBe("/portfolio");
      expect(WATCHLIST_WORKSPACE_ROUTES.watchlist).toBe("/watchlist");
    });
  });

  describe("constants", () => {
    it("exports action center and timeline kinds", () => {
      expect(ACTION_CENTER_ACTIONS).toContain("buy_candidate");
      expect(ACTION_CENTER_ACTIONS).toContain("archive");
      expect(TIMELINE_EVENT_KINDS).toContain("alert_triggered");
      expect(TIMELINE_EVENT_KINDS).toContain("portfolio_moved");
    });
  });

  describe("integration edges", () => {
    it("dismiss alert records alert_triggered timeline event", () => {
      resetWatchlistTimeline();
      dismissWatchlistAlert("edge-alert", { watchlistId, now: NOW });
      const timeline = getWatchlistTimeline({ watchlistId });
      expect(timeline.entries.some((e) => e.kind === "alert_triggered")).toBe(true);
    });

    it("timeline scopes entries to watchlist id", () => {
      resetWatchlistTimeline();
      recordTimelineEvent({
        watchlistId,
        kind: "added",
        ticker: "INFY",
        summary: "Added INFY",
        now: NOW,
      });
      recordTimelineEvent({
        watchlistId: "other-watchlist",
        kind: "removed",
        ticker: "TCS",
        summary: "Removed TCS",
        now: NOW,
      });
      expect(getWatchlistTimeline({ watchlistId }).entries).toHaveLength(1);
    });

    it("research bridge reports health when workspace is linked", () => {
      const research = getWatchlistResearch(workspaceCtx(watchlistId, ["INFY"]));
      expect(research.empty).toBe(false);
      expect(research.openResearchRoute).toContain("INFY");
    });
  });

  describe("regression", () => {
    it("workspace health reports integration readiness", () => {
      const health = getWatchlistWorkspaceHealth(workspaceCtx(watchlistId, ["INFY", "TCS"]));
      expect(health.ready).toBe(true);
      expect(health.portfolioLinked).toBe(true);
      expect(health.actionCount).toBeGreaterThan(0);
      expect(health.sprint10BR4Frozen).toBe(true);
      expect(isSprint10BR4Frozen()).toBe(true);
    });

    it("records earnings completed timeline events", () => {
      recordTimelineEvent({
        watchlistId,
        kind: "earnings_completed",
        ticker: "INFY",
        summary: "INFY Q1 earnings completed",
        now: NOW,
      });
      expect(
        getWatchlistTimeline({ watchlistId }).entries.some((e) => e.kind === "earnings_completed")
      ).toBe(true);
    });

    it("reset clears workspace state", () => {
      moveToPortfolio({ watchlistId, symbols: ["INFY"], now: NOW });
      shareWatchlist({ watchlistId, collaborators: [{ name: "X" }], now: NOW });
      resetWatchlistWorkspace();
      expect(getWatchlistTimeline({ watchlistId }).empty).toBe(true);
      expect(getCollaborationView(watchlistId).empty).toBe(true);
    });
  });
});
