import { beforeEach, describe, expect, it } from "vitest";
import {
  createLivingRecommendation,
  createRecommendation,
  createRecommendationSnapshot,
  resetRecommendationRegistry,
  type CreateRecommendationSnapshotInput,
} from "../index";
import {
  RECOMMENDATION_LIFECYCLE_EMPTY,
  advanceRecommendation,
  archiveRecommendation,
  computeRecommendationProgress,
  displayStatusForState,
  expireRecommendation,
  getRecommendationProgress,
  getRecommendationStatus,
  getRecommendationTimeline,
  inferMarketDrivenState,
  listActiveLivingRecommendations,
  presentLifecycleCard,
  presentLifecycleForSurface,
  presentLifecycleProgress,
  presentLifecycleTimeline,
  registerRecommendationLifecycle,
  resetRecommendationLifecycle,
  resolveRecommendationDisplayStatus,
  updateRecommendationStatus,
} from "./index";

function input(
  generatedAt = "2026-07-18T09:30:11.000Z",
  symbol = "TATAMOTORS"
): CreateRecommendationSnapshotInput {
  return {
    company: { symbol, name: "Tata Motors", exchange: "NSE" },
    strategy: "Swing",
    generatedAt,
    generatedByEngine: "Swing",
    aiVersion: "9F.1.R2",
    originalConviction: 84,
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
    reasons: ["Momentum aligned", "Validation approved"],
    technicalSnapshot: { rsi: 61 },
    fundamentalSnapshot: { qualityScore: 82 },
    marketSnapshot: { regime: "RISK_ON" },
    sectorSnapshot: { sector: "Auto", strength: 76 },
  };
}

beforeEach(() => {
  resetRecommendationRegistry();
  resetRecommendationLifecycle();
});

describe("RecommendationLifecycleEngine", () => {

  it("registers an immutable snapshot at ENTRY_PENDING with Generated timeline event", () => {
    const living = createLivingRecommendation(input());
    expect(living.state).toBe("ENTRY_PENDING");
    expect(living.displayStatus).toBe("Entry Pending");
    expect(living.timeline[0].type).toBe("Recommendation Generated");
    expect(Object.isFrozen(living.snapshot)).toBe(true);
  });

  it("never mutates the original recommendation snapshot across transitions", () => {
    const living = createLivingRecommendation(input());
    const frozenConviction = living.snapshot.originalConviction;
    const frozenEntry = living.snapshot.entryRange.low;
    advanceRecommendation({
      recommendationId: living.recommendationId,
      toState: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ACTIVE",
    });
    expect(living.snapshot.originalConviction).toBe(frozenConviction);
    expect(living.snapshot.entryRange.low).toBe(frozenEntry);
    expect(Object.isFrozen(living.snapshot)).toBe(true);
  });

  it("advances through the happy-path lifecycle sequence", () => {
    const living = createLivingRecommendation(input());
    const id = living.recommendationId;
    expect(advanceRecommendation({ recommendationId: id }).state).toBe(
      "ENTRY_TRIGGERED"
    );
    expect(advanceRecommendation({ recommendationId: id }).state).toBe("ACTIVE");
    expect(advanceRecommendation({ recommendationId: id }).state).toBe(
      "TARGET_1_HIT"
    );
    expect(advanceRecommendation({ recommendationId: id }).state).toBe(
      "TARGET_2_HIT"
    );
    expect(advanceRecommendation({ recommendationId: id }).state).toBe("TRAILING");
    expect(advanceRecommendation({ recommendationId: id }).state).toBe("EXITED");
    expect(advanceRecommendation({ recommendationId: id }).state).toBe("EXPIRED");
    expect(advanceRecommendation({ recommendationId: id }).state).toBe("ARCHIVED");
  });

  it("rejects invalid lifecycle transitions", () => {
    const living = createLivingRecommendation(input());
    expect(() =>
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status: "TARGET_2_HIT",
      })
    ).toThrow(/Invalid lifecycle transition/);
  });

  it("supports alternative states: INVALIDATED, STOP_LOSS_HIT, MANUAL_EXIT, CANCELLED, REJECTED", () => {
    const a = createLivingRecommendation(input("2026-07-18T09:30:11Z", "A"));
    expect(
      updateRecommendationStatus({
        recommendationId: a.recommendationId,
        status: "INVALIDATED",
      }).state
    ).toBe("INVALIDATED");

    const b = createLivingRecommendation(input("2026-07-18T09:30:12Z", "B"));
    advanceRecommendation({
      recommendationId: b.recommendationId,
      toState: "ENTRY_TRIGGERED",
    });
    expect(
      updateRecommendationStatus({
        recommendationId: b.recommendationId,
        status: "STOP_LOSS_HIT",
      }).displayStatus
    ).toBe("Stopped Out");

    const c = createLivingRecommendation(input("2026-07-18T09:30:13Z", "C"));
    advanceRecommendation({
      recommendationId: c.recommendationId,
      toState: "ENTRY_TRIGGERED",
    });
    advanceRecommendation({ recommendationId: c.recommendationId, toState: "ACTIVE" });
    expect(
      updateRecommendationStatus({
        recommendationId: c.recommendationId,
        status: "MANUAL_EXIT",
      }).timeline.at(-1)?.type
    ).toBe("Manual Exit");

    const d = createLivingRecommendation(input("2026-07-18T09:30:14Z", "D"));
    expect(
      updateRecommendationStatus({
        recommendationId: d.recommendationId,
        status: "CANCELLED",
      }).state
    ).toBe("CANCELLED");

    const e = createLivingRecommendation(input("2026-07-18T09:30:15Z", "E"));
    expect(
      updateRecommendationStatus({
        recommendationId: e.recommendationId,
        status: "REJECTED",
      }).state
    ).toBe("REJECTED");
  });

  it("expires then archives without deleting the snapshot", () => {
    const living = createLivingRecommendation(input());
    const expired = expireRecommendation(living.recommendationId);
    expect(expired.state).toBe("EXPIRED");
    const archived = archiveRecommendation(living.recommendationId);
    expect(archived.state).toBe("ARCHIVED");
    expect(archived.snapshot.recommendationId).toBe(living.recommendationId);
    expect(listActiveLivingRecommendations()).toHaveLength(0);
  });

  it("archives an active recommendation via Expired before Archived", () => {
    const living = createLivingRecommendation(input());
    const archived = archiveRecommendation(living.recommendationId);
    expect(archived.state).toBe("ARCHIVED");
    expect(archived.timeline.map((event) => event.state)).toEqual([
      "GENERATED",
      "ENTRY_PENDING",
      "EXPIRED",
      "ARCHIVED",
    ]);
  });
});

