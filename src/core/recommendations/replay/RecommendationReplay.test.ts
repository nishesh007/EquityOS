import { beforeEach, describe, expect, it } from "vitest";
import {
  advanceRecommendation,
  calculateHealthForRecommendation,
  createLivingRecommendation,
  createRecommendation,
  registerRecommendationLifecycle,
  resetRecommendationRegistry,
  updateRecommendationStatus,
  type CreateRecommendationSnapshotInput,
} from "../index";
import {
  RECOMMENDATION_REPLAY_EMPTY,
  compareRecommendation,
  getDecisionJournal,
  getRecommendationAudit,
  getRecommendationLessons,
  getRecommendationReplay,
  presentDecisionJournal,
  presentRecommendationAudit,
  presentRecommendationReplayCard,
  presentRecommendationReplayDetail,
  presentRecommendationReplayForSurface,
  replayRecommendationSnapshot,
  resetRecommendationReplay,
  wireReplayCompany,
  wireReplayDashboard,
  wireReplayHistory,
  wireReplayPortfolio,
  wireReplayRecommendationCenter,
  wireReplayResearch,
  wireReplaySurface,
  wireReplayWatchlists,
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
    aiVersion: "9F.1.R4",
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
    riskFactors: ["Near Resistance"],
    technicalSnapshot: { rsi: 61, trend: { direction: "UP" } },
    fundamentalSnapshot: { qualityScore: 82 },
    marketSnapshot: { regime: "RISK_ON" },
    sectorSnapshot: { sector: "Auto", strength: 76 },
  };
}

beforeEach(() => {
  resetRecommendationRegistry();
  resetRecommendationReplay();
});

describe("Decision Journal", () => {
  it("stores original conviction, trust, validation, entry, stop, targets and reasons", () => {
    const snapshot = createRecommendation(input());
    const journal = getDecisionJournal(snapshot.recommendationId);
    expect(journal).toMatchObject({
      originalConviction: 93,
      originalTrust: 91,
      originalValidation: 88,
      originalEntryLow: 920,
      originalEntryHigh: 940,
      originalStop: 875,
      aiVersion: "9F.1.R4",
      modelVersion: "9F.1.R4",
      timestamp: snapshot.generatedAt,
    });
    expect(journal?.originalTargets).toEqual([1_000, 1_060]);
    expect(journal?.originalReasons).toEqual([
      "Trend above 50 EMA",
      "Sector Leadership",
    ]);
  });

  it("captures original indicators and market/sector/technical/fundamental state", () => {
    const snapshot = createRecommendation(input());
    const journal = getDecisionJournal(snapshot.recommendationId)!;
    expect(journal.originalIndicators).toMatchObject({ rsi: 61 });
    expect(journal.originalMarketState).toMatchObject({ regime: "RISK_ON" });
    expect(journal.originalSectorState).toMatchObject({ sector: "Auto" });
    expect(journal.originalTechnicalState).toMatchObject({ rsi: 61 });
    expect(journal.originalFundamentalState).toMatchObject({ qualityScore: 82 });
  });

  it("never rewrites the journal when lifecycle and health evolve", () => {
    const living = createLivingRecommendation(input());
    const before = getDecisionJournal(living.recommendationId)!;
    advanceRecommendation({
      recommendationId: living.recommendationId,
      toState: "ENTRY_TRIGGERED",
    });
    calculateHealthForRecommendation(living.recommendationId, {
      momentum: 60,
      trend: 62,
    });
    const after = getDecisionJournal(living.recommendationId)!;
    expect(after.originalConviction).toBe(before.originalConviction);
    expect(after.originalReasons).toEqual(before.originalReasons);
    expect(after.timestamp).toBe(before.timestamp);
  });
});

