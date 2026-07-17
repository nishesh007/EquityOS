import { beforeEach, describe, expect, it } from "vitest";
import {
  calculateHealthForRecommendation,
  createLivingRecommendation,
  evaluateAndStoreOutcome,
  getLivingRecommendation,
  getRecommendationHealth,
  getRecommendationReplay,
  learnFromRecommendation,
  resetRecommendationRegistry,
  updateRecommendationStatus,
  advanceRecommendation,
  archiveRecommendationLifecycle,
  getRecommendationTimeline,
  getCalibration,
  calibrateFutureRecommendation,
  exportRecommendationWorkspace,
  getRecommendationWorkspace,
  type CreateRecommendationSnapshotInput,
} from "../index";
import {
  RECOMMENDATION_FORBIDDEN_TERMINOLOGY,
  RECOMMENDATION_PLATFORM_TERMINOLOGY,
  SPRINT_9F1_STATUS,
  getRecommendationIntegrationStatus,
  getRecommendationPlatformHealth,
  isSprint9F1Frozen,
  validateRecommendationPlatform,
} from "./index";

function input(
  symbol: string,
  generatedAt: string,
  strategy = "Swing"
): CreateRecommendationSnapshotInput {
  return {
    company: { symbol, name: `${symbol} Limited`, exchange: "NSE" },
    strategy,
    generatedAt,
    generatedByEngine: strategy,
    aiVersion: "9F.1.R8",
    originalConviction: 84,
    originalTrust: 88,
    originalValidation: {
      validationStatus: "APPROVED",
      overallValidationScore: 86,
    },
    entryRange: { low: 100, high: 102 },
    stopLoss: 95,
    targets: [
      { price: 110, label: "T1" },
      { price: 118, label: "T2" },
    ],
    riskReward: 2.5,
    convictionDrivers: ["Trend aligned", "Momentum confirmed"],
    riskFactors: ["Market breadth"],
    technicalSnapshot: { trend: "UP", momentum: 78, rsi: 61 },
    fundamentalSnapshot: { qualityScore: 82 },
    marketSnapshot: { regime: "RISK_ON" },
    sectorSnapshot: { sector: "Auto", industry: "Automobiles", strength: 76 },
  };
}

function seedCompleted(symbol: string, timestamp: string) {
  const living = createLivingRecommendation(input(symbol, timestamp));
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
  updateRecommendationStatus({
    recommendationId: living.recommendationId,
    status: "TARGET_2_HIT",
  });
  calculateHealthForRecommendation(living.recommendationId, {
    momentum: 88,
    risk: 84,
    trend: 86,
    fundamentalStrength: 82,
  });
  evaluateAndStoreOutcome({
    snapshot: living.snapshot,
    lifecycle: getLivingRecommendation(living.recommendationId),
    health: getRecommendationHealth(living.recommendationId),
    path: {
      currentPrice: 119,
      highSinceEntry: 120,
      lowSinceEntry: 100,
      sessionsActive: 5,
    },
  });
  return living;
}

beforeEach(() => {
  resetRecommendationRegistry();
});

describe("Sprint freeze", () => {
  it("marks Sprint 9F.1 complete and frozen", () => {
    expect(SPRINT_9F1_STATUS.complete).toBe(true);
    expect(SPRINT_9F1_STATUS.frozen).toBe(true);
    expect(SPRINT_9F1_STATUS.modules).toHaveLength(8);
    expect(Object.isFrozen(SPRINT_9F1_STATUS)).toBe(true);
  });

  it("isSprint9F1Frozen returns true", () => {
    expect(isSprint9F1Frozen()).toBe(true);
  });
});

describe("Institutional terminology", () => {
  it("defines the canonical terminology set", () => {
    expect(RECOMMENDATION_PLATFORM_TERMINOLOGY).toContain(
      "Highest Conviction Recommendations"
    );
    expect(RECOMMENDATION_PLATFORM_TERMINOLOGY).toContain(
      "Institutional Verdict"
    );
    expect(RECOMMENDATION_PLATFORM_TERMINOLOGY).toContain(
      "Expected Holding Period"
    );
  });

  it("forbids legacy duplicate labels", () => {
    expect(RECOMMENDATION_FORBIDDEN_TERMINOLOGY).toContain("Best Call");
    expect(RECOMMENDATION_FORBIDDEN_TERMINOLOGY).toContain(
      "Confidence Rating"
    );
    const canonical = new Set<string>(RECOMMENDATION_PLATFORM_TERMINOLOGY);
    for (const forbidden of RECOMMENDATION_FORBIDDEN_TERMINOLOGY) {
      expect(canonical.has(forbidden)).toBe(false);
    }
  });

  it("passes the terminology validation check", () => {
    const validation = validateRecommendationPlatform();
    const term = validation.checks.find(
      (item) => item.name === "Institutional Terminology"
    );
    expect(term?.passed).toBe(true);
  });
});