describe("RecommendationStatusEngine", () => {
  it("maps lifecycle states to institutional display statuses", () => {
    expect(displayStatusForState("ENTRY_PENDING")).toBe("Entry Pending");
    expect(displayStatusForState("ENTRY_TRIGGERED")).toBe("Entry Triggered");
    expect(displayStatusForState("ACTIVE")).toBe("Running");
    expect(displayStatusForState("TARGET_1_HIT")).toBe("Target 1 Completed");
    expect(displayStatusForState("TARGET_2_HIT")).toBe("Target 2 Completed");
    expect(displayStatusForState("TRAILING")).toBe("Trailing");
    expect(displayStatusForState("STOP_LOSS_HIT")).toBe("Stopped Out");
    expect(displayStatusForState("EXPIRED")).toBe("Expired");
    expect(displayStatusForState("ARCHIVED")).toBe("Archived");
  });

  it("auto-detects Near Target when price is within 1% of Target 1", () => {
    const snapshot = createRecommendationSnapshot(input());
    expect(
      resolveRecommendationDisplayStatus("ACTIVE", snapshot, { price: 995 })
    ).toBe("Near Target");
  });

  it("infers ENTRY_TRIGGERED and TARGET hits from market quotes", () => {
    const snapshot = createRecommendationSnapshot(input());
    expect(
      inferMarketDrivenState("ENTRY_PENDING", snapshot, { price: 930 })
    ).toBe("ENTRY_TRIGGERED");
    expect(inferMarketDrivenState("ACTIVE", snapshot, { price: 1_005 })).toBe(
      "TARGET_1_HIT"
    );
    expect(
      inferMarketDrivenState("TARGET_1_HIT", snapshot, { price: 1_065 })
    ).toBe("TARGET_2_HIT");
    expect(
      inferMarketDrivenState("ACTIVE", snapshot, { price: 870 })
    ).toBe("STOP_LOSS_HIT");
  });

  it("exposes getRecommendationStatus for registered recommendations", () => {
    const living = createLivingRecommendation(input());
    const status = getRecommendationStatus(living.recommendationId);
    expect(status).toMatchObject({
      state: "ENTRY_PENDING",
      displayStatus: "Entry Pending",
      isActive: true,
      isTerminal: false,
    });
  });
});

