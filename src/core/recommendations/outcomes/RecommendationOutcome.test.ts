import { beforeEach, describe, expect, it } from "vitest";
import {
  advanceRecommendation,
  calculateHealthForRecommendation,
  createLivingRecommendation,
  createRecommendation,
  getLivingRecommendation,
  getRecommendationHealth,
  registerRecommendationLifecycle,
  resetRecommendationRegistry,
  updateRecommendationStatus,
  type CreateRecommendationSnapshotInput,
} from "../index";
import {
  RECOMMENDATION_OUTCOME_EMPTY,
  evaluateAndStoreOutcome,
  evaluateRecommendationOutcome,
  getInstitutionalVerdict,
  getOutcomeSummary,
  getRecommendationOutcome,
  getRecommendationPerformance,
  presentHighestConvictionOutcomeCard,
  presentOutcomePanelRow,
  presentRecommendationOutcomesForSurface,
  resetRecommendationOutcomes,
  trackRecommendationTargets,
  wireOutcomeCompany,
  wireOutcomeDashboard,
  wireOutcomeHistory,
  wireOutcomePortfolio,
  wireOutcomeRecommendationCenter,
  wireOutcomeReplay,
  wireOutcomeResearch,
  wireOutcomeWatchlists,
} from "./index";

function input(
  generatedAt = "2026-07-18T09:30:11.000Z",
  symbol = "TATAMOTORS",
  conviction = 93
): CreateRecommendationSnapshotInput {
  return {
    company: { symbol, name: "Tata Motors", exchange: "NSE" },
    strategy: "Swing",
    generatedAt,
    generatedByEngine: "Swing",
    aiVersion: "9F.1.R5",
    originalConviction: conviction,
    originalTrust: 91,
    originalValidation: {
      validationStatus: "APPROVED",
      overallValidationScore: 88,
    },
    entryRange: { low: 920, high: 940 },
    stopLoss: 875,
    targets: [
      { price: 1_000, label: "T1" },
      { price: 1_060, label: "T2" },
    ],
    riskReward: 2.4,
    reasons: ["Trend above 50 EMA", "Sector Leadership"],
    convictionDrivers: ["Trend above 50 EMA", "Sector Leadership"],
    riskFactors: ["Near Resistance", "Weak Market Breadth"],
    technicalSnapshot: { rsi: 61 },
    fundamentalSnapshot: { qualityScore: 82 },
    marketSnapshot: { regime: "RISK_ON" },
    sectorSnapshot: { sector: "Auto", strength: 76 },
  };
}

function livingOf(id: string) {
  return getLivingRecommendation(id) ?? null;
}

beforeEach(() => {
  resetRecommendationRegistry();
  resetRecommendationOutcomes();
});

describe("RecommendationOutcomeEngine", () => {
  it("keeps evaluation recommendation-centric with expected holding period visible", () => {
    const living = createLivingRecommendation(input());
    const outcome = evaluateAndStoreOutcome({
      snapshot: living.snapshot,
      lifecycle: living,
    });
    expect(outcome.expectedHoldingPeriod).toBe("5–15 Trading Days");
    expect(outcome.strategy).toBe("Swing");
    expect(outcome.originalConviction).toBe(93);
    expect(outcome.state).toBe("Pending Entry");
    expect(outcome.snapshot).toBe(living.snapshot);
  });

  it("maps lifecycle states onto institutional outcome states", () => {
    const living = createLivingRecommendation(input());
    advanceRecommendation({
      recommendationId: living.recommendationId,
      toState: "ENTRY_TRIGGERED",
    });
    let outcome = evaluateAndStoreOutcome({
      snapshot: living.snapshot,
      lifecycle: livingOf(living.recommendationId),
    });
    expect(outcome.state).toBe("Entry Triggered");

    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ACTIVE",
    });
    outcome = evaluateAndStoreOutcome({
      snapshot: living.snapshot,
      lifecycle: livingOf(living.recommendationId),
    });
    expect(outcome.state).toBe("Running");
  });

  it("exposes getRecommendationOutcome after evaluation", () => {
    const snapshot = createRecommendation(input());
    registerRecommendationLifecycle(snapshot);
    evaluateAndStoreOutcome({
      snapshot,
      lifecycle: livingOf(snapshot.recommendationId),
      path: { currentPrice: 930, highSinceEntry: 950, lowSinceEntry: 920 },
    });
    const stored = getRecommendationOutcome(snapshot.recommendationId);
    expect(stored?.recommendationId).toBe(snapshot.recommendationId);
    expect(stored?.performance.currentReturnPercent).not.toBeNull();
  });
});

