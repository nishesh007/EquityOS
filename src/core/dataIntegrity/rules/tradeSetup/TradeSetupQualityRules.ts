/**
 * Trade Setup Quality Score rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  calculateTradeSetupQuality,
  configFromContext,
  isPlainObject,
  tsFail,
  tsPass,
  type TradeSetupValidationConfig,
} from "./TradeSetupRuleRegistry";

export function createTradeSetupQualityRules(
  _config: TradeSetupValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ts.quality.score_threshold",
      name: "Trade Setup Quality Score Threshold",
      description:
        "Compute quality score and reject below configurable minimum.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "quality"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) {
          return tsFail({
            field: "qualityScore",
            message: "Cannot score non-object trade setup.",
            recommendation: "Provide structured trade setup payload.",
            actual: typeof ctx.data,
          });
        }
        const cfg = configFromContext(ctx);
        const result = calculateTradeSetupQuality(ctx.data, cfg);
        if (result.rejected) {
          return tsFail({
            field: "qualityScore",
            message: "Trade setup quality score below threshold.",
            recommendation:
              "Improve technical alignment, RR, trend, S/R, volatility, or data quality.",
            expected: `>= ${result.threshold}`,
            actual: {
              score: result.score,
              components: result.components,
            },
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.quality.component_coverage",
      name: "Quality Component Coverage",
      description: "Warn when multiple quality components are critically low.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "quality"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const result = calculateTradeSetupQuality(ctx.data, cfg);
        const weak = Object.entries(result.components).filter(
          ([, v]) => v < 30
        );
        if (weak.length >= 3) {
          return tsFail({
            field: "qualityScore",
            message: "Multiple quality components critically low.",
            recommendation: "Strengthen weak components before publication.",
            expected: "components >= 30",
            actual: Object.fromEntries(weak),
          });
        }
        return tsPass();
      },
    },
  ];
}
