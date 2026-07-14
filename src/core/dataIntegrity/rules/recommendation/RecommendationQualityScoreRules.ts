/**
 * Recommendation Quality Score rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  calculateRecommendationQualityScore,
  configFromContext,
  isPlainObject,
  recFail,
  recPass,
  type RecommendationValidationConfig,
} from "./RecommendationRuleRegistry";

export function createRecommendationQualityScoreRules(
  _config: RecommendationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "rec.quality.score_threshold",
      name: "Recommendation Quality Score Threshold",
      description:
        "Compute quality score and reject below configurable minimum.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["recommendation", "quality"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) {
          return recFail({
            field: "qualityScore",
            message: "Cannot score non-object recommendation.",
            recommendation: "Provide structured recommendation payload.",
            actual: typeof ctx.data,
          });
        }
        const cfg = configFromContext(ctx);
        const result = calculateRecommendationQualityScore(ctx.data, cfg);
        if (result.rejected) {
          return recFail({
            field: "qualityScore",
            message: "Recommendation quality score below threshold.",
            recommendation:
              "Improve technical/fundamental alignment, reasoning, risk, history, or market context.",
            expected: `>= ${result.threshold}`,
            actual: {
              score: result.score,
              components: result.components,
            },
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.quality.component_coverage",
      name: "Quality Component Coverage",
      description: "Warn when individual quality components are critically low.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["recommendation", "quality"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const result = calculateRecommendationQualityScore(ctx.data, cfg);
        const weak = Object.entries(result.components).filter(
          ([, v]) => v < cfg.alignmentThreshold / 2
        );
        if (weak.length >= 3) {
          return recFail({
            field: "qualityScore",
            message: "Multiple quality components critically low.",
            recommendation: "Strengthen weak components before publication.",
            expected: `components >= ${cfg.alignmentThreshold / 2}`,
            actual: Object.fromEntries(weak),
          });
        }
        return recPass();
      },
    },
  ];
}
