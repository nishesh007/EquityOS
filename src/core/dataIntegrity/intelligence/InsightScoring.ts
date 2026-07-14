/**
 * Insight scoring — composite Insight Score 0–100.
 */

import type { InsightsConfiguration } from "./InsightsConfiguration";
import type { DetectedPattern } from "./PatternDetector";
import type { CorrelationResult } from "./CorrelationEngine";
import type { RiskInsight } from "./RiskInsightEngine";
import type { DetectedOpportunity } from "./OpportunityDetector";
import type { IntelligentRecommendation } from "./RecommendationGenerator";

export interface InsightScoreBreakdown {
  patternQuality: number;
  correlationStrength: number;
  riskAccuracy: number;
  opportunityValue: number;
  recommendationConfidence: number;
  evidenceQuality: number;
  overall: number;
}

export class InsightScoring {
  constructor(private config: InsightsConfiguration) {}

  setConfiguration(config: InsightsConfiguration): void {
    this.config = config;
  }

  score(input: {
    patterns: DetectedPattern[];
    correlations: CorrelationResult[];
    risks: RiskInsight[];
    opportunities: DetectedOpportunity[];
    recommendations: IntelligentRecommendation[];
  }): InsightScoreBreakdown {
    const patternQuality = avgOr(
      input.patterns.map((p) => p.confidence * 100),
      input.patterns.length === 0 ? 50 : 0
    );
    const correlationStrength = avgOr(
      input.correlations.map((c) => Math.abs(c.coefficient) * 100),
      input.correlations.length === 0 ? 50 : 0
    );
    const riskAccuracy = avgOr(
      input.risks.map((r) => r.confidence * 100),
      input.risks.length === 0 ? 55 : 0
    );
    const opportunityValue = avgOr(
      input.opportunities.map(
        (o) => (o.confidence * 50 + Math.min(50, o.expectedImpactPct * 1.5))
      ),
      input.opportunities.length === 0 ? 50 : 0
    );
    const recommendationConfidence = avgOr(
      input.recommendations.map((r) => r.confidence * 100),
      input.recommendations.length === 0 ? 50 : 0
    );

    const evidenceCounts = [
      ...input.patterns.map((p) => p.evidence.length),
      ...input.correlations.map((c) => c.evidence.length),
      ...input.risks.map((r) => r.evidence.length),
      ...input.recommendations.map((r) => r.evidence.length),
    ];
    const evidenceQuality =
      evidenceCounts.length === 0
        ? 40
        : clamp(
            (evidenceCounts.reduce((a, b) => a + b, 0) /
              evidenceCounts.length) *
              25,
            0,
            100
          );

    const w = this.config.scoreWeights;
    const weighted =
      patternQuality * w.patternQuality +
      correlationStrength * w.correlationStrength +
      riskAccuracy * w.riskAccuracy +
      opportunityValue * w.opportunityValue +
      recommendationConfidence * w.recommendationConfidence +
      evidenceQuality * w.evidenceQuality;
    const weightSum =
      w.patternQuality +
      w.correlationStrength +
      w.riskAccuracy +
      w.opportunityValue +
      w.recommendationConfidence +
      w.evidenceQuality;

    return {
      patternQuality: round2(patternQuality),
      correlationStrength: round2(correlationStrength),
      riskAccuracy: round2(riskAccuracy),
      opportunityValue: round2(opportunityValue),
      recommendationConfidence: round2(recommendationConfidence),
      evidenceQuality: round2(evidenceQuality),
      overall: round2(weightSum === 0 ? 0 : weighted / weightSum),
    };
  }
}

function avgOr(values: number[], fallback: number): number {
  if (values.length === 0) return fallback;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
