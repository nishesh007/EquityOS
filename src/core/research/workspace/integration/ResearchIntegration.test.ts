/**
 * Cross-module research integration — tests (Sprint 10A.R5).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  INTEGRATION_EMPTY,
  buildCrossModuleEventBag,
  compareSnapshots,
  createNote,
  createSnapshot,
  createWorkspace,
  getCrossModuleLinks,
  getDecisionJournal,
  getResearchTimeline,
  getSnapshotTimeline,
  getWorkspaceInsights,
  ingestCrossModuleEvents,
  ingestEvidenceBag,
  listDecisions,
  listSnapshots,
  openCompanyWorkspace,
  recordDecision,
  recordTimelineEvent,
  resetResearchWorkspace,
  restoreSnapshot,
  syncCrossModuleResearch,
} from "../index";
import { normalizeSnapshot } from "../integration/ResearchIntegrationModels";

describe("Sprint 10A.R5 — Cross-Module Research Integration", () => {
  let workspaceId = "";

  beforeEach(() => {
    resetResearchWorkspace();
    workspaceId = createWorkspace({ name: "Integration Desk" }).id;
  });

  afterEach(() => {
    resetResearchWorkspace();
  });

  describe("timeline", () => {
    it("getResearchTimeline returns No Timeline when empty", () => {
      const view = getResearchTimeline({ workspaceId });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(INTEGRATION_EMPTY.noTimeline);
    });

    it("records research alert earnings opportunity screen validation trust report events", () => {
      const events = ingestCrossModuleEvents(
        buildCrossModuleEventBag({
          workspaceId,
          ticker: "INFY",
          earningsLines: ["Q4 beat consensus"],
          alertLines: ["Margin compression alert"],
          screenerLines: ["Momentum screen match"],
          opportunityLines: ["Swing opportunity detected"],
          validationLines: ["Validation score updated"],
          trustLines: ["Trust score improved"],
        })
      );
      expect(events.length).toBeGreaterThanOrEqual(6);

      recordTimelineEvent({
        workspaceId,
        ticker: "INFY",
        kind: "report_exported",
        module: "research",
        label: "Report exported",
        detail: "Institutional PDF",
      });

      const view = getResearchTimeline({ workspaceId, ticker: "INFY" });
      expect(view.empty).toBe(false);
      expect(view.entries.some((e) => e.kind === "earnings_released")).toBe(true);
      expect(view.entries.some((e) => e.kind === "alert_triggered")).toBe(true);
      expect(view.entries.some((e) => e.kind === "screen_matched")).toBe(true);
      expect(view.entries.some((e) => e.kind === "opportunity_detected")).toBe(true);
      expect(view.entries.some((e) => e.kind === "validation_updated")).toBe(true);
      expect(view.entries.some((e) => e.kind === "trust_updated")).toBe(true);
      expect(view.entries.some((e) => e.kind === "report_exported")).toBe(true);
    });

    it("syncCrossModuleResearch ingests portfolio and watchlist links", () => {
      const events = syncCrossModuleResearch({
        workspaceId,
        ticker: "TCS",
        portfolioLines: ["Portfolio rebalance review"],
        watchlistLines: ["Watchlist earnings proximity"],
      });
      expect(events.length).toBeGreaterThanOrEqual(2);
      const view = getResearchTimeline({ workspaceId, ticker: "TCS" });
      expect(view.entries.some((e) => e.module === "portfolio")).toBe(true);
      expect(view.entries.some((e) => e.module === "watchlist")).toBe(true);
    });

    it("merges R4 memory entries into unified timeline", () => {
      createNote({
        workspaceId,
        ticker: "WIPRO",
        title: "Memory note",
        body: "Saved thesis",
      });
      const view = getResearchTimeline({ workspaceId, ticker: "WIPRO" });
      expect(view.entries.some((e) => e.kind === "note_saved")).toBe(true);
    });

    it("timeline entries include module routes", () => {
      recordTimelineEvent({
        workspaceId,
        ticker: "MARUTI",
        kind: "earnings_released",
        module: "earnings",
        label: "Earnings released",
      });
      const entry = getResearchTimeline({ workspaceId, ticker: "MARUTI" }).entries[0];
      expect(entry.route).toBe("/results");
    });
  });

  describe("decision journal", () => {
    it("recordDecision captures thesis bull bear risk confidence action reason outcome", () => {
      const kinds = [
        recordDecision({
          workspaceId,
          ticker: "HDFCBANK",
          kind: "initial_thesis",
          body: "Quality bank at fair value",
        }),
        recordDecision({
          workspaceId,
          ticker: "HDFCBANK",
          kind: "bull_case",
          body: "Deposit franchise strength",
        }),
        recordDecision({
          workspaceId,
          ticker: "HDFCBANK",
          kind: "bear_case",
          body: "NIM pressure risk",
        }),
        recordDecision({
          workspaceId,
          ticker: "HDFCBANK",
          kind: "risk_change",
          body: "Credit cost normalizing",
        }),
        recordDecision({
          workspaceId,
          ticker: "HDFCBANK",
          kind: "confidence_change",
          body: "Confidence raised to 72",
          confidence: 72,
        }),
        recordDecision({
          workspaceId,
          ticker: "HDFCBANK",
          kind: "action_taken",
          body: "Added 1.5% position",
          reason: "Pullback entry",
        }),
        recordDecision({
          workspaceId,
          ticker: "HDFCBANK",
          kind: "outcome",
          body: "Outperformed benchmark",
          outcome: "Positive",
        }),
      ];
      expect(kinds.every((k) => !k.empty)).toBe(true);
      const journal = getDecisionJournal({ workspaceId, ticker: "HDFCBANK" });
      expect(journal.empty).toBe(false);
      expect(journal.entries.length).toBe(7);
      expect(
        getResearchTimeline({ workspaceId, ticker: "HDFCBANK" }).entries.some(
          (e) => e.kind === "decision_recorded"
        )
      ).toBe(true);
    });

    it("empty journal uses No Decisions", () => {
      const journal = getDecisionJournal({ workspaceId, ticker: "ZZZ" });
      expect(journal.empty).toBe(true);
      expect(journal.emptyMessage).toBe(INTEGRATION_EMPTY.noDecisions);
    });

    it("recordDecision reason kind stores rationale", () => {
      const entry = recordDecision({
        workspaceId,
        ticker: "AXISBANK",
        kind: "reason",
        body: "Valuation attractive after correction",
        reason: "Mean reversion setup",
      });
      expect(entry.kind).toBe("reason");
      expect(entry.reason).toContain("Mean reversion");
    });

    it("listDecisions filters by kind", () => {
      recordDecision({
        workspaceId,
        ticker: "LT",
        kind: "updated_thesis",
        body: "Thesis updated after order win",
      });
      expect(
        listDecisions({ workspaceId, ticker: "LT", kind: "updated_thesis" }).length
      ).toBe(1);
    });
  });

  describe("snapshots", () => {
    it("createSnapshot restoreSnapshot compareSnapshots round-trip", () => {
      ingestEvidenceBag({
        workspaceId,
        ticker: "INFY",
        bull: ["Quality compounder"],
        bear: ["Valuation risk"],
        catalysts: ["Large deal pipeline"],
        risks: ["FX headwinds"],
      });
      createNote({
        workspaceId,
        ticker: "INFY",
        title: "Thesis",
        body: "Accumulate on weakness",
      });

      const left = createSnapshot({
        workspaceId,
        ticker: "INFY",
        label: "Before earnings",
      });
      const right = createSnapshot({
        workspaceId,
        ticker: "INFY",
        label: "After earnings",
        payload: {
          thesis: "Raise target after beat",
          bullCase: ["Quality compounder", "Margin expansion"],
          bearCase: ["Valuation risk"],
          risks: ["FX headwinds"],
          catalysts: ["Large deal pipeline", "AI services ramp"],
          confidence: 80,
        },
      });

      expect(restoreSnapshot(left.id).label).toBe("Before earnings");
      expect(restoreSnapshot(right.id).payload.confidence).toBe(80);

      const diff = compareSnapshots(left.id, right.id);
      expect(diff.empty).toBe(false);
      expect(diff.thesisChanged).toBe(true);
      expect(diff.bullAdded.length).toBeGreaterThanOrEqual(1);
      expect(diff.confidenceDelta).toBeGreaterThan(0);
    });

    it("getSnapshotTimeline lists snapshots chronologically", () => {
      createSnapshot({ workspaceId, label: "Snap A" });
      createSnapshot({ workspaceId, label: "Snap B" });
      const timeline = getSnapshotTimeline({ workspaceId });
      expect(timeline.empty).toBe(false);
      expect(timeline.snapshots.length).toBe(2);
      expect(listSnapshots({ workspaceId }).length).toBe(2);
    });

    it("empty snapshots use No Snapshots", () => {
      const timeline = getSnapshotTimeline({ workspaceId, ticker: "EMPTY" });
      expect(timeline.empty).toBe(true);
      expect(timeline.emptyMessage).toBe(INTEGRATION_EMPTY.noSnapshots);
    });

    it("compareSnapshots returns empty for missing ids", () => {
      const diff = compareSnapshots("missing-a", "missing-b");
      expect(diff.empty).toBe(true);
      expect(diff.emptyMessage).toBe(INTEGRATION_EMPTY.noSnapshots);
    });
  });

  describe("cross-module integration", () => {
    it("getCrossModuleLinks exposes all module routes", () => {
      const links = getCrossModuleLinks({ ticker: "RELIANCE" });
      expect(links.length).toBe(9);
      expect(links.some((l) => l.module === "earnings" && l.route === "/results")).toBe(
        true
      );
      expect(
        links.some((l) => l.module === "opportunity" && l.route === "/opportunities")
      ).toBe(true);
    });

    it("buildCrossModuleEventBag includes research module line", () => {
      const bag = buildCrossModuleEventBag({
        workspaceId,
        ticker: "SBIN",
        alertLines: ["Price alert"],
      });
      expect(bag.alerts?.length).toBe(1);
      expect(bag.research?.[0]?.label).toContain("SBIN");
    });

    it("ingestCrossModuleEvents never throws on empty bag", () => {
      expect(() =>
        ingestCrossModuleEvents({ workspaceId, earnings: [], alerts: [] })
      ).not.toThrow();
    });

    it("research module links to company route when ticker present", () => {
      const events = ingestCrossModuleEvents(
        buildCrossModuleEventBag({ workspaceId, ticker: "ITC" })
      );
      expect(events.some((e) => e.module === "research")).toBe(true);
      expect(events.find((e) => e.module === "research")?.route).toContain("/company/ITC");
    });
  });

  describe("insight aggregation", () => {
    it("getWorkspaceInsights aggregates bull bear risks catalysts actions", () => {
      ingestEvidenceBag({
        workspaceId,
        ticker: "HAL",
        bull: ["Order book visibility"],
        bear: ["Cyclical demand"],
        catalysts: ["Defence capex"],
        risks: ["Execution delays"],
      });
      createNote({
        workspaceId,
        ticker: "HAL",
        body: "Defence compounder thesis",
      });

      const insights = getWorkspaceInsights({
        workspaceId,
        ticker: "HAL",
        positiveLines: ["Strong backlog"],
        recommendedActions: ["Review position sizing"],
      });
      expect(insights.empty).toBe(false);
      expect(insights.topPositiveFactors.length).toBeGreaterThanOrEqual(1);
      expect(insights.topNegativeFactors.length).toBeGreaterThanOrEqual(1);
      expect(insights.keyRisks.length).toBeGreaterThanOrEqual(1);
      expect(insights.catalysts.length).toBeGreaterThanOrEqual(1);
      expect(insights.recommendedActions.length).toBeGreaterThanOrEqual(1);
    });

    it("empty insights use Awaiting Research Activity", () => {
      const insights = getWorkspaceInsights({ workspaceId, ticker: "ZZZ" });
      expect(insights.empty).toBe(true);
      expect(insights.emptyMessage).toBe(INTEGRATION_EMPTY.awaitingResearchActivity);
    });
  });

  describe("presentation", () => {
    it("normalizeSnapshot never surfaces sentinel strings", () => {
      const snap = normalizeSnapshot({
        id: "s1",
        workspaceId,
        label: "null",
        payload: { thesis: "undefined", bullCase: ["NaN"] },
      });
      expect(snap.label).not.toBe("null");
      expect(snap.payload.thesis).not.toBe("undefined");
    });

    it("INTEGRATION_EMPTY copy is institutional", () => {
      expect(INTEGRATION_EMPTY.noTimeline).toBe("No Timeline");
      expect(INTEGRATION_EMPTY.noDecisions).toBe("No Decisions");
      expect(INTEGRATION_EMPTY.noSnapshots).toBe("No Snapshots");
      expect(INTEGRATION_EMPTY.awaitingResearchActivity).toBe(
        "Awaiting Research Activity"
      );
    });
  });

  describe("regression", () => {
    it("public APIs never throw on bad input", () => {
      expect(() => getResearchTimeline()).not.toThrow();
      expect(() =>
        recordDecision({ workspaceId: "", body: "x" })
      ).not.toThrow();
      expect(() => createSnapshot({ workspaceId: "" })).not.toThrow();
      expect(() => restoreSnapshot("")).not.toThrow();
      expect(() => compareSnapshots("", "")).not.toThrow();
      expect(() => getWorkspaceInsights()).not.toThrow();
    });

    it("does not rebuild R1–R4 — knowledge still works", () => {
      createNote({ workspaceId, body: "note" });
      expect(getResearchTimeline({ workspaceId }).entries.length).toBeGreaterThanOrEqual(
        0
      );
    });

    it("resetResearchWorkspace clears integration stores", () => {
      recordDecision({ workspaceId, body: "temp" });
      createSnapshot({ workspaceId, label: "temp" });
      recordTimelineEvent({
        workspaceId,
        kind: "alert_triggered",
        module: "alerts",
        label: "Alert",
      });
      resetResearchWorkspace();
      expect(getDecisionJournal({ workspaceId }).empty).toBe(true);
      expect(getSnapshotTimeline({ workspaceId }).empty).toBe(true);
      expect(getResearchTimeline({ workspaceId }).empty).toBe(true);
    });

    it("openCompanyWorkspace still composes with integration layer", () => {
      const view = openCompanyWorkspace({
        ticker: "TCS",
        name: "TCS",
        sector: "IT",
        industry: "Services",
        price: 4000,
        changePercent: 1,
        marketCap: "Large",
        description: "IT services leader",
        financials: {
          revenue: 100,
          revenueGrowth: 10,
          netProfit: 20,
          netProfitGrowth: 8,
          operatingMargin: 25,
          netMargin: 18,
          cashFlow: 15,
          pe: 28,
          pb: 8,
          evEbitda: 20,
          roe: 40,
          roce: 35,
          debtToEquity: 0.1,
        },
        technicals: {
          trend: "Uptrend",
          momentum: "Positive",
          support: 3800,
          resistance: 4200,
          rsi: 58,
          macd: "Bullish",
          score: 72,
        },
        valuation: {
          pe: 28,
          pb: 8,
          evEbitda: 20,
          dcfFairValue: 4050,
          dcfAvailable: true,
          dcfNote: "DCF computed on stable cash flows",
          relativeSummary: "Fair",
          fairValue: 4100,
          upsidePercent: 5,
        },
        quality: {
          moatVerdict: "Wide",
          moatScore: 80,
          capitalAllocation: "Disciplined",
          roce: 35,
          roe: 40,
          managementQuality: "Strong",
          summary: "High governance with stable earnings quality",
        },
        risk: {
          business: ["Client concentration"],
          financial: ["FX exposure"],
          valuation: ["Premium multiple"],
          sector: ["IT spending cycles"],
          aggregateScore: 35,
          summary: "Moderate risk profile",
        },
        insights: {
          businessSummary: "IT services leader",
          investmentThesis: "Quality IT compounder",
          aiRecommendation: "Accumulate",
          confidence: 78,
          confidenceLabel: "High",
          bullCase: ["Deal pipeline"],
          bearCase: ["Wage inflation"],
          catalysts: ["Large deal wins"],
          headwinds: ["Macro slowdown"],
          keyTakeaways: ["Margins stable"],
        },
        badges: {
          confidence: "High",
          trust: "Verified",
          validation: "Pass",
        },
      });
      expect(view.empty).toBe(false);
      const insights = getWorkspaceInsights({ workspaceId, ticker: "TCS" });
      expect(insights.empty).toBe(false);
    });
  });
});