describe("Target tracking", () => {
  it("tracks Entry → Target 1 → Target 2 using lifecycle, not today's candle alone", () => {
    const living = createLivingRecommendation(input());
    for (const status of [
      "ENTRY_TRIGGERED",
      "ACTIVE",
      "TARGET_1_HIT",
      "TARGET_2_HIT",
    ] as const) {
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status,
      });
    }
    const targets = trackRecommendationTargets(
      living.snapshot,
      livingOf(living.recommendationId)
    );
    expect(targets.entryTriggered).toBe(true);
    expect(targets.target1Hit).toBe(true);
    expect(targets.target2Hit).toBe(true);
    expect(targets.targetProgressPercent).toBe(100);
  });

  it("detects stop loss via lifecycle state", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:12Z", "SL"));
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "STOP_LOSS_HIT",
    });
    const targets = trackRecommendationTargets(
      living.snapshot,
      livingOf(living.recommendationId)
    );
    expect(targets.stopLossHit).toBe(true);
  });

  it("uses supplied price path distances without inventing OHLC", () => {
    const snapshot = createRecommendation(input("2026-07-18T09:30:13Z", "PATH"));
    const targets = trackRecommendationTargets(snapshot, null, {
      currentPrice: 980,
    });
    expect(targets.distanceToTarget1).toBe(20);
    expect(targets.distanceToStop).toBe(105);
  });
});

describe("Institutional verdict — no fake A/B/C/D grades", () => {
  it("returns Outstanding for Target 2 Hit", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:11Z", "A"));
    for (const status of [
      "ENTRY_TRIGGERED",
      "ACTIVE",
      "TARGET_1_HIT",
      "TARGET_2_HIT",
    ] as const) {
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status,
      });
    }
    const outcome = evaluateRecommendationOutcome({
      snapshot: living.snapshot,
      lifecycle: livingOf(living.recommendationId),
    });
    expect(outcome.verdict).toBe("Outstanding");
    expect(["A", "B", "C", "D"]).not.toContain(outcome.verdict);
  });

  it("returns Failed for Stop Loss Hit", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:12Z", "B"));
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "STOP_LOSS_HIT",
    });
    const outcome = evaluateRecommendationOutcome({
      snapshot: living.snapshot,
      lifecycle: livingOf(living.recommendationId),
    });
    expect(outcome.verdict).toBe("Failed");
  });

  it("returns Invalidated when health is invalidated", () => {
    const snapshot = createRecommendation(input("2026-07-18T09:30:13Z", "C"));
    registerRecommendationLifecycle(snapshot);
    calculateHealthForRecommendation(snapshot.recommendationId, {}, { invalidated: true });
    const outcome = evaluateRecommendationOutcome({
      snapshot,
      lifecycle: livingOf(snapshot.recommendationId),
      health: getRecommendationHealth(snapshot.recommendationId),
    });
    expect(outcome.verdict).toBe("Invalidated");
  });

  it("getInstitutionalVerdict derives from complete lifecycle evidence", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:14Z", "D"));
    for (const status of ["ENTRY_TRIGGERED", "ACTIVE", "TARGET_1_HIT"] as const) {
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status,
      });
    }
    const outcome = evaluateRecommendationOutcome({
      snapshot: living.snapshot,
      lifecycle: livingOf(living.recommendationId),
      path: { currentPrice: 1_020, highSinceEntry: 1_030, lowSinceEntry: 925 },
    });
    expect(
      getInstitutionalVerdict(outcome.state, outcome.performance)
    ).toMatch(/Successful|Partially Successful/);
  });
});