describe("Lifecycle validation", () => {
  it("transitions Generated through Archived without losing the recommendation", () => {
    const living = createLivingRecommendation(
      input("LIFE", "2026-07-17T09:30:00Z")
    );
    advanceRecommendation({ recommendationId: living.recommendationId });
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
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "TARGET_2_HIT",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "TRAILING",
    });
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "EXITED",
    });
    archiveRecommendationLifecycle(living.recommendationId);
    expect(getLivingRecommendation(living.recommendationId)?.state).toBe(
      "ARCHIVED"
    );
  });

  it("keeps the permanent timeline through every transition", () => {
    const living = seedCompleted("TIME", "2026-07-17T09:31:00Z");
    const timeline = getRecommendationTimeline(living.recommendationId);
    expect(timeline && timeline.length).toBeGreaterThanOrEqual(4);
  });

  it("passes the lifecycle validation check", () => {
    seedCompleted("LCHK", "2026-07-17T09:32:00Z");
    const validation = validateRecommendationPlatform();
    expect(
      validation.checks.find((item) => item.name === "Lifecycle")?.passed
    ).toBe(true);
  });
});

describe("Immutability validation", () => {
  it("keeps original values frozen after full lifecycle and learning", () => {
    const living = seedCompleted("IMM", "2026-07-17T09:33:00Z");
    learnFromRecommendation(living.recommendationId);
    expect(living.snapshot.originalConviction).toBe(84);
    expect(living.snapshot.originalTrust).toBe(88);
    expect(living.snapshot.stopLoss).toBe(95);
    expect(Object.isFrozen(living.snapshot)).toBe(true);
  });

  it("passes the immutability validation check", () => {
    seedCompleted("ICHK", "2026-07-17T09:34:00Z");
    const validation = validateRecommendationPlatform();
    expect(
      validation.checks.find((item) => item.name === "Immutability")?.passed
    ).toBe(true);
  });
});

describe("Replay validation", () => {
  it("keeps replay and decision journal intact after completion", () => {
    const living = seedCompleted("RPL", "2026-07-17T09:35:00Z");
    const replay = getRecommendationReplay(living.recommendationId);
    expect(replay?.journal.originalConviction).toBe(84);
    expect(Object.isFrozen(replay?.journal)).toBe(true);
  });

  it("passes the replay validation check", () => {
    seedCompleted("RCHK", "2026-07-17T09:36:00Z");
    const validation = validateRecommendationPlatform();
    expect(
      validation.checks.find((item) => item.name === "Replay & History Intact")
        ?.passed
    ).toBe(true);
  });
});

describe("Learning validation", () => {
  it("calibrates only future recommendations", () => {
    const living = seedCompleted("LRN", "2026-07-17T09:37:00Z");
    learnFromRecommendation(living.recommendationId);
    expect(getCalibration().appliesTo).toBe("FUTURE_RECOMMENDATIONS_ONLY");
    const future = calibrateFutureRecommendation({
      baseConviction: 80,
      baseTrust: 82,
      baseValidationWeight: 1,
    });
    expect(future.historicalSampleSize).toBe(1);
    expect(living.snapshot.originalConviction).toBe(84);
  });

  it("passes the learning validation check", () => {
    const living = seedCompleted("LCH2", "2026-07-17T09:38:00Z");
    learnFromRecommendation(living.recommendationId);
    const validation = validateRecommendationPlatform();
    expect(
      validation.checks.find((item) => item.name === "Learning Future-Only")
        ?.passed
    ).toBe(true);
  });
});

