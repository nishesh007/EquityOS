/**
 * Insights aggregator — packages scored intelligence pack.
 */

import type { DetectedPattern } from "./PatternDetector";
import type { CorrelationResult } from "./CorrelationEngine";
import type { RiskInsight } from "./RiskInsightEngine";
import type { DetectedOpportunity } from "./OpportunityDetector";
import type { IntelligentRecommendation } from "./RecommendationGenerator";
import type { InsightScoreBreakdown } from "./InsightScoring";

export interface InsightsPack {
  packId: string;
  generatedAt: string;
  patterns: DetectedPattern[];
  correlations: CorrelationResult[];
  risks: RiskInsight[];
  opportunities: DetectedOpportunity[];
  recommendations: IntelligentRecommendation[];
  score: InsightScoreBreakdown;
  topPriorities: IntelligentRecommendation[];
  warnings: string[];
  errors: string[];
}

export class InsightsAggregator {
  aggregate(input: {
    patterns: DetectedPattern[];
    correlations: CorrelationResult[];
    risks: RiskInsight[];
    opportunities: DetectedOpportunity[];
    recommendations: IntelligentRecommendation[];
    score: InsightScoreBreakdown;
    warnings?: string[];
    errors?: string[];
  }): InsightsPack {
    return {
      packId: `insp:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: new Date().toISOString(),
      patterns: [...input.patterns],
      correlations: [...input.correlations],
      risks: [...input.risks],
      opportunities: [...input.opportunities],
      recommendations: [...input.recommendations],
      score: { ...input.score },
      topPriorities: input.recommendations
        .filter(
          (r) =>
            r.category === "PRIORITY" ||
            r.priority === "CRITICAL" ||
            r.priority === "HIGH"
        )
        .slice(0, 5),
      warnings: [...(input.warnings ?? [])],
      errors: [...(input.errors ?? [])],
    };
  }
}