describe("RecommendationProgressEngine", () => {
  it("computes entry, return, distance, reward, holding and progress metrics", () => {
    const snapshot = createRecommendationSnapshot(input());
    const progress = computeRecommendationProgress(
      snapshot,
      "ACTIVE",
      { price: 980, asOf: "2026-07-20T09:30:11.000Z", sessionsHeld: 2 },
      "2026-07-20T09:30:11.000Z"
    );
    expect(progress.holdingDays).toBe(2);
    expect(progress.holdingSessions).toBe(2);
    expect(progress.currentReturnPercent).toBeCloseTo(5.38, 1);
    expect(progress.distanceToStopLoss).toBe(105);
    expect(progress.distanceToTarget1).toBe(20);
    expect(progress.distanceToTarget2).toBe(80);
    expect(progress.rewardAchievedPercent).toBeGreaterThan(0);
    expect(progress.progressPercent).toBeGreaterThan(0);
  });

  it("returns null price metrics while awaiting a quote", () => {
    const snapshot = createRecommendationSnapshot(input());
    const progress = computeRecommendationProgress(snapshot, "ENTRY_PENDING");
    expect(progress.entryPercent).toBeNull();
    expect(progress.currentReturnPercent).toBeNull();
    expect(progress.progressPercent).toBe(5);
  });

  it("exposes getRecommendationProgress after lifecycle registration", () => {
    const living = createLivingRecommendation(input());
    advanceRecommendation({
      recommendationId: living.recommendationId,
      toState: "ENTRY_TRIGGERED",
      quote: { price: 930 },
    });
    const progress = getRecommendationProgress(living.recommendationId);
    expect(progress?.distanceToEntry).not.toBeNull();
  });
});

describe("RecommendationTimelineEngine", () => {
  it("appends permanent timestamped events for each transition", () => {
    const living = createLivingRecommendation(input());
    advanceRecommendation({
      recommendationId: living.recommendationId,
      toState: "ENTRY_TRIGGERED",
      occurredAt: "2026-07-18T10:00:00.000Z",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ACTIVE",
      occurredAt: "2026-07-18T11:00:00.000Z",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "TARGET_1_HIT",
      occurredAt: "2026-07-18T12:00:00.000Z",
    });
    const timeline = getRecommendationTimeline(living.recommendationId);
    expect(timeline?.map((event) => event.type)).toEqual([
      "Recommendation Generated",
      "Status Advanced",
      "Entry Triggered",
      "Status Advanced",
      "Target 1 Hit",
    ]);
    expect(timeline?.every((event) => Boolean(event.occurredAt))).toBe(true);
  });

  it("records SL Hit, Manual Exit, Expired and Archived events", () => {
    const living = createLivingRecommendation(input());
    advanceRecommendation({
      recommendationId: living.recommendationId,
      toState: "ENTRY_TRIGGERED",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "STOP_LOSS_HIT",
    });
    expireRecommendation(living.recommendationId);
    archiveRecommendation(living.recommendationId);
    const types = getRecommendationTimeline(living.recommendationId)?.map(
      (event) => event.type
    );
    expect(types).toContain("SL Hit");
    expect(types).toContain("Expired");
    expect(types).toContain("Archived");
  });
});

describe("Current health vs original conviction", () => {
  it("keeps original conviction separate from current health overlays", () => {
    const living = createLivingRecommendation(input(), {
      health: {
        currentHealth: 76,
        currentTrust: 80,
        currentValidation: 82,
        currentRisk: 28,
      },
    });
    expect(living.health.originalConviction).toBe(84);
    expect(living.health.currentHealth).toBe(76);
    expect(living.health.currentTrust).toBe(80);
    expect(living.health.currentValidation).toBe(82);
    expect(living.health.currentRisk).toBe(28);
    expect(living.health.lifecycleStatus).toBe("ENTRY_PENDING");
    expect(living.snapshot.originalConviction).toBe(84);
  });
});

