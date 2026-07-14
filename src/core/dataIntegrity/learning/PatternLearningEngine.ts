/**
 * Pattern learning engine — recurring failures, FP/FN, weakness and drift signals.
 */

import type { LearningConfiguration } from "./LearningConfiguration";
import type { LearningSourceDefinition } from "./LearningRegistry";
import type { FeedbackRecord } from "./FeedbackCollector";

export type LearnedPatternKind =
  | "recurring_failure"
  | "false_positive"
  | "false_negative"
  | "rule_weakness"
  | "confidence_drift"
  | "score_drift"
  | "performance_drift"
  | "operational_trend";

export interface LearnedPattern {
  patternId: string;
  kind: LearnedPatternKind;
  module: string;
  severity: "low" | "medium" | "high";
  confidence: number;
  evidenceCount: number;
  description: string;
  detectedAt: string;
}

export interface PatternLearningResult {
  patterns: LearnedPattern[];
  coverageScore: number;
  warnings: string[];
  errors: string[];
}

export interface PatternObservation {
  module?: string;
  ruleId?: string;
  failed?: boolean;
  falsePositive?: boolean;
  falseNegative?: boolean;
  confidence?: number;
  score?: number;
  performanceMs?: number;
  historicalConfidence?: number;
  historicalScore?: number;
  historicalPerformanceMs?: number;
}

export class PatternLearningEngine {
  private config: LearningConfiguration;
  private seq = 0;

  constructor(config: LearningConfiguration) {
    this.config = config;
  }

  setConfiguration(config: LearningConfiguration): void {
    this.config = config;
  }

  analyze(input: {
    sources: LearningSourceDefinition[];
    feedback: FeedbackRecord[];
    observations?: PatternObservation[];
  }): PatternLearningResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const observations =
        input.observations?.length
          ? input.observations
          : synthesizeObservations(input.sources, input.feedback);
      const patterns: LearnedPattern[] = [];
      const sensitivity = this.config.patternSensitivity;

      const failureByModule = countBy(
        observations.filter((o) => o.failed),
        (o) => o.module ?? "unknown"
      );
      for (const [module, count] of failureByModule) {
        if (count / Math.max(1, observations.length) >= sensitivity * 0.4) {
          patterns.push(
            this.makePattern(
              "recurring_failure",
              module,
              count >= 3 ? "high" : "medium",
              Math.min(0.95, 0.5 + count * 0.08),
              count,
              `Recurring failures detected in module ${module}.`
            )
          );
        }
      }

      const fps = observations.filter((o) => o.falsePositive);
      if (fps.length / Math.max(1, observations.length) >= sensitivity * 0.25) {
        patterns.push(
          this.makePattern(
            "false_positive",
            fps[0]?.module ?? "rules",
            "medium",
            0.7,
            fps.length,
            "Elevated false-positive signals across recent outcomes."
          )
        );
      }

      const fns = observations.filter((o) => o.falseNegative);
      if (fns.length / Math.max(1, observations.length) >= sensitivity * 0.2) {
        patterns.push(
          this.makePattern(
            "false_negative",
            fns[0]?.module ?? "rules",
            "high",
            0.75,
            fns.length,
            "False-negative risk pattern indicated by outcome feedback."
          )
        );
      }

      const weakRules = observations.filter(
        (o) => (o.score ?? 70) < 55 || (o.confidence ?? 0.7) < 0.45
      );
      if (weakRules.length > 0) {
        patterns.push(
          this.makePattern(
            "rule_weakness",
            weakRules[0]?.module ?? "rules",
            "medium",
            0.68,
            weakRules.length,
            "Rule weakness indicated by low score/confidence observations."
          )
        );
      }

      const confDrift = observations.filter(
        (o) =>
          o.confidence !== undefined &&
          o.historicalConfidence !== undefined &&
          o.historicalConfidence - o.confidence >= sensitivity * 0.2
      );
      if (confDrift.length > 0) {
        patterns.push(
          this.makePattern(
            "confidence_drift",
            confDrift[0]?.module ?? "trust",
            "medium",
            0.72,
            confDrift.length,
            "Confidence drift detected versus historical baseline."
          )
        );
      }

