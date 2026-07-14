/**
 * Historical performance score rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  calculateHistoricalScore,
  configFromContext,
  isPlainObject,
  histFail,
  histPass,
  type HistoricalValidationConfig,
} from "./HistoricalRuleRegistry";

export function createPerformanceScoringRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.score.threshold",
      name: "Historical Performance Score Threshold",
      description:
        "Compute historical performance score and reject below minimum.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["historical", "score"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) {
          return histFail({
            field: "performanceScore",
            message: "Cannot score non-object historical payload.",
            recommendation: "Provide structured historical metrics.",
            actual: typeof ctx.data,
          });
        }
        const cfg = configFromContext(ctx);
        const result = calculateHistoricalScore(ctx.data, cfg);
        if (result.rejected) {
          return histFail({
            field: "performanceScore",
            message: "Historical performance score below threshold (Review Required).",
            recommendation:
              "Improve prediction accuracy, hit rate, risk management, consistency, drawdown, or holding discipline.",
            expected: `>= ${result.threshold}`,
            actual: {
              score: result.score,
              band: result.band,
              components: result.components,
            },
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.score.band_review",
      name: "Performance Band Review",
      description: "Warn when score band is only GOOD in strict mode.",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["historical", "score"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (cfg.mode !== "strict") return histPass();
        const result = calculateHistoricalScore(ctx.data, cfg);
        if (result.band === "GOOD") {
          return histFail({
            field: "performanceScore",
            message: "Performance band is GOOD — monitor closely.",
            recommendation: "Target EXCELLENT or INSTITUTIONAL_GRADE.",
            expected: "EXCELLENT+",
            actual: { score: result.score, band: result.band },
          });
        }
        return histPass();
      },
    },
  ];
}
