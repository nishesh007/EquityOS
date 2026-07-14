/**
 * Drawdown validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  hasMinSample,
  isPlainObject,
  metricsSection,
  readNumber,
  histFail,
  histPass,
  type HistoricalValidationConfig,
} from "./HistoricalRuleRegistry";

export function createDrawdownValidationRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.drawdown.maximum",
      name: "Maximum Drawdown Limit",
      description: "Maximum drawdown must not exceed configured maximum.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["historical", "drawdown"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (!hasMinSample(ctx.data, cfg)) return histPass();
        const m = metricsSection(ctx.data);
        const maxDd = readNumber({ ...ctx.data, ...m }, [
          "maximumDrawdown",
          "maxDrawdown",
          "drawdown",
        ]);
        if (maxDd === undefined) {
          if (ctx.data.excessiveDrawdown === true) {
            return histFail({
              field: "maximumDrawdown",
              message: "Excessive drawdown flagged.",
              recommendation: `Keep max drawdown <= ${cfg.maxDrawdown}%.`,
              actual: true,
            });
          }
          return histPass();
        }
        if (maxDd > cfg.maxDrawdown || ctx.data.excessiveDrawdown === true) {
          return histFail({
            field: "maximumDrawdown",
            message: "Maximum drawdown exceeds acceptable limit.",
            recommendation: `Reduce risk; max drawdown <= ${cfg.maxDrawdown}%.`,
            expected: `<= ${cfg.maxDrawdown}`,
            actual: maxDd,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.drawdown.average_and_recovery",
      name: "Average Drawdown And Recovery",
      description: "Average drawdown and recovery time must be non-negative.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["historical", "drawdown"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        const avg = readNumber(src, ["averageDrawdown", "avgDrawdown"]);
        if (avg !== undefined && (!Number.isFinite(avg) || avg < 0)) {
          return histFail({
            field: "averageDrawdown",
            message: "Average drawdown must be non-negative.",
            recommendation: "Provide absolute drawdown percentage.",
            actual: avg,
          });
        }
        const recovery = readNumber(src, [
          "recoveryTime",
          "avgRecoveryDays",
          "recoveryTimeDays",
        ]);
        if (
          recovery !== undefined &&
          (!Number.isFinite(recovery) || recovery < 0)
        ) {
          return histFail({
            field: "recoveryTime",
            message: "Recovery time must be non-negative.",
            recommendation: "Provide recovery duration in days.",
            actual: recovery,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.drawdown.pain_ulcer",
      name: "Pain And Ulcer Index",
      description: "Pain index and ulcer index must be non-negative when provided.",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["historical", "drawdown"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        for (const field of ["painIndex", "ulcerIndex"]) {
          const v = readNumber(src, [field]);
          if (v === undefined) continue;
          if (!Number.isFinite(v) || v < 0) {
            return histFail({
              field,
              message: `${field} must be a non-negative number.`,
              recommendation: "Recalculate drawdown risk indices.",
              actual: v,
            });
          }
        }
        return histPass();
      },
    },
  ];
}
