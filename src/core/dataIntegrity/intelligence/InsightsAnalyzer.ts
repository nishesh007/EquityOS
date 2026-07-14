/**
 * Insights analyzer — orchestrates detect → correlate → risk → opportunity → recommend → score.
 */

import type { InsightsConfiguration } from "./InsightsConfiguration";
import type { InsightObservation } from "./InsightsRegistry";
import { PatternDetector } from "./PatternDetector";
import { CorrelationEngine } from "./CorrelationEngine";
import { RiskInsightEngine } from "./RiskInsightEngine";
import { OpportunityDetector } from "./OpportunityDetector";
import { RecommendationGenerator } from "./RecommendationGenerator";
import { InsightScoring } from "./InsightScoring";
import { InsightsAggregator, type InsightsPack } from "./InsightsAggregator";

export class InsightsAnalyzer {
  private patterns: PatternDetector;
  private correlations: CorrelationEngine;
  private risks: RiskInsightEngine;
  private opportunities: OpportunityDetector;
  private recommendations: RecommendationGenerator;
  private scoring: InsightScoring;
  private readonly aggregator = new InsightsAggregator();

  constructor(private config: InsightsConfiguration) {
    this.patterns = new PatternDetector(config);
    this.correlations = new CorrelationEngine(config);
    this.risks = new RiskInsightEngine(config);
    this.opportunities = new OpportunityDetector(config);
    this.recommendations = new RecommendationGenerator(config);
    this.scoring = new InsightScoring(config);
  }

  setConfiguration(config: InsightsConfiguration): void {
    this.config = config;
    this.patterns.setConfiguration(config);
    this.correlations.setConfiguration(config);
    this.risks.setConfiguration(config);
    this.opportunities.setConfiguration(config);
    this.recommendations.setConfiguration(config);
    this.scoring.setConfiguration(config);
  }

  analyze(observations: InsightObservation[]): InsightsPack {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const patternResult = this.patterns.detect(observations);
      warnings.push(...patternResult.warnings);
      errors.push(...patternResult.errors);

      const corrResult = this.correlations.analyze(observations);
      warnings.push(...corrResult.warnings);
      errors.push(...corrResult.errors);

      const riskResult = this.risks.analyze({
        observations,
        patterns: patternResult.patterns,
        correlations: corrResult.correlations,
      });
      warnings.push(...riskResult.warnings);
      errors.push(...riskResult.errors);

      const oppResult = this.opportunities.detect({
        observations,
        patterns: patternResult.patterns,
      });
      warnings.push(...oppResult.warnings);
      errors.push(...oppResult.errors);

      const recResult = this.recommendations.generate({
        patterns: patternResult.patterns,
        correlations: corrResult.correlations,
        risks: riskResult.risks,
        opportunities: oppResult.opportunities,
      });
      warnings.push(...recResult.warnings);
      errors.push(...recResult.errors);

      const score = this.scoring.score({
        patterns: patternResult.patterns,
        correlations: corrResult.correlations,
        risks: riskResult.risks,
        opportunities: oppResult.opportunities,
        recommendations: recResult.recommendations,
      });

      return this.aggregator.aggregate({
        patterns: patternResult.patterns,
        correlations: corrResult.correlations,
        risks: riskResult.risks,
        opportunities: oppResult.opportunities,
        recommendations: recResult.recommendations,
        score,
        warnings,
        errors,
      });
    } catch (err) {
      errors.push(`Insight analysis failed: ${String(err)}`);
      return this.aggregator.aggregate({
        patterns: [],
        correlations: [],
        risks: [],
        opportunities: [],
        recommendations: [],
        score: {
          patternQuality: 0,
          correlationStrength: 0,
          riskAccuracy: 0,
          opportunityValue: 0,
          recommendationConfidence: 0,
          evidenceQuality: 0,
          overall: 0,
        },
        warnings,
        errors,
      });
    }
  }
}
