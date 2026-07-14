/**
 * Institutional Validation Explainability Engine — unit tests (Prompt 9F.27).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationExplainabilityEngine,
  registerExplainability,
  resetValidationExplainabilityEngine,
  listExplainabilitySources,
  resetExplainabilityRegistry,
  DEFAULT_EXPLAINABILITY_CONFIGURATION,
  traceDecision,
  generateExplanation,
  analyzeRuleContribution,
  getConfidenceBreakdown,
  createExplainabilitySnapshot,
  getExplainabilityMetrics,
} from "./index";

describe("Explainability registration", () => {
  beforeEach(() => {
    resetValidationExplainabilityEngine();
    resetExplainabilityRegistry();
  });

  afterEach(() => {
    resetValidationExplainabilityEngine();
    resetExplainabilityRegistry();
  });

  it("registers explainability engine idempotently", () => {
    const first = registerExplainability({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(10);
    expect(listExplainabilitySources().length).toBeGreaterThanOrEqual(10);

    const second = registerExplainability();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Decision tracing and contributions", () => {
  let engine: ValidationExplainabilityEngine;

  beforeEach(() => {
    resetValidationExplainabilityEngine();
    resetExplainabilityRegistry();
    engine = new ValidationExplainabilityEngine({
      explanationStyle: "institutional",
      verbosity: "standard",
      institutionalMode: true,
    });
    registerExplainability({ engine, force: true });
  });

  afterEach(() => {
    resetValidationExplainabilityEngine();
    resetExplainabilityRegistry();
  });

  it("traces decisions and analyzes rule contributions", () => {
    expect(DEFAULT_EXPLAINABILITY_CONFIGURATION.engineVersion).toBe("9F.27.0");

    const result = engine.traceDecision({
      decisionId: "dec-1",
      validationType: "recommendation",
      symbol: "TATAMOTORS",
      rules: [
        {
          ruleId: "r1",
          ruleName: "Price Range",
          module: "market",
          engine: "rule_engine",
          status: "executed",
          confidence: 0.9,
          scoreDelta: 5,
          dependencies: [],
        },
        {
          ruleId: "r2",
          ruleName: "Evidence Check",
          module: "hallucination",
          engine: "hallucination",
          status: "failed",
          confidence: 0.4,
          scoreDelta: -12,
          critical: true,
          dependencies: ["r1"],
        },
        {
          ruleId: "r3",
          ruleName: "Skipped Optional",
          module: "analytics",
          engine: "analytics",
          status: "skipped",
          confidence: 0.7,
          scoreDelta: 0,
          dependencies: ["r1"],
        },
      ],
    });

    expect(result.trace.executedRules.length).toBe(1);
    expect(result.trace.failedRules.length).toBe(1);
    expect(result.trace.criticalRules.length).toBe(1);
    expect(result.trace.executionOrder).toEqual(["r1", "r2", "r3"]);
    expect(result.trace.timeline.length).toBe(3);
    expect(result.contributions.contributions.length).toBeGreaterThanOrEqual(3);
    expect(result.healthScore.overall).toBeGreaterThanOrEqual(0);
    expect(result.healthScore.overall).toBeLessThanOrEqual(100);

    const contrib = analyzeRuleContribution({
      decisionId: "dec-2",
      rules: [
        {
          ruleId: "a",
          ruleName: "A",
          status: "executed",
          confidence: 0.8,
          scoreDelta: 4,
        },
      ],
    });
    expect(contrib.contributions[0]?.ruleId).toBe("a");
  });
});

describe("Confidence breakdown and explanations", () => {
  beforeEach(() => {
    resetValidationExplainabilityEngine();
    resetExplainabilityRegistry();
    registerExplainability({ force: true });
  });

  afterEach(() => {
    resetValidationExplainabilityEngine();
    resetExplainabilityRegistry();
  });

  it("breaks down confidence and generates explanations", () => {
    const confidence = getConfidenceBreakdown({
      decisionId: "dec-conf",
      overallConfidence: 0.77,
      rules: [
        {
          ruleId: "c1",
          ruleName: "High",
          module: "trust",
          engine: "trust",
          status: "executed",
          confidence: 0.9,
        },
        {
          ruleId: "c2",
          ruleName: "Low",
          module: "trade",
          engine: "trade",
          status: "executed",
          confidence: 0.3,
        },
      ],
    });
    expect(confidence.overallConfidence).toBeGreaterThan(0);
    expect(confidence.perEngine.length).toBeGreaterThan(0);
    expect(confidence.perModule.length).toBeGreaterThan(0);
    expect(confidence.distribution.high + confidence.distribution.low).toBeGreaterThan(0);

    const explanation = generateExplanation({
      decisionId: "dec-expl",
      validationType: "trade",
      outcome: "pass",
      rules: [
        {
          ruleId: "e1",
          ruleName: "Entry",
          module: "tradeSetup",
          engine: "trade",
          status: "executed",
          confidence: 0.85,
          scoreDelta: 3,
        },
      ],
      explanationStyle: "detailed",
    });
    expect(explanation.humanReadable.length).toBeGreaterThan(20);
    expect(explanation.ruleSummary).toContain("Executed");
    expect(explanation.confidenceSummary).toContain("confidence");
    expect(explanation.qualityScore).toBeGreaterThan(0);
  });
});

describe("Snapshots, metrics, audit, regression", () => {
  let engine: ValidationExplainabilityEngine;

  beforeEach(() => {
    resetValidationExplainabilityEngine();
    resetExplainabilityRegistry();
    engine = new ValidationExplainabilityEngine({
      explanationStyle: "concise",
    });
    registerExplainability({ engine, force: true });
  });

  afterEach(() => {
    resetValidationExplainabilityEngine();
    resetExplainabilityRegistry();
  });

  it("creates snapshots, tracks metrics/audit, detects regressions", () => {
    engine.traceDecision({
      decisionId: "base",
      overallConfidence: 0.9,
      rules: [
        {
          ruleId: "b1",
          ruleName: "Base",
          status: "executed",
          confidence: 0.95,
          scoreDelta: 5,
          module: "integrity",
          engine: "integrity",
        },
        {
          ruleId: "b2",
          ruleName: "Base2",
          status: "executed",
          confidence: 0.9,
          scoreDelta: 4,
          module: "trust",
          engine: "trust",
          dependencies: ["b1"],
        },
      ],
    });
    const snap1 = createExplainabilitySnapshot("baseline", "decision");
    expect(snap1.payload.score.overall).toBeGreaterThanOrEqual(0);

    engine.traceDecision({
      decisionId: "degraded",
      overallConfidence: 0.2,
      outcome: "fail",
      rules: [
        {
          ruleId: "d1",
          ruleName: "Broken",
          status: "failed",
          confidence: 0.1,
          scoreDelta: -20,
          critical: true,
          module: "hallucination",
          engine: "hallucination",
        },
      ],
      generateExplanation: false,
    });
    const snap2 = engine.createExplainabilitySnapshot("degraded", "trace");
    const cmp = engine.compareExplainabilitySnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(cmp).not.toBeNull();
    expect(cmp!.regressionDetected).toBe(true);
    expect(["improving", "stable", "degrading"]).toContain(cmp!.trend);

    const confSnap = engine.createExplainabilitySnapshot("conf", "confidence");
    expect(confSnap.payload.kind).toBe("confidence");

    const metrics = getExplainabilityMetrics();
    expect(metrics.decisionTraces).toBeGreaterThanOrEqual(2);
    expect(metrics.explainabilityHealthScore).toBeGreaterThanOrEqual(0);

    const audit = engine.getAuditLog();
    expect(audit.some((e) => e.event === "DecisionTraced")).toBe(true);
    expect(audit.some((e) => e.event === "ConfidenceBreakdown")).toBe(true);
    expect(audit.some((e) => e.event === "SnapshotCreated")).toBe(true);
  });
});

describe("Graceful failure isolation", () => {
  beforeEach(() => {
    resetValidationExplainabilityEngine();
    resetExplainabilityRegistry();
  });

  afterEach(() => {
    resetValidationExplainabilityEngine();
    resetExplainabilityRegistry();
  });

  it("never throws from public APIs on sparse input", () => {
    registerExplainability({ force: true });
    const result = traceDecision({ decisionId: "sparse", rules: [] });
    expect(result.trace.traceId).toBeTruthy();
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.healthScore.overall).toBeGreaterThanOrEqual(0);
  });
});
