/**
 * Trend learning — detects improving/stable/degrading operational trends.
 */

import type { FeedbackRecord } from "./FeedbackCollector";
import type { LearnedPattern } from "./PatternLearningEngine";

export interface TrendPoint {
  label: string;
  value: number;
  at: string;
}

export interface TrendLearningResult {
  trends: Array<{
    metric: string;
    direction: "improving" | "stable" | "degrading";
    delta: number;
    confidence: number;
    points: TrendPoint[];
  }>;
  detectionScore: number;
  warnings: string[];
  errors: string[];
}

export class TrendLearning {
  private history: Array<{
    at: string;
    feedbackScore: number;
    patternCount: number;
    failureRate: number;
  }> = [];

  analyze(input: {
    feedback: FeedbackRecord[];
    patterns: LearnedPattern[];
    failureRate?: number;
  }): TrendLearningResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const feedbackScore =
        input.feedback.length === 0
          ? 50
          : round2(
              (input.feedback.reduce((s, f) => s + f.score, 0) /
                Math.max(
                  1,
                  input.feedback.reduce((s, f) => s + f.weight, 0)
                )) *
                100
            );
      const failureRate =
        input.failureRate ??
        (input.patterns.filter((p) => p.kind === "recurring_failure").length >
        0
          ? 0.35
          : 0.12);

      this.history.push({
        at: new Date().toISOString(),
        feedbackScore,
        patternCount: input.patterns.length,
        failureRate,
      });
      if (this.history.length > 30) this.history.shift();

      const trends = [
        buildTrend(
          "feedback_score",
          this.history.map((h) => ({
            label: "feedback",
            value: h.feedbackScore,
            at: h.at,
          }))
        ),
        buildTrend(
          "pattern_volume",
          this.history.map((h) => ({
            label: "patterns",
            value: h.patternCount,
            at: h.at,
          })),
          true
        ),
        buildTrend(
          "failure_rate",
          this.history.map((h) => ({
            label: "failure",
            value: round2(h.failureRate * 100),
            at: h.at,
          })),
          true
        ),
      ];

      const detected = trends.filter((t) => t.direction !== "stable").length;
      const detectionScore = clamp(
        Math.round(
          (detected / Math.max(1, trends.length)) * 70 +
            Math.min(30, this.history.length * 3)
        ),
        0,
        100
      );

      if (this.history.length < 2) {
        warnings.push("Insufficient history for strong trend confidence");
      }

      return { trends, detectionScore, warnings, errors };
    } catch (err) {
      errors.push(`trend learning failed: ${String(err)}`);
      return { trends: [], detectionScore: 0, warnings, errors };
    }
  }

  reset(): void {
    this.history = [];
  }
}

function buildTrend(
  metric: string,
  points: TrendPoint[],
  lowerIsBetter = false
): TrendLearningResult["trends"][number] {
  if (points.length < 2) {
    return {
      metric,
      direction: "stable",
      delta: 0,
      confidence: 0.4,
      points,
    };
  }
  const first = points[0]!.value;
  const last = points[points.length - 1]!.value;
  const delta = round2(last - first);
  let direction: "improving" | "stable" | "degrading" = "stable";
  if (Math.abs(delta) < 3) direction = "stable";
  else if (lowerIsBetter) direction = delta < 0 ? "improving" : "degrading";
  else direction = delta > 0 ? "improving" : "degrading";

  return {
    metric,
    direction,
    delta,
    confidence: clamp(0.5 + Math.min(0.4, Math.abs(delta) / 50), 0, 1),
    points: points.map((p) => ({ ...p })),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