describe("Recommendation Replay Engine", () => {
  it("replays recommendation snapshot, reasons, indicators and decision", () => {
    const snapshot = createRecommendation(input());
    registerRecommendationLifecycle(snapshot);
    const replay = getRecommendationReplay(snapshot.recommendationId)!;
    expect(replay.snapshot).toBe(snapshot);
    expect(replay.reasons).toEqual(snapshot.reasons);
    expect(replay.indicators).toMatchObject({ rsi: 61 });
    expect(replay.decision.whyAiRecommended[0]).toBe("Trend above 50 EMA");
    expect(replay.journal.recommendationId).toBe(snapshot.recommendationId);
  });

  it("replays timeline and lifecycle state from R2", () => {
    const living = createLivingRecommendation(input());
    advanceRecommendation({
      recommendationId: living.recommendationId,
      toState: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ACTIVE",
    });
    const replay = getRecommendationReplay(living.recommendationId)!;
    expect(replay.lifecycleState).toBe("ACTIVE");
    expect(replay.timeline.map((event) => event.state)).toContain("ENTRY_TRIGGERED");
    expect(replay.lifecycle?.snapshot.originalConviction).toBe(93);
  });

  it("replays health evolution from R3 without regenerating conviction", () => {
    const snapshot = createRecommendation(input());
    registerRecommendationLifecycle(snapshot);
    calculateHealthForRecommendation(snapshot.recommendationId, {
      momentum: 70,
      sectorLeadership: 65,
      relativeStrength: 66,
      marketRegime: 60,
    });
    const replay = getRecommendationReplay(snapshot.recommendationId)!;
    expect(replay.healthEvolution?.current.currentHealth).toBeLessThan(93);
    expect(replay.snapshot.originalConviction).toBe(93);
    expect(replay.healthExplanation).not.toBeNull();
  });

  it("supports replayRecommendationSnapshot composition helper", () => {
    const stored = createRecommendation(input("2026-07-18T10:00:02Z", "TCS"));
    const replay = replayRecommendationSnapshot(stored);
    expect(replay.recommendationId).toBe(stored.recommendationId);
    expect(Object.isFrozen(replay.snapshot)).toBe(true);
  });
});

describe("AI Accountability and Audit", () => {
  it("shows what AI saw, why recommended, what changed and final outcome", () => {
    const living = createLivingRecommendation(input());
    calculateHealthForRecommendation(living.recommendationId, {
      momentum: 60,
      trend: 88,
      notes: { Momentum: "Momentum weakening", Trend: "Trend still intact" },
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "STOP_LOSS_HIT",
    });
    const audit = getRecommendationAudit(living.recommendationId)!;
    expect(audit.accountability.whatAiSaw.length).toBeGreaterThan(0);
    expect(audit.accountability.whyAiRecommended).toContain("Trend above 50 EMA");
    expect(audit.accountability.whyHealthDeclined.join(" ")).toMatch(/Momentum/i);
    expect(audit.accountability.finalOutcome).toBe("Stop Loss Hit");
    expect(audit.snapshotFrozen).toBe(true);
  });

  it("maps lifecycle outcomes including Target hits, Expired, Invalidated and Manual Exit", () => {
    const a = createLivingRecommendation(input("2026-07-18T09:30:11Z", "A"));
    updateRecommendationStatus({
      recommendationId: a.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: a.recommendationId,
      status: "ACTIVE",
    });
    updateRecommendationStatus({
      recommendationId: a.recommendationId,
      status: "TARGET_1_HIT",
    });
    expect(getRecommendationReplay(a.recommendationId)?.outcome).toBe("Target 1 Hit");

    const b = createLivingRecommendation(input("2026-07-18T09:30:12Z", "B"));
    updateRecommendationStatus({
      recommendationId: b.recommendationId,
      status: "EXPIRED",
    });
    expect(getRecommendationReplay(b.recommendationId)?.outcome).toBe("Expired");

    const c = createLivingRecommendation(input("2026-07-18T09:30:13Z", "C"));
    updateRecommendationStatus({
      recommendationId: c.recommendationId,
      status: "INVALIDATED",
    });
    expect(getRecommendationReplay(c.recommendationId)?.outcome).toBe("Invalidated");

    const d = createLivingRecommendation(input("2026-07-18T09:30:14Z", "D"));
    updateRecommendationStatus({
      recommendationId: d.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: d.recommendationId,
      status: "ACTIVE",
    });
    updateRecommendationStatus({
      recommendationId: d.recommendationId,
      status: "MANUAL_EXIT",
    });
    expect(getRecommendationReplay(d.recommendationId)?.outcome).toBe("Manual Exit");
  });

  it("builds executive review with summary, confidence evolution, turning points and verdict", () => {
    const living = createLivingRecommendation(input());
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ACTIVE",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "TARGET_1_HIT",
    });
    calculateHealthForRecommendation(living.recommendationId, {
      momentum: 85,
      trend: 86,
    });
    const audit = getRecommendationAudit(living.recommendationId)!;
    expect(audit.executiveReview.recommendationSummary).toMatch(/TATAMOTORS/);
    expect(audit.executiveReview.confidenceEvolution).toMatch(/93/);
    expect(audit.executiveReview.majorTurningPoints.join(" ")).toMatch(/Target 1 Hit/);
    expect(audit.executiveReview.aiLessons.length).toBeGreaterThan(0);
    expect(audit.executiveReview.recommendationVerdict).toBe("Validated");
  });
});

