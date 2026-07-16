/**
 * Institutional Watchlist Platform — tests (Sprint 10B.R1).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WatchlistItemSnapshot } from "@/src/core/alerts/intelligence/AlertPresentationModels";
import {
  WATCHLIST_EMPTY,
  assertNoSentinelText,
  assertWatchlistMetricLabelsSafe,
  archiveWatchlist,
  archiveEmptyView,
  BUILTIN_WATCHLIST_DEFINITIONS,
  cloneWatchlist,
  computeWatchlistMetrics,
  createWatchlist,
  deleteWatchlist,
  emptyWatchlistCard,
  emptyWatchlistPlatformView,
  emptyWatchlistRecord,
  ensureDefaultWatchlists,
  favoriteWatchlistRecord,
  getCachedWatchlistMetricsKey,
  getInstitutionalWatchlistHealth,
  getInstitutionalWatchlistSummary,
  getMetrics,
  getWatchlistCacheCount,
  getWatchlistPlatformView,
  getWatchlists,
  isSprint10BR1Frozen,
  normalizeWatchlistCard,
  normalizeWatchlistRecord,
  pinWatchlistRecord,
  registerBuiltinWatchlistDefinitions,
  resetInstitutionalWatchlists,
  restoreWatchlist,
  safeWatchlistNumber,
  safeWatchlistText,
  searchWatchlists,
  sortWatchlistRecords,
  updateWatchlist,
  watchlistToCard,
} from "./index";

const NOW = new Date("2026-07-15T06:30:00.000Z");

function makeSnapshots(
  symbols: string[],
  overrides?: Partial<WatchlistItemSnapshot>
): Record<string, WatchlistItemSnapshot> {
  const out: Record<string, WatchlistItemSnapshot> = {};
  for (const symbol of symbols) {
    const key = symbol.toUpperCase();
    out[key] = {
      symbol: key,
      name: key,
      price: 100,
      changePercent: 1.5,
      convictionScore: 72,
      trustScore: 68,
      ...overrides,
    };
  }
  return out;
}

describe("Sprint 10B.R1 — Institutional Watchlist Platform", () => {
  beforeEach(() => {
    resetInstitutionalWatchlists();
  });

  afterEach(() => {
    resetInstitutionalWatchlists();
  });

  describe("registry", () => {
    it("registers builtin watchlist definitions", () => {
      const result = registerBuiltinWatchlistDefinitions();
      expect(result.total).toBe(BUILTIN_WATCHLIST_DEFINITIONS.length);
      expect(result.registered).toBe(BUILTIN_WATCHLIST_DEFINITIONS.length);
    });

    it("loads default watchlists on ensureDefaultWatchlists", () => {
      const records = ensureDefaultWatchlists(NOW);
      expect(records.length).toBe(BUILTIN_WATCHLIST_DEFINITIONS.length);
      expect(records.some((r) => r.kind === "default")).toBe(true);
      expect(records.some((r) => r.kind === "portfolio")).toBe(true);
      expect(records.some((r) => r.kind === "sector")).toBe(true);
      expect(records.some((r) => r.kind === "theme")).toBe(true);
    });

    it("searches watchlists by name and symbol", () => {
      ensureDefaultWatchlists(NOW);
      const banking = searchWatchlists({ search: "banking" });
      expect(banking.length).toBeGreaterThan(0);
      expect(banking[0]!.metadata.name.toLowerCase()).toContain("banking");

      const symbolHit = searchWatchlists({ search: "tcs" });
      expect(symbolHit.some((w) => w.symbols.includes("TCS"))).toBe(true);
    });

    it("sorts watchlists by priority descending", () => {
      ensureDefaultWatchlists(NOW);
      const sorted = sortWatchlistRecords(getWatchlists(), "priority", "desc");
      expect(sorted[0]!.metadata.priority).toBeGreaterThanOrEqual(
        sorted[sorted.length - 1]!.metadata.priority
      );
    });

    it("filters pinned and favorite watchlists", () => {
      ensureDefaultWatchlists(NOW);
      const pinned = searchWatchlists({ pinned: true });
      const favorites = searchWatchlists({ favorite: true });
      expect(pinned.length).toBeGreaterThan(0);
      expect(favorites.length).toBeGreaterThan(0);
      expect(pinned.every((w) => w.pinned)).toBe(true);
      expect(favorites.every((w) => w.favorite)).toBe(true);
    });
  });

  describe("lifecycle", () => {
    it("creates a custom watchlist", () => {
      const record = createWatchlist({
        name: "Alpha Ideas",
        symbols: ["INFY", "TCS"],
        now: NOW,
      });
      expect(record.empty).toBe(false);
      expect(record.metadata.name).toBe("Alpha Ideas");
      expect(record.symbols).toEqual(["INFY", "TCS"]);
    });

    it("updates watchlist metadata and symbols", () => {
      const record = createWatchlist({ name: "Old", now: NOW });
      const updated = updateWatchlist(record.id, {
        name: "New Desk",
        symbols: ["RELIANCE"],
        now: NOW,
      });
      expect(updated.metadata.name).toBe("New Desk");
      expect(updated.symbols).toEqual(["RELIANCE"]);
    });

    it("archives and restores a watchlist", () => {
      const record = createWatchlist({ name: "Archive Me", now: NOW });
      const archived = archiveWatchlist(record.id, NOW);
      expect(archived.status).toBe("archived");
      expect(getWatchlists().some((w) => w.id === record.id)).toBe(false);
      expect(
        getWatchlists({ includeArchived: true }).some((w) => w.id === record.id)
      ).toBe(true);

      const restored = restoreWatchlist(record.id, NOW);
      expect(restored.status).toBe("active");
    });

    it("deletes a watchlist", () => {
      const record = createWatchlist({ name: "Gone", now: NOW });
      expect(deleteWatchlist(record.id)).toBe(true);
      expect(getWatchlists().some((w) => w.id === record.id)).toBe(false);
    });

    it("clones and duplicates watchlists", () => {
      const record = createWatchlist({
        name: "Source",
        symbols: ["SBIN"],
        now: NOW,
      });
      const cloned = cloneWatchlist(record.id, { name: "Clone", now: NOW });
      expect(cloned.id).not.toBe(record.id);
      expect(cloned.metadata.name).toBe("Clone");
      expect(cloned.symbols).toEqual(["SBIN"]);
    });

    it("pins and favorites watchlists", () => {
      const record = createWatchlist({ name: "Flags", now: NOW });
      const pinned = pinWatchlistRecord(record.id, true, NOW);
      const favorited = favoriteWatchlistRecord(record.id, true, NOW);
      expect(pinned.pinned).toBe(true);
      expect(favorited.favorite).toBe(true);
    });
  });

  describe("metrics", () => {
    it("computes company count", () => {
      const record = createWatchlist({
        name: "Metrics",
        symbols: ["INFY", "TCS", "SBIN"],
        now: NOW,
      });
      const metrics = computeWatchlistMetrics({ record });
      expect(metrics.companies).toBe(3);
    });

    it("computes average conviction and trust from snapshots", () => {
      const record = createWatchlist({
        name: "Scores",
        symbols: ["INFY", "TCS"],
        now: NOW,
      });
      const metrics = computeWatchlistMetrics({
        record,
        snapshots: makeSnapshots(["INFY", "TCS"]),
      });
      expect(metrics.averageConviction).toBe(72);
      expect(metrics.averageTrust).toBe(68);
    });

    it("computes risk and performance", () => {
      const record = createWatchlist({
        name: "Risk",
        symbols: ["INFY"],
        now: NOW,
      });
      const metrics = computeWatchlistMetrics({
        record,
        snapshots: makeSnapshots(["INFY"], {
          convictionScore: 40,
          trustScore: 50,
          changePercent: -2,
        }),
      });
      expect(metrics.performance).toBe(-2);
      expect(metrics.risk).toBeGreaterThan(0);
    });

    it("accepts alert and earnings counts", () => {
      const record = createWatchlist({
        name: "Signals",
        symbols: ["INFY"],
        now: NOW,
      });
      const metrics = computeWatchlistMetrics({
        record,
        alertCount: 4,
        upcomingEarnings: 2,
      });
      expect(metrics.alerts).toBe(4);
      expect(metrics.upcomingEarnings).toBe(2);
    });

    it("getMetrics integrates watchlist alert engine", () => {
      const record = createWatchlist({
        name: "Alerts",
        symbols: ["INFY"],
        now: NOW,
      });
      const metrics = getMetrics(record.id, {
        snapshots: makeSnapshots(["INFY"], { convictionScore: 90 }),
        now: NOW,
      });
      expect(metrics.companies).toBe(1);
      expect(metrics.alerts).toBeGreaterThanOrEqual(0);
    });
  });

  describe("presentation", () => {
    it("empty platform view surfaces route hints", () => {
      const view = emptyWatchlistPlatformView();
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(WATCHLIST_EMPTY.noWatchlists);
      expect(view.surfaceHints.watchlist).toBe("/watchlist");
      expect(view.surfaceHints.dashboard).toBe("/");
      expect(view.surfaceHints.research).toBe("/research");
      expect(view.surfaceHints.results).toBe("/results");
      expect(view.surfaceHints.company).toBe("/company");
    });

    it("archive empty state", () => {
      const view = archiveEmptyView();
      expect(view.emptyMessage).toBe(WATCHLIST_EMPTY.archiveEmpty);
      expect(view.archived).toEqual([]);
    });

    it("watchlist cards never surface sentinel strings", () => {
      expect(safeWatchlistText(null, "fallback")).toBe("fallback");
      expect(safeWatchlistText("null", "fallback")).toBe("fallback");
      expect(safeWatchlistNumber(NaN, 3)).toBe(3);
      expect(assertNoSentinelText("ok")).toBe(true);
      expect(assertNoSentinelText("undefined")).toBe(false);

      const record = createWatchlist({ name: "Card", now: NOW });
      const card = watchlistToCard(record);
      expect(card.empty).toBe(false);
      expect(assertNoSentinelText(card.title)).toBe(true);
      expect(emptyWatchlistCard().emptyMessage).toBe(WATCHLIST_EMPTY.noWatchlists);
      expect(normalizeWatchlistCard({ id: "x", title: "Title" }).empty).toBe(
        false
      );
      expect(emptyWatchlistRecord().emptyMessage).toBe(
        WATCHLIST_EMPTY.noWatchlists
      );
      expect(normalizeWatchlistRecord({ id: "x", empty: false }).empty).toBe(
        false
      );
    });

    it("platform view populates after defaults", () => {
      ensureDefaultWatchlists(NOW);
      const view = getWatchlistPlatformView({ now: NOW });
      expect(view.empty).toBe(false);
      expect(view.watchlists.length).toBeGreaterThan(0);
      expect(view.pinned.length).toBeGreaterThan(0);
    });

    it("favorites empty message when no favorites exist", () => {
      createWatchlist({ name: "No Fav", favorite: false, now: NOW });
      const view = getWatchlistPlatformView({ now: NOW });
      expect(view.favorites).toEqual([]);
    });
  });

  describe("caching", () => {
    it("caches metrics key per watchlist", () => {
      const record = createWatchlist({
        name: "Cache",
        symbols: ["INFY"],
        now: NOW,
      });
      const first = computeWatchlistMetrics({ record, useCache: true });
      expect(first.fromCache).toBe(false);
      expect(getCachedWatchlistMetricsKey(record.id)).toBe(record.cachedMetricsKey);

      const second = computeWatchlistMetrics({ record, useCache: true });
      expect(second.fromCache).toBe(true);
      expect(getWatchlistCacheCount()).toBeGreaterThan(0);
    });
  });

  describe("regression", () => {
    it("institutional health reports platform readiness", () => {
      const emptyHealth = getInstitutionalWatchlistHealth({ now: NOW });
      expect(emptyHealth.ready).toBe(false);
      expect(emptyHealth.emptyMessage).toBe(WATCHLIST_EMPTY.noWatchlists);

      ensureDefaultWatchlists(NOW);
      const health = getInstitutionalWatchlistHealth({ now: NOW });
      expect(health.ready).toBe(true);
      expect(health.watchlistCount).toBeGreaterThan(0);
      expect(health.sprint10BR1Frozen).toBe(true);
      expect(isSprint10BR1Frozen()).toBe(true);
    });

    it("summary bundles health, view, and metrics", () => {
      ensureDefaultWatchlists(NOW);
      const summary = getInstitutionalWatchlistSummary({
        now: NOW,
        snapshots: makeSnapshots(["BHARTIARTL", "SBIN"]),
      });
      expect(summary.health.ready).toBe(true);
      expect(summary.view.watchlists.length).toBeGreaterThan(0);
      expect(assertWatchlistMetricLabelsSafe(summary.activeMetrics)).toBe(true);
    });

    it("reset clears registry and cache", () => {
      ensureDefaultWatchlists(NOW);
      expect(getWatchlists().length).toBeGreaterThan(0);
      resetInstitutionalWatchlists();
      expect(getWatchlists().length).toBe(0);
      expect(getWatchlistCacheCount()).toBe(0);
    });
  });
});