describe("Workspace and consistency validation", () => {
  it("shows every recommendation in the workspace — none disappear", () => {
    seedCompleted("KEEP1", "2026-07-17T09:39:00Z");
    createLivingRecommendation(input("KEEP2", "2026-07-17T09:40:00Z"));
    const validation = validateRecommendationPlatform();
    expect(
      validation.checks.find(
        (item) => item.name === "No Disappearing Recommendations"
      )?.passed
    ).toBe(true);
    expect(getRecommendationWorkspace({ refresh: true }).records).toHaveLength(
      2
    );
  });

  it("has no duplicate cards or summaries", () => {
    seedCompleted("DUP", "2026-07-17T09:41:00Z");
    const validation = validateRecommendationPlatform();
    expect(
      validation.checks.find((item) => item.name === "No Duplicate Cards")
        ?.passed
    ).toBe(true);
  });

  it("reports consistent values across workspace, outcome, and health engines", () => {
    seedCompleted("CONS", "2026-07-17T09:42:00Z");
    const validation = validateRecommendationPlatform();
    expect(
      validation.checks.find((item) => item.name === "Consistent Values")
        ?.passed
    ).toBe(true);
  });

  it("passes full platform validation when empty and with live data", () => {
    expect(validateRecommendationPlatform().passed).toBe(true);
    seedCompleted("FULL", "2026-07-17T09:43:00Z");
    const validation = validateRecommendationPlatform();
    expect(validation.passed).toBe(true);
    expect(validation.checks).toHaveLength(8);
  });
});

describe("Platform health", () => {
  it("reports HEALTHY with engine counts", () => {
    const living = seedCompleted("HLT", "2026-07-17T09:44:00Z");
    learnFromRecommendation(living.recommendationId);
    const health = getRecommendationPlatformHealth();
    expect(health.status).toBe("HEALTHY");
    expect(health.snapshots).toBe(1);
    expect(health.livingRecommendations).toBe(1);
    expect(health.outcomes).toBe(1);
    expect(health.recommendationsEvaluatedByLearning).toBe(1);
    expect(health.checksPassed).toBe(health.checksTotal);
  });

});

describe("Integration status", () => {
  it("wires all nine institutional surfaces", () => {
    seedCompleted("INT", "2026-07-17T09:45:00Z");
    const status = getRecommendationIntegrationStatus();
    expect(status.integrated).toBe(true);
    expect(status.surfaces.map((surface) => surface.surface)).toEqual([
      "dashboard",
      "company",
      "research",
      "recommendation_center",
      "portfolio",
      "watchlists",
      "replay",
      "history",
      "validation",
    ]);
  });

  it("stays integrated and healthy with no data", () => {
    expect(getRecommendationIntegrationStatus().integrated).toBe(true);
    const health = getRecommendationPlatformHealth();
    expect(health.snapshots).toBe(0);
    expect(health.workspaceRecords).toBe(0);
    expect(health.status).toBe("HEALTHY");
  });
});

describe("Export validation", () => {
  it("exports recommendation history as CSV and Markdown", () => {
    seedCompleted("EXP", "2026-07-17T09:46:00Z");
    getRecommendationWorkspace({ refresh: true });
    const csv = exportRecommendationWorkspace("CSV");
    const markdown = exportRecommendationWorkspace("MARKDOWN");
    expect(String(csv.body)).toContain("EXP");
    expect(String(markdown.body)).toContain("Recommendation");
  });

  it("exports recommendation workspace as PDF", () => {
    seedCompleted("PDF", "2026-07-17T09:47:00Z");
    getRecommendationWorkspace({ refresh: true });
    expect(exportRecommendationWorkspace("PDF").format).toBe("PDF");
  });
});

describe("Performance / reuse", () => {
  it("reuses cached engine state without recalculating on repeated reads", () => {
    const living = seedCompleted("PERF", "2026-07-17T09:48:00Z");
    const first = getRecommendationHealth(living.recommendationId);
    const second = getRecommendationHealth(living.recommendationId);
    expect(first).toBe(second);
    const replayOne = getRecommendationReplay(living.recommendationId);
    expect(replayOne?.recommendationId).toBe(living.recommendationId);
  });

  it("keeps validation read-only — engine counts unchanged after validation", () => {
    seedCompleted("RO", "2026-07-17T09:49:00Z");
    const before = getRecommendationPlatformHealth();
    validateRecommendationPlatform();
    validateRecommendationPlatform();
    const after = getRecommendationPlatformHealth();
    expect(after.snapshots).toBe(before.snapshots);
    expect(after.outcomes).toBe(before.outcomes);
    expect(after.livingRecommendations).toBe(before.livingRecommendations);
  });
});
