/**
 * Learning planner — continuous improvement backlog prioritization (advisory).
 */

import type { ImprovementItem } from "./ImprovementAnalyzer";
import type { TrendLearningResult } from "./TrendLearning";

export interface LearningPlanItem {
  improvementId: string;
  priority: number;
  impact: number;
  confidence: number;
  rankScore: number;
  rationale: string;
}

export interface LearningPlan {
  planId: string;
  generatedAt: string;
  backlog: LearningPlanItem[];
  improvementTrend: "improving" | "stable" | "degrading" | "unknown";
  historicalCount: number;
  warnings: string[];
  errors: string[];
}

export class LearningPlanner {
  private seq = 0;
  private historicalPlans = 0;

  plan(input: {
    improvements: ImprovementItem[];
    trends?: TrendLearningResult;
  }): LearningPlan {
    const warnings: string[] = [];
    const errors: string[] = [];
    this.seq += 1;
    this.historicalPlans += 1;
    try {
      const backlog = input.improvements
        .filter((i) => i.status === "backlog" || i.status === "proposed")
        .map((i) => {
          const rankScore = round2(
            (4 - Math.min(3, i.priority)) * 0.35 +
              i.impact * 0.4 +
              i.confidence * 0.25
          );
          return {
            improvementId: i.improvementId,
            priority: i.priority,
            impact: i.impact,
            confidence: i.confidence,
            rankScore,
            rationale: `Advisory rank for ${i.category}: impact=${i.impact}, confidence=${i.confidence}.`,
          };
        })
        .sort((a, b) => b.rankScore - a.rankScore);

      const trendDirection =
        input.trends?.trends.find((t) => t.metric === "feedback_score")
          ?.direction ?? "unknown";

      if (backlog.length === 0) {
        warnings.push("Improvement backlog is empty");
      }

      return {
        planId: `plan:${this.seq}:${Date.now()}`,
        generatedAt: new Date().toISOString(),
        backlog,
        improvementTrend: trendDirection,
        historicalCount: this.historicalPlans,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`learning plan failed: ${String(err)}`);
      return {
        planId: `plan:error:${Date.now()}`,
        generatedAt: new Date().toISOString(),
        backlog: [],
        improvementTrend: "unknown",
        historicalCount: this.historicalPlans,
        warnings,
        errors,
      };
    }
  }

  reset(): void {
    this.seq = 0;
    this.historicalPlans = 0;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
