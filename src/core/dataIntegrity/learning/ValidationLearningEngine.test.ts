/**
 * Institutional Validation Learning Engine — unit tests (Prompt 9F.29).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationLearningEngine,
  registerLearning,
  resetValidationLearningEngine,
  listLearningSources,
  resetLearningRegistry,
  DEFAULT_LEARNING_CONFIGURATION,
  collectFeedback,
  analyzePatterns,
  generateImprovements,
  createLearningSnapshot,
  getLearningMetrics,
} from "./index";

describe("Learning registration", () => {
  beforeEach(() => {
    resetValidationLearningEngine();
    resetLearningRegistry();
  });

  afterEach(() => {
    resetValidationLearningEngine();
    resetLearningRegistry();
  });

  it("registers learning engine idempotently", () => {
    const first = registerLearning({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(10);
    expect(listLearningSources().length).toBeGreaterThanOrEqual(10);

    const second = registerLearning();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Feedback and pattern learning", () => {
  let engine: ValidationLearningEngine;

  beforeEach(() => {
    resetValidationLearningEngine();
    resetLearningRegistry();
    engine = new ValidationLearningEngine({
      patternSensitivity: 0.4,
      advisoryOnly: true,
      institutionalMode: true,
    });
    registerLearning({ engine, force: true });
  });

  afterEach(() => {
    resetValidationLearningEngine();
    resetLearningRegistry();
  });

  it("collects weighted feedback and detects patterns", () => {
    expect(DEFAULT_LEARNING_CONFIGURATION.engineVersion).toBe("9F.29.0");

    const fb1 = engine.collectFeedback({
      sourceType: "analyst",
      sentiment: "negative",
      module: "rules",
      message: "Too many false positives on liquidity rules",
      tags: ["false_positive"],
    });
    expect(fb1.weight).toBeGreaterThan(1);

    collectFeedback({
      sourceType: "compliance",
      sentiment: "critical",
      module: "compliance",
      message: "Missed edge case",
      tags: ["false_negative"],
    });
    collectFeedback({
      sourceType: "system",
      sentiment: "neutral",
      message: "Operational heartbeat",
    });

    const patterns = analyzePatterns({
      observations: [
        {
          module: "rules",
          failed: true,
          falsePositive: true,
          confidence: 0.3,
          historicalConfidence: 0.8,
          score: 40,
          historicalScore: 75,
          performanceMs: 120,
          historicalPerformanceMs: 50,
        },
        {
          module: "rules",
          failed: true,
          confidence: 0.35,
          historicalConfidence: 0.7,
          score: 42,
          historicalScore: 70,
        },
        {
          module: "trust",
          falseNegative: true,
          confidence: 0.4,
          historicalConfidence: 0.75,
        },
      ],
    });
    expect(patterns.patterns.length).toBeGreaterThan(0);
    expect(patterns.coverageScore).toBeGreaterThanOrEqual(0);
  });
});

describe("Improvement and trend learning", () => {
  beforeEach(() => {
    resetValidationLearningEngine();
    resetLearningRegistry();
    registerLearning({ force: true });
  });

  afterEach(() => {
    resetValidationLearningEngine();
    resetLearningRegistry();
  });

  it("generates advisory improvements without mutating validation", () => {
    collectFeedback({
      sourceType: "reviewer",
      sentiment: "negative",
      module: "performance",
      message: "Latency regressions on batch validation",
    });
    collectFeedback({
      sourceType: "operational",
      sentiment: "critical",
      module: "reliability",
      message: "Repeated pipeline timeouts",
    });

    const run = generateImprovements({ plan: true });
    expect(run.improvements.improvements.length).toBeGreaterThan(0);
    expect(
      run.improvements.improvements.every((i) => i.advisoryOnly === true)
    ).toBe(true);
    expect(run.healthScore.overall).toBeGreaterThanOrEqual(0);
    expect(run.healthScore.overall).toBeLessThanOrEqual(100);
    expect(run.plan).not.toBeNull();
    expect(run.plan!.backlog.length).toBeGreaterThan(0);
  });
});

describe("Snapshots, metrics, audit, regression", () => {
  let engine: ValidationLearningEngine;

  beforeEach(() => {
    resetValidationLearningEngine();
    resetLearningRegistry();
    engine = new ValidationLearningEngine({ patternSensitivity: 0.35 });
    registerLearning({ engine, force: true });
  });

  afterEach(() => {
    resetValidationLearningEngine();
    resetLearningRegistry();
  });

  it("creates snapshots, tracks metrics/audit, detects regressions", () => {
    engine.collectFeedback({
      sourceType: "manual",
      sentiment: "positive",
      message: "Looks good",
    });
    engine.collectFeedback({
      sourceType: "analyst",
      sentiment: "positive",
      message: "Stable",
    });
    engine.generateImprovements({
      observations: [
        {
          module: "analytics",
          score: 80,
          historicalScore: 78,
          confidence: 0.8,
          historicalConfidence: 0.79,
        },
      ],
    });
    const snap1 = createLearningSnapshot("baseline", "learning");
    expect(snap1.payload.score.overall).toBeGreaterThanOrEqual(0);

    // Degrade learning posture.
    engine.collectFeedback({
      sourceType: "compliance",
      sentiment: "critical",
      module: "compliance",
      message: "Severe regression",
      tags: ["false_negative"],
    });
    engine.generateImprovements({
      observations: [
        {
          module: "rules",
          failed: true,
          falsePositive: true,
          falseNegative: true,
          confidence: 0.2,
          historicalConfidence: 0.9,
          score: 25,
          historicalScore: 85,
          performanceMs: 200,
          historicalPerformanceMs: 40,
        },
      ],
      plan: false,
    });

    const snap2 = engine.createLearningSnapshot("degraded", "feedback");
    const cmp = engine.compareLearningSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(cmp).not.toBeNull();
    // Either score regression or pattern/improvement deltas should mark degrading/regression.
    expect(
      cmp!.regressionDetected ||
        cmp!.trend === "degrading" ||
        cmp!.scoreDelta < 0 ||
        cmp!.patternCountDelta !== 0
    ).toBe(true);

    const trendSnap = engine.createLearningSnapshot("trend", "trend");
    expect(trendSnap.payload.kind).toBe("trend");

    const metrics = getLearningMetrics();
    expect(metrics.learningRuns).toBeGreaterThanOrEqual(2);
    expect(metrics.feedbackRecords).toBeGreaterThanOrEqual(3);
    expect(metrics.learningHealthScore).toBeGreaterThanOrEqual(0);

    const audit = engine.getAuditLog();
    expect(audit.some((e) => e.event === "FeedbackCollected")).toBe(true);
    expect(audit.some((e) => e.event === "PatternsDetected")).toBe(true);
    expect(audit.some((e) => e.event === "ImprovementsGenerated")).toBe(true);
    expect(audit.some((e) => e.event === "SnapshotCreated")).toBe(true);
  });
});

describe("Graceful failure isolation", () => {
  beforeEach(() => {
    resetValidationLearningEngine();
    resetLearningRegistry();
  });

  afterEach(() => {
    resetValidationLearningEngine();
    resetLearningRegistry();
  });

  it("never throws from public APIs", () => {
    registerLearning({ force: true });
    const patterns = analyzePatterns({ observations: [] });
    expect(Array.isArray(patterns.patterns)).toBe(true);
    const run = generateImprovements();
    expect(run.runId).toBeTruthy();
  });
});
