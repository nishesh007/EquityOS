/**
 * Regression learning — learns from historical regressions and score declines.
 */

import type { LearnedPattern } from "./PatternLearningEngine";
import type { TrendLearningResult } from "./TrendLearning";

export interface RegressionLearningSignal {
  signalId: string;
  source: string;
  severity: "low" | "medium" | "high";
  description: string;
  confidence: number;
}

export interface RegressionLearningResult {
  signals: RegressionLearningSignal[];
  learningScore: number;
  warnings: string[];
  errors: string[];
}

export class RegressionLearning {
  private seq = 0;
  private historicalRegressions = 0;

  analyze(input: {
    patterns: LearnedPattern[];
    trends: TrendLearningResult;
    previousScore?: number;
    currentScore?: number;
  }): RegressionLearningResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const signals: RegressionLearningSignal[] = [];

      for (const pattern of input.patterns.filter(
        (p) =>
          p.kind === "score_drift" ||
          p.kind === "confidence_drift" ||
          p.kind === "performance_drift" ||
          p.kind === "recurring_failure"
      )) {
        this.seq += 1;
        this.historicalRegressions += 1;
        signals.push({
          signalId: `reg:${this.seq}`,
          source: pattern.patternId,
          severity: pattern.severity,
          description: `Regression signal from pattern: ${pattern.description}`,
          confidence: pattern.confidence,
        });
      }

      for (const trend of input.trends.trends.filter(
        (t) => t.direction === "degrading"
      )) {
        this.seq += 1;
        this.historicalRegressions += 1;
        signals.push({
          signalId: `reg:${this.seq}`,
          source: trend.metric,
          severity: Math.abs(trend.delta) >= 15 ? "high" : "medium",
          description: `Degrading trend on ${trend.metric} (delta ${trend.delta}).`,
          confidence: trend.confidence,
        });
      }

      if (
        input.previousScore !== undefined &&
        input.currentScore !== undefined &&
        input.currentScore - input.previousScore <= -10
      ) {
        this.seq += 1;
        this.historicalRegressions += 1;
        signals.push({
          signalId: `reg:${this.seq}`,
          source: "learning_score",
          severity: "high",
          description: `Learning health score dropped from ${input.previousScore} to ${input.currentScore}.`,
          confidence: 0.85,
        });
      }

      const learningScore = clamp(
        Math.round(
          Math.min(100, signals.length * 18 + Math.min(40, this.historicalRegressions * 2))
        ),
        0,
        100
      );

      if (signals.length === 0) {
        warnings.push("No regression signals detected in current window");
      }

      return { signals, learningScore, warnings, errors };
    } catch (err) {
      errors.push(`regression learning failed: ${String(err)}`);
      return { signals: [], learningScore: 0, warnings, errors };
    }
  }

  get historicalCount(): number {
    return this.historicalRegressions;
  }

  reset(): void {
    this.historicalRegressions = 0;
    this.seq = 0;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