describe("Performance metrics and attribution", () => {
  it("tracks max gain, drawdown, current return, days, sessions and target progress", () => {
    const living = createLivingRecommendation(input());
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ACTIVE",
    });
    const outcome = evaluateAndStoreOutcome({
      snapshot: living.snapshot,
      lifecycle: livingOf(living.recommendationId),
      path: {
        currentPrice: 980,
        highSinceEntry: 1_010,
        lowSinceEntry: 910,
        asOf: "2026-07-21T09:30:11.000Z",
        sessionsActive: 3,
      },
    });
    expect(outcome.performance.maximumGainPercent).toBeGreaterThan(0);
    expect(outcome.performance.maximumDrawdownPercent).toBeLessThan(0);
    expect(outcome.performance.currentReturnPercent).toBeGreaterThan(0);
    expect(outcome.performance.daysActive).toBe(3);
    expect(outcome.performance.sessionsActive).toBe(3);
    expect(outcome.performance.holdingPeriod).toBe("5–15 Trading Days");
    expect(outcome.performance.targetProgressPercent).toBeGreaterThan(0);
  });

  it("generates succeeded / failed / running / missed / stopped / expired attribution", () => {
    const living = createLivingRecommendation(input());
    const running = evaluateRecommendationOutcome({
      snapshot: living.snapshot,
      lifecycle: living,
    });
    expect(running.attribution.stillRunningBecause.join(" ")).toMatch(
      /holding period|Trend|Sector/i
    );

    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "STOP_LOSS_HIT",
    });
    const stopped = evaluateRecommendationOutcome({
      snapshot: living.snapshot,
      lifecycle: livingOf(living.recommendationId),
    });
    expect(stopped.attribution.stoppedOutBecause.join(" ")).toMatch(/stop/i);
    expect(stopped.attribution.failedBecause.length).toBeGreaterThan(0);
  });

  it("exposes getRecommendationPerformance and getOutcomeSummary", () => {
    const a = createLivingRecommendation(input("2026-07-18T09:30:11Z", "S1"));
    for (const status of [
      "ENTRY_TRIGGERED",
      "ACTIVE",
      "TARGET_1_HIT",
      "TARGET_2_HIT",
    ] as const) {
      updateRecommendationStatus({ recommendationId: a.recommendationId, status });
    }
    evaluateAndStoreOutcome({
      snapshot: a.snapshot,
      lifecycle: livingOf(a.recommendationId),
      path: { currentPrice: 1_070, highSinceEntry: 1_070, lowSinceEntry: 930 },
    });

    const b = createLivingRecommendation(input("2026-07-18T09:30:12Z", "S2"));
    updateRecommendationStatus({
      recommendationId: b.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: b.recommendationId,
      status: "STOP_LOSS_HIT",
    });
    evaluateAndStoreOutcome({
      snapshot: b.snapshot,
      lifecycle: livingOf(b.recommendationId),
      path: { currentPrice: 870, highSinceEntry: 940, lowSinceEntry: 870 },
    });

    expect(getRecommendationPerformance(a.recommendationId)?.maximumGainPercent).not.toBeNull();
    const summary = getOutcomeSummary();
    expect(summary.total).toBe(2);
    expect(summary.target2Rate).toBeGreaterThan(0);
    expect(summary.stopLossRate).toBeGreaterThan(0);
    expect(summary.recommendationSuccessRate).toBeGreaterThanOrEqual(0);
  });
});