      const scoreDrift = observations.filter(
        (o) =>
          o.score !== undefined &&
          o.historicalScore !== undefined &&
          o.historicalScore - o.score >= sensitivity * 15
      );
      if (scoreDrift.length > 0) {
        patterns.push(
          this.makePattern(
            "score_drift",
            scoreDrift[0]?.module ?? "analytics",
            "medium",
            0.7,
            scoreDrift.length,
            "Validation score drift detected versus historical baseline."
          )
        );
      }

      const perfDrift = observations.filter(
        (o) =>
          o.performanceMs !== undefined &&
          o.historicalPerformanceMs !== undefined &&
          o.performanceMs - o.historicalPerformanceMs >=
            sensitivity * 40
      );
      if (perfDrift.length > 0) {
        patterns.push(
          this.makePattern(
            "performance_drift",
            perfDrift[0]?.module ?? "performance",
            "low",
            0.65,
            perfDrift.length,
            "Performance drift detected in validation latency profile."
          )
        );
      }

      const negativeFeedback = input.feedback.filter(
        (f) => f.sentiment === "negative" || f.sentiment === "critical"
      );
      if (negativeFeedback.length >= 2) {
        patterns.push(
          this.makePattern(
            "operational_trend",
            negativeFeedback[0]?.module ?? "operations",
            "medium",
            0.66,
            negativeFeedback.length,
            "Operational feedback trend indicates recurring friction."
          )
        );
      }

      const limited = patterns.slice(0, this.config.maxPatterns);
      if (patterns.length > this.config.maxPatterns) {
        warnings.push(
          `Pattern list truncated to maxPatterns (${this.config.maxPatterns})`
        );
      }

      const expectedKinds: LearnedPatternKind[] = [
        "recurring_failure",
        "false_positive",
        "false_negative",
        "rule_weakness",
        "confidence_drift",
        "score_drift",
        "performance_drift",
        "operational_trend",
      ];
      const foundKinds = new Set(limited.map((p) => p.kind));
      const coverageScore = clamp(
        Math.round((foundKinds.size / expectedKinds.length) * 100),
        0,
        100
      );

      return { patterns: limited, coverageScore, warnings, errors };
    } catch (err) {
      errors.push(`pattern learning failed: ${String(err)}`);
      return { patterns: [], coverageScore: 0, warnings, errors };
    }
  }

  private makePattern(
    kind: LearnedPatternKind,
    module: string,
    severity: LearnedPattern["severity"],
    confidence: number,
    evidenceCount: number,
    description: string
  ): LearnedPattern {
    this.seq += 1;
    return {
      patternId: `pat:${kind}:${this.seq}`,
      kind,
      module,
      severity,
      confidence: round2(confidence),
      evidenceCount,
      description,
      detectedAt: new Date().toISOString(),
    };
  }
}

function synthesizeObservations(
  sources: LearningSourceDefinition[],
  feedback: FeedbackRecord[]
): PatternObservation[] {
  const observations: PatternObservation[] = sources.map((s, i) => ({
    module: s.module,
    ruleId: `${s.kind}-rule`,
    failed: i % 5 === 0,
    falsePositive: i % 7 === 0,
    falseNegative: i % 11 === 0,
    confidence: clamp(s.baselineQuality / 100 - (i % 3) * 0.05, 0, 1),
    score: clamp(s.baselineQuality - (i % 4) * 4, 0, 100),
    performanceMs: 40 + i * 3,
    historicalConfidence: clamp(s.baselineQuality / 100 + 0.08, 0, 1),
    historicalScore: clamp(s.baselineQuality + 6, 0, 100),
    historicalPerformanceMs: 35 + i * 2,
  }));

  for (const fb of feedback) {
    observations.push({
      module: fb.module ?? "feedback",
      ruleId: fb.ruleId,
      failed: fb.sentiment === "critical" || fb.sentiment === "negative",
      falsePositive: fb.tags.includes("false_positive"),
      falseNegative: fb.tags.includes("false_negative"),
      confidence: fb.sentiment === "positive" ? 0.85 : 0.4,
      score: fb.sentiment === "positive" ? 80 : 45,
      performanceMs: 50,
      historicalConfidence: 0.75,
      historicalScore: 70,
      historicalPerformanceMs: 45,
    });
  }
  return observations;
}

function countBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