describe("Lifecycle presentation and surface wiring", () => {
  beforeEach(() => {
    resetRecommendationRegistry();
    resetRecommendationLifecycle();
  });

  it("provides required empty states", () => {
    expect(RECOMMENDATION_LIFECYCLE_EMPTY).toEqual({
      noActiveRecommendations: "No Active Recommendations",
      noTimeline: "No Timeline",
      awaitingEntry: "Awaiting Entry",
      awaitingProgress: "Awaiting Progress",
    });
    expect(presentLifecycleCard(undefined).emptyMessage).toBe(
      "No Active Recommendations"
    );
    expect(presentLifecycleTimeline("x", []).emptyMessage).toBe("No Timeline");
    expect(presentLifecycleProgress("x", undefined).emptyMessage).toBe(
      "Awaiting Progress"
    );
  });

  it("wires active vs history bundles for institutional surfaces", () => {
    const active = createLivingRecommendation(input("2026-07-18T09:30:11Z", "INFY"));
    const closed = createLivingRecommendation(input("2026-07-18T09:30:12Z", "TCS"));
    const archived = archiveRecommendation(closed.recommendationId);

    for (const surface of [
      "recommendation_center",
      "research",
      "company",
      "dashboard",
      "watchlists",
      "portfolio",
      "replay",
      "history",
    ] as const) {
      const bundle = presentLifecycleForSurface(
        surface,
        listActiveLivingRecommendations(),
        [archived]
      );
      expect(bundle.surface).toBe(surface);
      expect(bundle.active.some((card) => card.symbol === "INFY")).toBe(true);
      expect(bundle.history.some((card) => card.symbol === "TCS")).toBe(true);
      expect(bundle.empty).toBe(false);
    }

    expect(listActiveLivingRecommendations().map((item) => item.recommendationId)).toEqual([
      active.recommendationId,
    ]);
  });

  it("registers an existing R1 snapshot without recreating it", () => {
    const snapshot = createRecommendation(input());
    const living = registerRecommendationLifecycle(snapshot);
    expect(living.snapshot).toBe(snapshot);
    expect(getRecommendationStatus(snapshot.recommendationId)?.state).toBe(
      "ENTRY_PENDING"
    );
  });

  it("advances from market quote without duplicated conviction math", () => {
    const living = createLivingRecommendation(input());
    const next = advanceRecommendation({
      recommendationId: living.recommendationId,
      quote: { price: 930 },
    });
    expect(next.state).toBe("ENTRY_TRIGGERED");
    expect(next.health.originalConviction).toBe(84);
    expect(next.snapshot.originalConviction).toBe(84);
  });

  it("exposes surface wire adapters for Center, Research, Company, Dashboard, Watchlists, Portfolio, Replay, History", async () => {
    const { wireRecommendationCenter, wireResearchRecommendations, wireCompanyRecommendations, wireDashboardRecommendations, wireWatchlistRecommendations, wirePortfolioRecommendations, wireRecommendationReplay, wireRecommendationHistory } = await import("./index");
    createLivingRecommendation(input("2026-07-18T09:30:11Z", "INFY"));
    expect(wireRecommendationCenter().surface).toBe("recommendation_center");
    expect(wireResearchRecommendations().active).toHaveLength(1);
    expect(wireCompanyRecommendations("INFY").active[0]?.symbol).toBe("INFY");
    expect(wireDashboardRecommendations().empty).toBe(false);
    expect(wireWatchlistRecommendations(["INFY"]).active).toHaveLength(1);
    expect(wirePortfolioRecommendations(["INFY"]).active).toHaveLength(1);
    expect(wireRecommendationHistory().surface).toBe("history");
    const living = listActiveLivingRecommendations()[0];
    const replay = wireRecommendationReplay(living.recommendationId);
    expect(replay.timeline.empty).toBe(false);
    expect(replay.health?.originalConviction).toBe(84);
  });

  it("presents awaiting entry when progress has no quote yet", () => {
    const living = createLivingRecommendation(input());
    const progress = presentLifecycleProgress(living.recommendationId, living);
    expect(progress.emptyMessage).toBe("Awaiting Entry");
  });

  it("updateRecommendationStatus refreshes health overlays without rewriting the snapshot", () => {
    const living = createLivingRecommendation(input());
    const updated = updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ENTRY_TRIGGERED",
      health: {
        currentHealth: 71,
        currentTrust: 74,
        currentValidation: 79,
        currentRisk: 33,
      },
      quote: { price: 932 },
    });
    expect(updated.health.currentHealth).toBe(71);
    expect(updated.health.originalConviction).toBe(84);
    expect(updated.snapshot.originalTrust).toBe(91);
    expect(updated.progress.distanceToEntry).not.toBeNull();
  });

  it("getRecommendationTimeline auto-registers an existing R1 snapshot via loader", () => {
    const snapshot = createRecommendation(input("2026-07-18T09:31:00Z", "RELIANCE"));
    const timeline = getRecommendationTimeline(snapshot.recommendationId);
    expect(timeline?.[0]?.type).toBe("Recommendation Generated");
    expect(getRecommendationStatus(snapshot.recommendationId)?.displayStatus).toBe(
      "Entry Pending"
    );
  });
});