describe("Presentation and surface wiring", () => {
  it("provides required empty states", () => {
    expect(RECOMMENDATION_OUTCOME_EMPTY).toEqual({
      noCompletedRecommendations: "No Completed Recommendations",
      noRunningRecommendations: "No Running Recommendations",
      awaitingOutcome: "Awaiting Outcome",
      awaitingEntry: "Awaiting Entry",
    });
    expect(presentOutcomePanelRow(undefined).emptyMessage).toBe("Awaiting Outcome");
    expect(presentHighestConvictionOutcomeCard(undefined).emptyMessage).toBe(
      "Awaiting Entry"
    );
  });

  it("presents Trade Outcomes panel rows with institutional verdict instead of letter grades", () => {
    const living = createLivingRecommendation(input());
    for (const status of ["ENTRY_TRIGGERED", "ACTIVE", "TARGET_1_HIT"] as const) {
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status,
      });
    }
    const outcome = evaluateAndStoreOutcome({
      snapshot: living.snapshot,
      lifecycle: livingOf(living.recommendationId),
      path: { currentPrice: 1_010, highSinceEntry: 1_020, lowSinceEntry: 925 },
    });
    const row = presentOutcomePanelRow(outcome);
    expect(row.strategy).toBe("Swing");
    expect(row.expectedHoldingPeriod).toBe("5–15 Trading Days");
    expect(row.finalGrade).toMatch(/Successful|Outstanding|Partially Successful/);
    expect(["A", "B", "C", "D"]).not.toContain(row.finalGrade);
    expect(row.lifecycleBadge).toBe("Target 1 Hit");
  });

  it("presents Highest Conviction cards with conviction, health, holding period and progress — not today's P&L grade", () => {
    const living = createLivingRecommendation(input());
    calculateHealthForRecommendation(living.recommendationId, {
      momentum: 70,
      trend: 72,
    });
    const outcome = evaluateAndStoreOutcome({
      snapshot: living.snapshot,
      lifecycle: living,
      health: getRecommendationHealth(living.recommendationId),
      path: { currentPrice: 940 },
    });
    const card = presentHighestConvictionOutcomeCard(outcome);
    expect(card.originalConviction).toBe(93);
    expect(card.currentHealth).not.toBeNull();
    expect(card.expectedHoldingPeriod).toBe("5–15 Trading Days");
    expect(card.strategy).toBe("Swing");
    expect(card.lifecycleStatus).toBe("Pending Entry");
  });

  it("wires outcomes across Dashboard, Company, Research, Center, Portfolio, Replay, History and Watchlists", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:11Z", "INFY"));
    evaluateAndStoreOutcome({
      snapshot: living.snapshot,
      lifecycle: living,
      path: { currentPrice: 930 },
    });

    expect(wireOutcomeDashboard().surface).toBe("dashboard");
    expect(wireOutcomeCompany("INFY").rows[0]?.symbol).toBe("INFY");
    expect(wireOutcomeResearch().empty).toBe(false);
    expect(wireOutcomeRecommendationCenter().cards).toHaveLength(1);
    expect(wireOutcomePortfolio(["INFY"]).rows).toHaveLength(1);
    expect(wireOutcomeWatchlists(["INFY"]).cards).toHaveLength(1);
    expect(wireOutcomeReplay(living.recommendationId).row.finalGrade).toBeDefined();
    expect(wireOutcomeHistory().surface).toBe("history");
  });

  it("returns awaiting outcome when no assessments exist", () => {
    expect(
      presentRecommendationOutcomesForSurface("dashboard", []).emptyMessage
    ).toBe("Awaiting Outcome");
  });
});