describe("Comparison", () => {
  it("compares original recommendation against current health and factors", () => {
    const snapshot = createRecommendation(input());
    registerRecommendationLifecycle(snapshot);
    calculateHealthForRecommendation(snapshot.recommendationId, {
      momentum: 70,
      trend: 72,
      risk: 55,
    });
    const comparison = compareRecommendation(snapshot.recommendationId, {
      trendLabel: "UP",
    })!;
    expect(comparison.originalConviction).toBe(93);
    expect(comparison.currentHealth).not.toBeNull();
    expect(comparison.originalReasons[0]).toBe("Trend above 50 EMA");
    expect(comparison.currentFactors.length).toBeGreaterThan(0);
    expect(comparison.originalTrend).toBe("UP");
    expect(comparison.currentTrend).toMatch(/Improving|Stable|Weakening/);
    expect(comparison.originalRisk).toContain("Near Resistance");
    expect(comparison.currentRisk).toBe(55);
  });
});

describe("Lessons and public API", () => {
  it("exposes getRecommendationLessons from audit outcomes", () => {
    const living = createLivingRecommendation(input());
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "STOP_LOSS_HIT",
    });
    const lessons = getRecommendationLessons(living.recommendationId);
    expect(lessons?.join(" ")).toMatch(/stop/i);
  });

  it("exposes getRecommendationReplay, getDecisionJournal, getRecommendationAudit, compareRecommendation, getRecommendationLessons", () => {
    const snapshot = createRecommendation(input("2026-07-18T09:31:00Z", "RELIANCE"));
    registerRecommendationLifecycle(snapshot);
    expect(getRecommendationReplay(snapshot.recommendationId)?.recommendationId).toBe(
      snapshot.recommendationId
    );
    expect(getDecisionJournal(snapshot.recommendationId)?.companySymbol).toBe("RELIANCE");
    expect(getRecommendationAudit(snapshot.recommendationId)?.snapshotFrozen).toBe(true);
    expect(compareRecommendation(snapshot.recommendationId)?.originalConviction).toBe(93);
    expect(getRecommendationLessons(snapshot.recommendationId)?.length).toBeGreaterThan(0);
  });
});

