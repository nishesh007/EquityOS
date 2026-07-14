/**
 * Recommendation learning — maps patterns/trends into advisory recommendation themes.
 */

import type { LearnedPattern } from "./PatternLearningEngine";
import type { TrendLearningResult } from "./TrendLearning";
import type { FeedbackRecord } from "./FeedbackCollector";

export type RecommendationTheme =
  | "rule"
  | "threshold"
  | "configuration"
  | "coverage"
  | "performance"
  | "explainability"
  | "reliability"
  | "risk_reduction";

export interface LearningRecommendation {
  recommendationId: string;
  theme: RecommendationTheme;
  title: string;
  rationale: string;
  priority: number;
  confidence: number;
  impact: number;
}

export interface RecommendationLearningResult {
  recommendations: LearningRecommendation[];
  qualityScore: number;
  warnings: string[];
  errors: string[];
}

export class RecommendationLearning {
  private seq = 0;

  learn(input: {
    patterns: LearnedPattern[];
    trends: TrendLearningResult;
    feedback: FeedbackRecord[];
  }): RecommendationLearningResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const recommendations: LearningRecommendation[] = [];

      for (const pattern of input.patterns) {
        const mapped = mapPattern(pattern);
        if (!mapped) continue;
        this.seq += 1;
        recommendations.push({
          recommendationId: `rec:${this.seq}`,
          theme: mapped.theme,
          title: mapped.title,
          rationale: pattern.description,
          priority: severityPriority(pattern.severity),
          confidence: pattern.confidence,
          impact: severityImpact(pattern.severity),
        });
      }

      for (const trend of input.trends.trends.filter(
        (t) => t.direction === "degrading"
      )) {
        this.seq += 1;
        recommendations.push({
          recommendationId: `rec:${this.seq}`,
          theme: trend.metric.includes("failure")
            ? "reliability"
            : trend.metric.includes("feedback")
              ? "explainability"
              : "performance",
          title: `Address degrading ${trend.metric}`,
          rationale: `Trend delta ${trend.delta} indicates advisory attention.`,
          priority: Math.abs(trend.delta) >= 15 ? 1 : 2,
          confidence: trend.confidence,
          impact: clamp(Math.abs(trend.delta) / 100, 0.2, 1),
        });
      }

      const criticalFeedback = input.feedback.filter(
        (f) => f.sentiment === "critical" || f.sentiment === "negative"
      );
      if (criticalFeedback.length > 0) {
        this.seq += 1;
        recommendations.push({
          recommendationId: `rec:${this.seq}`,
          theme: "risk_reduction",
          title: "Review negative feedback clusters",
          rationale: `${criticalFeedback.length} negative/critical feedback records require advisory review.`,
          priority: 1,
          confidence: 0.8,
          impact: 0.7,
        });
      }

      const qualityScore = clamp(
        Math.round(
          recommendations.length === 0
            ? 40
            : recommendations.reduce((s, r) => s + r.confidence * 100, 0) /
                recommendations.length
        ),
        0,
        100
      );

      if (recommendations.length === 0) {
        warnings.push("No recommendations generated from current signals");
      }

      return {
        recommendations: recommendations.sort((a, b) => a.priority - b.priority),
        qualityScore,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`recommendation learning failed: ${String(err)}`);
      return { recommendations: [], qualityScore: 0, warnings, errors };
    }
  }
}

function mapPattern(
  pattern: LearnedPattern
): { theme: RecommendationTheme; title: string } | null {
  switch (pattern.kind) {
    case "recurring_failure":
      return { theme: "reliability", title: `Stabilize ${pattern.module} failures` };
    case "false_positive":
      return { theme: "threshold", title: "Tune thresholds to reduce false positives" };
    case "false_negative":
      return { theme: "coverage", title: "Expand coverage for false-negative gaps" };
    case "rule_weakness":
      return { theme: "rule", title: `Strengthen weak rules in ${pattern.module}` };
    case "confidence_drift":
      return { theme: "explainability", title: "Investigate confidence drift" };
    case "score_drift":
      return { theme: "configuration", title: "Review score configuration drift" };
    case "performance_drift":
      return { theme: "performance", title: "Mitigate performance drift" };
    case "operational_trend":
      return { theme: "risk_reduction", title: "Address operational trend risk" };
    default:
      return null;
  }
}

function severityPriority(severity: LearnedPattern["severity"]): number {
  return severity === "high" ? 1 : severity === "medium" ? 2 : 3;
}

function severityImpact(severity: LearnedPattern["severity"]): number {
  return severity === "high" ? 0.85 : severity === "medium" ? 0.6 : 0.35;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
