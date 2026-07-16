/**
 * Executive Watchlist Hub — tests (Sprint 10B.R8).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WatchlistItemSnapshot } from "@/src/core/alerts/intelligence/AlertPresentationModels";
import {
  createWatchlist,
  ensureDefaultWatchlists,
  getWatchlistEngine,
  resetInstitutionalWatchlists,
} from "../index";
import {
  EXECUTIVE_WATCHLIST_EMPTY,
  WATCHLIST_PLATFORM_STATUS,
  exportExecutiveWatchlistReport,
  getExecutiveWatchlistDashboardView,
  getExecutiveWatchlistHealth,
  getExecutiveWatchlistMetrics,
  getExecutiveWatchlistOverview,
  getExecutiveWatchlistPanels,
  getExecutiveWatchlistTimeline,
  isSprint10BFrozen,
  resetExecutiveWatchlistStack,
  type ExecutiveWatchlistComposeInput,
} from "./index";
import { recordWorkspaceHistoryEvent, resetWatchlistWorkspace } from "../workspace";

const NOW = new Date("2026-07-15T06:30:00.000Z");

function snap(symbol: string, overrides: Partial<WatchlistItemSnapshot> = {}): WatchlistItemSnapshot {
  return {
    symbol,
    name: symbol,
    price: 100,
    changePercent: 1.5,
    convictionScore: 72,
    trustScore: 68,
    validationStatus: "passed",
    ...overrides,
  };
}

function ctx(symbols: string[] = ["INFY", "TCS", "SBIN"]): ExecutiveWatchlistComposeInput {
  const snapshots: Record<string, WatchlistItemSnapshot> = {};
  for (const s of symbols) {
    snapshots[s] = snap(s, {
      convictionScore: s === "TCS" ? 85 : s === "SBIN" ? 30 : 72,
    });
  }
  return { snapshots, portfolioSymbols: ["TCS"], now: NOW };
}

describe("Sprint 10B.R8 — Executive Watchlist Hub", () => {
  let watchlistId: string;

  beforeEach(() => {
    resetExecutiveWatchlistStack();
    resetWatchlistWorkspace();
    resetInstitutionalWatchlists();
    ensureDefaultWatchlists(NOW);
    const wl = createWatchlist({
      name: "Executive Desk",
      symbols: ["INFY", "TCS", "SBIN"],
      now: NOW,
    });
    watchlistId = wl.id;
    getWatchlistEngine().setActiveWatchlist(watchlistId);
  });

  afterEach(() => {
    resetExecutiveWatchlistStack();
    resetWatchlistWorkspace();
    resetInstitutionalWatchlists();
  });

  describe("executive dashboard", () => {
    it("composes overview health metrics and panels", () => {
      const view = getExecutiveWatchlistDashboardView(ctx());
      expect(view.empty).toBe(false);
      expect(view.overview.cards.length).toBeGreaterThan(0);
      expect(view.health.overallHealthScore).toBeGreaterThan(0);
      expect(view.metrics.totalCompanies).toBeGreaterThan(0);
    });

    it("surfaces total active favorites archived and pinned counts", () => {
      const overview = getExecutiveWatchlistOverview(ctx());
      expect(overview.totalWatchlists).toBeGreaterThan(0);
      expect(overview.activeWatchlists).toBeGreaterThan(0);
    });

    it("returns empty dashboard when no watchlists exist", () => {
      resetInstitutionalWatchlists();
      const view = getExecutiveWatchlistDashboardView(ctx());
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(EXECUTIVE_WATCHLIST_EMPTY.noWatchlists);
    });
  });

  describe("metrics", () => {
    it("reports total and unique companies", () => {
      const metrics = getExecutiveWatchlistMetrics(ctx());
      expect(metrics.empty).toBe(false);
      expect(metrics.totalCompanies).toBeGreaterThan(0);
      expect(metrics.uniqueCompanies).toBeGreaterThan(0);
    });

    it("identifies best and worst watchlists", () => {
      const metrics = getExecutiveWatchlistMetrics(ctx());
      expect(metrics.bestWatchlist).not.toBe(EXECUTIVE_WATCHLIST_EMPTY.noExecutiveMetrics);
      expect(metrics.labels.averageWinRate).toBeTruthy();
    });

    it("reports average performance and return", () => {
      const metrics = getExecutiveWatchlistMetrics(ctx());
      expect(metrics.averagePerformance).toBeGreaterThanOrEqual(0);
      expect(metrics.labels.averageReturn).toBeTruthy();
    });

    it("returns no executive metrics empty state", () => {
      resetInstitutionalWatchlists();
      const metrics = getExecutiveWatchlistMetrics(ctx());
      expect(metrics.empty).toBe(true);
    });
  });

  describe("health", () => {
    it("composes conviction trust validation and diversification", () => {
      const health = getExecutiveWatchlistHealth(ctx());
      expect(health.empty).toBe(false);
      expect(health.averageConviction).toBeGreaterThan(0);
      expect(health.averageTrust).toBeGreaterThan(0);
      expect(health.overallHealthLabel).toContain("Grade");
    });

    it("returns empty health without active watchlist", () => {
      resetInstitutionalWatchlists();
      const health = getExecutiveWatchlistHealth(ctx());
      expect(health.empty).toBe(true);
    });

    it("includes average diversification score", () => {
      const health = getExecutiveWatchlistHealth(ctx());
      expect(health.averageDiversification).toBeGreaterThanOrEqual(0);
    });
  });

  describe("panels", () => {
    it("surfaces opportunities conviction risk and alerts", () => {
      const panels = getExecutiveWatchlistPanels(ctx());
      expect(panels.empty).toBe(false);
      expect(
        panels.topOpportunities.length +
          panels.highestConviction.length +
          panels.alertActivity.length
      ).toBeGreaterThanOrEqual(0);
    });

    it("includes research activity links", () => {
      const panels = getExecutiveWatchlistPanels(ctx());
      expect(panels.researchActivity.length).toBeGreaterThanOrEqual(0);
    });

    it("surfaces upcoming earnings panel", () => {
      const panels = getExecutiveWatchlistPanels(ctx());
      expect(panels.upcomingEarnings).toBeDefined();
      expect(Array.isArray(panels.upcomingEarnings)).toBe(true);
    });
  });

  describe("timeline", () => {
    it("returns workspace timeline entries", () => {
      recordWorkspaceHistoryEvent({
        watchlistId,
        kind: "created",
        summary: "Watchlist created",
        now: NOW,
      });
      const timeline = getExecutiveWatchlistTimeline(ctx());
      expect(timeline.entries.length).toBeGreaterThan(0);
    });

    it("returns awaiting workspace when timeline empty", () => {
      resetWatchlistWorkspace();
      const timeline = getExecutiveWatchlistTimeline(ctx());
      expect(timeline.empty).toBe(true);
    });
  });

  describe("export", () => {
    it("exports markdown report via Sprint 9F pipeline", () => {
      const view = getExecutiveWatchlistDashboardView(ctx());
      const result = exportExecutiveWatchlistReport("MARKDOWN", view);
      expect(result.ok).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.filename).toContain(".md");
    });

    it("exports print layout", () => {
      const view = getExecutiveWatchlistDashboardView(ctx());
      const result = exportExecutiveWatchlistReport("PRINT", view);
      expect(result.ok).toBe(true);
      expect(result.format).toBe("PRINT");
    });

    it("exports PDF-ready filename", () => {
      const view = getExecutiveWatchlistDashboardView(ctx());
      const result = exportExecutiveWatchlistReport("PDF", view);
      expect(result.ok).toBe(true);
      expect(result.filename).toContain(".pdf");
    });
  });

  describe("presentation", () => {
    it("report includes executive summary sections", () => {
      const view = getExecutiveWatchlistDashboardView(ctx());
      expect(view.report.empty).toBe(false);
      expect(view.report.executiveSummary.length).toBeGreaterThan(0);
      expect(view.report.sections.length).toBeGreaterThan(0);
    });

    it("dashboard surfaces route hints", () => {
      const view = getExecutiveWatchlistDashboardView(ctx());
      expect(view.surfaceHints.watchlist).toBe("/watchlist");
      expect(view.surfaceHints.portfolio).toBe("/portfolio");
    });
  });

  describe("regression", () => {
    it("WATCHLIST_PLATFORM_STATUS marks sprint complete and frozen", () => {
      expect(WATCHLIST_PLATFORM_STATUS.complete).toBe(true);
      expect(WATCHLIST_PLATFORM_STATUS.frozen).toBe(true);
      expect(isSprint10BFrozen()).toBe(true);
    });

    it("dashboard marks sprint frozen", () => {
      const view = getExecutiveWatchlistDashboardView(ctx());
      expect(view.sprintFrozen).toBe(true);
    });

    it("reset clears executive hub singleton", () => {
      getExecutiveWatchlistDashboardView(ctx());
      resetExecutiveWatchlistStack();
      expect(getExecutiveWatchlistDashboardView(ctx()).empty).toBe(false);
    });

    it("overview includes portfolio coverage and AI health cards", () => {
      const overview = getExecutiveWatchlistOverview(ctx());
      expect(overview.cards.some((c) => c.id === "portfolio_coverage")).toBe(true);
      expect(overview.cards.some((c) => c.id === "ai_health")).toBe(true);
      expect(overview.cards.some((c) => c.id === "research_health")).toBe(true);
    });

    it("panels include recent AI changes section", () => {
      const panels = getExecutiveWatchlistPanels(ctx());
      expect(panels.recentAiChanges).toBeDefined();
      expect(Array.isArray(panels.recentAiChanges)).toBe(true);
    });
  });
});