describe("Presentation and surface wiring", () => {
  it("provides required empty states", () => {
    expect(RECOMMENDATION_REPLAY_EMPTY).toEqual({
      noReplayAvailable: "No Replay Available",
      noJournal: "No Journal",
      noAudit: "No Audit",
      awaitingRecommendationHistory: "Awaiting Recommendation History",
    });
    expect(presentRecommendationReplayCard(undefined).emptyMessage).toBe(
      "No Replay Available"
    );
    expect(presentDecisionJournal(undefined).emptyMessage).toBe("No Journal");
    expect(presentRecommendationAudit(undefined).emptyMessage).toBe("No Audit");
    expect(presentRecommendationReplayDetail(undefined).emptyMessage).toBe(
      "Awaiting Recommendation History"
    );
  });

  it("presents replay cards with original conviction, current health, outcome and verdict", () => {
    const living = createLivingRecommendation(input());
    calculateHealthForRecommendation(living.recommendationId, {
      momentum: 70,
      trend: 71,
    });
    const replay = getRecommendationReplay(living.recommendationId)!;
    const card = presentRecommendationReplayCard(replay);
    expect(card.originalConviction).toBe(93);
    expect(card.currentHealth).not.toBeNull();
    expect(card.empty).toBe(false);
  });

  it("wires replay into Dashboard, Research, Company, Center, History, Replay, Portfolio and Watchlists", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:11Z", "INFY"));
    getRecommendationReplay(living.recommendationId);

    expect(wireReplayDashboard().surface).toBe("dashboard");
    expect(wireReplayResearch().empty).toBe(false);
    expect(wireReplayCompany("INFY").cards[0]?.symbol).toBe("INFY");
    expect(wireReplayRecommendationCenter().cards).toHaveLength(1);
    expect(wireReplayHistory().surface).toBe("history");
    expect(wireReplayPortfolio(["INFY"]).cards).toHaveLength(1);
    expect(wireReplayWatchlists(["INFY"]).cards).toHaveLength(1);

    const surface = wireReplaySurface(living.recommendationId);
    expect(surface.surface).toBe("replay");
    expect(surface.journal.empty).toBe(false);
    expect(surface.audit.empty).toBe(false);
  });

  it("returns awaiting history when no replays exist for a surface", () => {
    expect(
      presentRecommendationReplayForSurface("history", []).emptyMessage
    ).toBe("Awaiting Recommendation History");
  });

  it("preserves immutable snapshot identity across replay", () => {
    const snapshot = createRecommendation(input());
    registerRecommendationLifecycle(snapshot);
    const replay = getRecommendationReplay(snapshot.recommendationId)!;
    expect(replay.snapshot).toBe(snapshot);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(replay.audit.journal.originalConviction).toBe(snapshot.originalConviction);
  });
});

describe("Outcome review coverage", () => {
  it("supports Successful via EXITED lifecycle state", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:11Z", "OK"));
    for (const status of [
      "ENTRY_TRIGGERED",
      "ACTIVE",
      "TARGET_1_HIT",
      "TARGET_2_HIT",
      "TRAILING",
      "EXITED",
    ] as const) {
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status,
      });
    }
    expect(getRecommendationReplay(living.recommendationId)?.outcome).toBe(
      "Successful"
    );
  });

  it("supports Target 2 Hit outcome", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:12Z", "T2"));
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
    expect(getRecommendationReplay(living.recommendationId)?.outcome).toBe(
      "Target 2 Hit"
    );
  });

  it("supports Failed via CANCELLED", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:13Z", "FAIL"));
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "CANCELLED",
    });
    expect(getRecommendationReplay(living.recommendationId)?.outcome).toBe("Failed");
  });

  it("returns Pending when recommendation is still entry pending", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:14Z", "PEND"));
    expect(getRecommendationReplay(living.recommendationId)?.outcome).toBe("Pending");
  });

  it("marks Partially Successful when active with strong current health", () => {
    const living = createLivingRecommendation(input("2026-07-18T09:30:15Z", "PART"));
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ACTIVE",
    });
    calculateHealthForRecommendation(living.recommendationId, {
      momentum: 92,
      trend: 91,
      relativeStrength: 90,
      sectorLeadership: 89,
      marketRegime: 88,
    });
    expect(getRecommendationReplay(living.recommendationId)?.outcome).toBe(
      "Partially Successful"
    );
  });

  it("returns undefined public API results for unknown recommendation ids", () => {
    expect(getRecommendationReplay("REC-MISSING")).toBeUndefined();
    expect(getDecisionJournal("REC-MISSING")).toBeUndefined();
    expect(getRecommendationAudit("REC-MISSING")).toBeUndefined();
    expect(compareRecommendation("REC-MISSING")).toBeUndefined();
    expect(getRecommendationLessons("REC-MISSING")).toBeUndefined();
  });

  it("keeps original risk and reasons distinct from current comparison fields", () => {
    const snapshot = createRecommendation(input("2026-07-18T09:30:16Z", "CMP"));
    registerRecommendationLifecycle(snapshot);
    calculateHealthForRecommendation(snapshot.recommendationId, {
      momentum: 50,
      risk: 40,
    });
    const comparison = compareRecommendation(snapshot.recommendationId)!;
    expect(comparison.originalRisk).toEqual(["Near Resistance"]);
    expect(comparison.currentRisk).toBe(40);
    expect(comparison.originalReasons).not.toEqual(comparison.currentFactors);
  });
});
