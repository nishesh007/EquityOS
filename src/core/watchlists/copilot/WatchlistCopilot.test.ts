/**
 * Watchlist Copilot — tests (Sprint 10B.R6).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WatchlistItemSnapshot } from "@/src/core/alerts/intelligence/AlertPresentationModels";
import { createWatchlist, ensureDefaultWatchlists, resetInstitutionalWatchlists } from "../index";
import {
  COPILOT_QUESTION_KINDS,
  DECISION_KINDS,
  WATCHLIST_COPILOT_EMPTY,
  askWatchlist,
  compareCompanies,
  compareWatchlists,
  emptyCopilotBundle,
  getDecisionAssistant,
  getExecutiveSummary,
  getResearchCompanion,
  getWatchlistBrief,
  getWatchlistCopilot,
  getWatchlistCopilotHealth,
  isSprint10BR6Frozen,
  resetWatchlistCopilot,
  type WatchlistCopilotContext,
} from "./index";

const NOW = new Date("2026-07-15T06:30:00.000Z");

function snap(
  symbol: string,
  overrides: Partial<WatchlistItemSnapshot> = {}
): WatchlistItemSnapshot {
  return {
    symbol,
    name: symbol,
    price: 100,
    changePercent: 1.2,
    convictionScore: 72,
    trustScore: 68,
    validationStatus: "passed",
    category: "Growth",
    ...overrides,
  };
}

function ctx(
  watchlistId: string,
  symbols: string[] = ["INFY", "TCS", "SBIN"],
  overrides: Partial<WatchlistCopilotContext> = {}
): WatchlistCopilotContext {
  const snapshots: Record<string, WatchlistItemSnapshot> = {
    INFY: snap("INFY", { changePercent: 3.5, convictionScore: 82 }),
    TCS: snap("TCS", { changePercent: -1.2, convictionScore: 85, trustScore: 80 }),
    SBIN: snap("SBIN", { changePercent: -4.1, convictionScore: 28, trustScore: 35 }),
  };
  return {
    watchlistId,
    symbols,
    snapshots,
    priorSnapshots: {
      INFY: snap("INFY", { convictionScore: 75 }),
      TCS: snap("TCS", { convictionScore: 88 }),
      SBIN: snap("SBIN", { convictionScore: 45 }),
    },
    sectorBySymbol: { INFY: "IT", TCS: "IT", SBIN: "Banking" },
    metricsBySymbol: {
      INFY: { momentum: 12, days_to_earnings: 3 },
      TCS: { momentum: 8 },
      SBIN: { momentum: -5 },
    },
    workspaceId: "ws-copilot",
    now: NOW,
    ...overrides,
  };
}

describe("Sprint 10B.R6 — Watchlist Copilot", () => {
  let watchlistId: string;

  beforeEach(() => {
    resetWatchlistCopilot();
    resetInstitutionalWatchlists();
    ensureDefaultWatchlists(NOW);
    const wl = createWatchlist({
      name: "Copilot Desk",
      symbols: ["INFY", "TCS", "SBIN"],
      now: NOW,
    });
    watchlistId = wl.id;
  });

  afterEach(() => {
    resetWatchlistCopilot();
    resetInstitutionalWatchlists();
  });

  describe("brief", () => {
    it("composes morning brief with opportunities and risks", () => {
      const brief = getWatchlistBrief(ctx(watchlistId));
      expect(brief.empty).toBe(false);
      expect(brief.headline).toContain("Morning brief");
      expect(brief.opportunities.items.length).toBeGreaterThanOrEqual(0);
      expect(brief.risks.label).toBe("Today's Risks");
    });

    it("includes earnings alerts and research summary sections", () => {
      const brief = getWatchlistBrief(ctx(watchlistId));
      expect(brief.earnings.label).toBe("Today's Earnings");
      expect(brief.alerts.label).toBe("Important Alerts");
      expect(brief.researchSummary.length).toBeGreaterThan(0);
    });

    it("returns no brief empty state", () => {
      const brief = getWatchlistBrief({ symbols: [], now: NOW });
      expect(brief.empty).toBe(true);
      expect(brief.emptyMessage).toBe(WATCHLIST_COPILOT_EMPTY.noBrief);
    });

    it("includes market context narrative", () => {
      const brief = getWatchlistBrief(ctx(watchlistId));
      expect(brief.marketContext.length).toBeGreaterThan(0);
    });
  });

  describe("decision assistant", () => {
    it("surfaces buy wait remove and research decisions", () => {
      const view = getDecisionAssistant(ctx(watchlistId));
      expect(view.empty).toBe(false);
      expect(view.decisions.length).toBeGreaterThan(0);
      expect(DECISION_KINDS.some((k) => view.decisions.some((d) => d.decision === k))).toBe(
        true
      );
    });

    it("includes confidence and reason per decision", () => {
      const view = getDecisionAssistant(ctx(watchlistId));
      for (const d of view.decisions) {
        expect(d.label.length).toBeGreaterThan(0);
        expect(d.reason.length).toBeGreaterThan(0);
        expect(d.confidence).toBeGreaterThanOrEqual(0);
      }
    });

    it("returns no suggestions empty state", () => {
      const view = getDecisionAssistant({ symbols: [], now: NOW });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(WATCHLIST_COPILOT_EMPTY.noSuggestions);
    });
  });

  describe("questions", () => {
    it("answers why is this stock here", () => {
      const answer = askWatchlist(
        ctx(watchlistId, ["INFY"], {
          question: "Why is INFY here?",
          ticker: "INFY",
        })
      );
      expect(answer.empty).toBe(false);
      expect(answer.answer).toContain("INFY");
      expect(answer.kind).toBe("why_here");
    });

    it("answers conviction falling questions", () => {
      const answer = askWatchlist(
        ctx(watchlistId, ["SBIN"], {
          question: "Why is conviction falling for SBIN?",
          ticker: "SBIN",
        })
      );
      expect(answer.kind).toBe("why_conviction_falling");
      expect(answer.answer).toContain("SBIN");
    });

    it("answers why was it added questions", () => {
      const answer = askWatchlist(
        ctx(watchlistId, ["INFY"], {
          question: "Why was INFY added?",
          ticker: "INFY",
        })
      );
      expect(answer.kind).toBe("why_added");
      expect(answer.answer).toContain("INFY");
    });

    it("returns no questions empty state", () => {
      const answer = askWatchlist(ctx(watchlistId, ["INFY"], { question: "" }));
      expect(answer.empty).toBe(true);
      expect(answer.answer).toBe(WATCHLIST_COPILOT_EMPTY.noQuestions);
    });

    it("answers why removed questions", () => {
      const answer = askWatchlist(
        ctx(watchlistId, ["SBIN"], {
          question: "Why should SBIN be removed?",
          ticker: "SBIN",
        })
      );
      expect(answer.kind).toBe("why_removed");
      expect(answer.answer).toContain("SBIN");
    });

    it("supports AI recommendation questions", () => {
      const answer = askWatchlist(
        ctx(watchlistId, ["TCS"], {
          question: "Why is AI recommending TCS?",
          ticker: "TCS",
        })
      );
      expect(answer.kind).toBe("why_ai_recommending");
      expect(COPILOT_QUESTION_KINDS).toContain("why_ai_recommending");
    });
  });

  describe("comparison", () => {
    it("compareCompanies ranks conviction trust and opportunities", () => {
      const view = compareCompanies(
        ctx(watchlistId, ["INFY", "TCS"], { compareTickers: ["INFY", "TCS"] })
      );
      expect(view.empty).toBe(false);
      expect(view.tickers).toEqual(["INFY", "TCS"]);
      expect(view.rows.some((r) => r.label === "Conviction")).toBe(true);
    });

    it("compareWatchlists shows overlap and unique ideas", () => {
      const view = compareWatchlists(
        ctx(watchlistId, ["INFY", "TCS", "SBIN"], {
          compareWatchlistId: "peer",
          compareSymbols: ["TCS", "RELIANCE"],
        })
      );
      expect(view.empty).toBe(false);
      expect(view.rows.some((r) => r.label === "Overlap")).toBe(true);
    });

    it("compareWatchlists returns empty without peer symbols", () => {
      const view = compareWatchlists(ctx(watchlistId, ["INFY"], { compareSymbols: [] }));
      expect(view.empty).toBe(true);
    });

    it("returns empty comparison without enough tickers", () => {
      const view = compareCompanies(ctx(watchlistId, ["INFY"], { compareTickers: ["INFY"] }));
      expect(view.empty).toBe(true);
    });
  });

  describe("research companion", () => {
    it("suggests reports earnings and screening routes", () => {
      const view = getResearchCompanion(ctx(watchlistId));
      expect(view.empty).toBe(false);
      expect(view.suggestions.length).toBeGreaterThan(0);
      expect(view.suggestions.some((s) => s.kind === "report")).toBe(true);
    });

    it("surfaces related companies by sector", () => {
      const view = getResearchCompanion(ctx(watchlistId));
      expect(view.relatedCompanies.length).toBeGreaterThan(0);
    });

    it("returns no suggestions empty state", () => {
      const view = getResearchCompanion({ symbols: [], now: NOW });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(WATCHLIST_COPILOT_EMPTY.noSuggestions);
    });
  });

  describe("presentation", () => {
    it("executive summary provides paragraph and priority actions", () => {
      const summary = getExecutiveSummary(ctx(watchlistId));
      expect(summary.empty).toBe(false);
      expect(summary.paragraph.length).toBeGreaterThan(0);
      expect(summary.priorityActions.length).toBeGreaterThan(0);
    });

    it("empty copilot bundle surfaces route hints", () => {
      const bundle = emptyCopilotBundle();
      expect(bundle.empty).toBe(true);
      expect(bundle.surfaceHints.research).toBe("/research");
    });

    it("getWatchlistCopilot composes full bundle", () => {
      const bundle = getWatchlistCopilot(ctx(watchlistId));
      expect(bundle.empty).toBe(false);
      expect(bundle.brief.empty).toBe(false);
      expect(bundle.decisions.decisions.length).toBeGreaterThan(0);
    });
  });

  describe("regression", () => {
    it("copilot health reports readiness and counts", () => {
      const health = getWatchlistCopilotHealth(ctx(watchlistId));
      expect(health.ready).toBe(true);
      expect(health.briefReady).toBe(true);
      expect(health.sprint10BR6Frozen).toBe(true);
      expect(isSprint10BR6Frozen()).toBe(true);
    });

    it("reset clears copilot orchestrator", () => {
      getWatchlistCopilot(ctx(watchlistId));
      resetWatchlistCopilot();
      expect(getWatchlistCopilotHealth(ctx(watchlistId)).ready).toBe(true);
    });
  });
});