describe("Public API coverage", () => {
  it("exposes getRecommendationOutcome, trackRecommendationTargets, getRecommendationPerformance, getInstitutionalVerdict, getOutcomeSummary", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:31:00Z", "RELIANCE"));
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    evaluateAndStoreOutcome({
      snapshot: living.snapshot,
      lifecycle: livingOf(living.recommendationId),
      path: { currentPrice: 935, highSinceEntry: 945, lowSinceEntry: 920 },
    });

    expect(getRecommendationOutcome(living.recommendationId)?.state).toBe(
      "Entry Triggered"
    );
    expect(
      trackRecommendationTargets(
        living.snapshot,
        livingOf(living.recommendationId)
      ).entryTriggered
    ).toBe(true);
    expect(
      getRecommendationPerformance(living.recommendationId)?.daysActive
    ).toBeGreaterThanOrEqual(0);
    expect(getOutcomeSummary().total).toBe(1);
  });

  it("never mutates the immutable recommendation snapshot during outcome evaluation", () => {
    const snapshot = createRecommendation(input());
    registerRecommendationLifecycle(snapshot);
    const first = evaluateAndStoreOutcome({
      snapshot,
      lifecycle: livingOf(snapshot.recommendationId),
      path: { currentPrice: 950 },
    });
    const second = evaluateAndStoreOutcome({
      snapshot,
      lifecycle: livingOf(snapshot.recommendationId),
      path: { currentPrice: 900 },
    });
    expect(first.snapshot).toBe(snapshot);
    expect(second.snapshot).toBe(snapshot);
    expect(snapshot.originalConviction).toBe(93);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("supports Expired and Manual Exit verdicts from complete lifecycle", () => {
    const expired = createLivingRecommendation(input("2026-07-18T09:30:15Z", "EXP"));
    updateRecommendationStatus({
      recommendationId: expired.recommendationId,
      status: "EXPIRED",
    });
    expect(
      evaluateRecommendationOutcome({
        snapshot: expired.snapshot,
        lifecycle: livingOf(expired.recommendationId),
      }).state
    ).toBe("Expired");

    const manual = createLivingRecommendation(input("2026-07-18T09:30:16Z", "MAN"));
    updateRecommendationStatus({
      recommendationId: manual.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: manual.recommendationId,
      status: "ACTIVE",
    });
    updateRecommendationStatus({
      recommendationId: manual.recommendationId,
      status: "MANUAL_EXIT",
    });
    expect(
      evaluateRecommendationOutcome({
        snapshot: manual.snapshot,
        lifecycle: livingOf(manual.recommendationId),
      }).state
    ).toBe("Manual Exit");
  });

  it("supports Cancelled and Archived outcome states", () => {
    const cancelled = createLivingRecommendation(input("2026-07-18T09:30:17Z", "CAN"));
    updateRecommendationStatus({
      recommendationId: cancelled.recommendationId,
      status: "CANCELLED",
    });
    expect(
      evaluateRecommendationOutcome({
        snapshot: cancelled.snapshot,
        lifecycle: livingOf(cancelled.recommendationId),
      }).state
    ).toBe("Cancelled");

    const archived = createLivingRecommendation(input("2026-07-18T09:30:18Z", "ARC"));
    updateRecommendationStatus({
      recommendationId: archived.recommendationId,
      status: "EXPIRED",
    });
    updateRecommendationStatus({
      recommendationId: archived.recommendationId,
      status: "ARCHIVED",
    });
    expect(
      evaluateRecommendationOutcome({
        snapshot: archived.snapshot,
        lifecycle: livingOf(archived.recommendationId),
      }).state
    ).toBe("Archived");
  });

  it("supports Trailing outcome state after Target 1", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:19Z", "TRL"));
    for (const status of [
      "ENTRY_TRIGGERED",
      "ACTIVE",
      "TARGET_1_HIT",
      "TRAILING",
    ] as const) {
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status,
      });
    }
    const outcome = evaluateRecommendationOutcome({
      snapshot: living.snapshot,
      lifecycle: livingOf(living.recommendationId),
    });
    expect(outcome.state).toBe("Trailing");
    expect(outcome.targets.trailing).toBe(true);
  });

  it("maps transitional session statuses to institutional verdicts without letter grades", async () => {
    const { institutionalVerdictFromSessionStatus } = await import("./index");
    expect(institutionalVerdictFromSessionStatus("target2_hit")).toBe("Outstanding");
    expect(institutionalVerdictFromSessionStatus("target1_hit")).toBe("Successful");
    expect(institutionalVerdictFromSessionStatus("stopped")).toBe("Failed");
    expect(institutionalVerdictFromSessionStatus("open")).toBe("Neutral");
    expect(["A", "B", "C", "D"]).not.toContain(
      institutionalVerdictFromSessionStatus("breakeven")
    );
  });

  it("includes expected holding period on every outcome panel and conviction card", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:20Z", "HOLD"));
    const outcome = evaluateAndStoreOutcome({
      snapshot: living.snapshot,
      lifecycle: living,
    });
    expect(presentOutcomePanelRow(outcome).expectedHoldingPeriod).toBe(
      "5–15 Trading Days"
    );
    expect(presentHighestConvictionOutcomeCard(outcome).expectedHoldingPeriod).toBe(
      "5–15 Trading Days"
    );
  });
});
