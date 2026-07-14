/**
 * Optimization planner — aggregates advisory recommendations and scores.
 */

import type { OptimizationConfiguration } from "./OptimizationConfiguration";
import type { OptimizationRecommendation } from "./OptimizationStrategies";

export interface OptimizationScoreBreakdown {
  pipelineEfficiency: number;
  cacheEfficiency: number;
  executionSpeed: number;
  memoryEfficiency: number;
  dependencyHealth: number;
  automationOpportunities: number;
  overall: number;
}

export interface OptimizationPlan {
  planId: string;
  score: OptimizationScoreBreakdown;
  recommendations: OptimizationRecommendation[];
  warnings: string[];
  errors: string[];
  createdAt: string;
}

export class OptimizationPlanner {
  constructor(private config: OptimizationConfiguration) {}

  setConfiguration(config: OptimizationConfiguration): void {
    this.config = config;
  }

  buildPlan(input: {
    pipelineEfficiency: number;
    cacheEfficiency: number;
    executionSpeed: number;
    memoryEfficiency: number;
    dependencyHealth: number;
    recommendations: OptimizationRecommendation[];
    warnings?: string[];
    errors?: string[];
  }): OptimizationPlan {
    const warnings = [...(input.warnings ?? [])];
    const errors = [...(input.errors ?? [])];

    let recommendations = [...input.recommendations];
    if (this.config.recommendationMode === "silent") {
      recommendations = [];
    } else if (recommendations.length > this.config.maxRecommendations) {
      recommendations = recommendations
        .sort((a, b) => b.estimatedImpactPct - a.estimatedImpactPct)
        .slice(0, this.config.maxRecommendations);
      warnings.push(
        `Truncated recommendations to ${this.config.maxRecommendations}.`
      );
    }

    const automationOpportunities = clamp(
      recommendations.length === 0
        ? 100
        : 100 - Math.min(60, recommendations.length * 4),
      0,
      100
    );

    const w = this.config.scoreWeights;
    const weighted =
      input.pipelineEfficiency * w.pipelineEfficiency +
      input.cacheEfficiency * w.cacheEfficiency +
      input.executionSpeed * w.executionSpeed +
      input.memoryEfficiency * w.memoryEfficiency +
      input.dependencyHealth * w.dependencyHealth +
      automationOpportunities * w.automationOpportunities;
    const weightSum =
      w.pipelineEfficiency +
      w.cacheEfficiency +
      w.executionSpeed +
      w.memoryEfficiency +
      w.dependencyHealth +
      w.automationOpportunities;
    const overall = round2(weightSum === 0 ? 0 : weighted / weightSum);

    return {
      planId: `plan:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
      score: {
        pipelineEfficiency: round2(input.pipelineEfficiency),
        cacheEfficiency: round2(input.cacheEfficiency),
        executionSpeed: round2(input.executionSpeed),
        memoryEfficiency: round2(input.memoryEfficiency),
        dependencyHealth: round2(input.dependencyHealth),
        automationOpportunities: round2(automationOpportunities),
        overall,
      },
      recommendations,
      warnings,
      errors,
      createdAt: new Date().toISOString(),
    };
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
