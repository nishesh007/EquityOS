/**
 * Holding period historical validation rules.
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

export function createHoldingPeriodRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.holding.periods_present",
      name: "Holding Period Metrics",
      description: "Expected/actual/average holding periods must be coherent.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["historical", "holding"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        const expected = readNumber(src, [
          "expectedHoldingPeriod",
          "expectedHoldingDays",
        ]);
        const actual = readNumber(src, [
          "actualHoldingPeriod",
          "actualHoldingDays",
        ]);
        const average = readNumber(src, [
          "averageHoldingPeriod",
          "avgHoldingDays",
        ]);
        for (const [field, v] of [
          ["expectedHoldingPeriod", expected],
          ["actualHoldingPeriod", actual],
          ["averageHoldingPeriod", average],
        ] as const) {
          if (v === undefined) continue;
          if (!Number.isFinite(v) || v <= 0) {
            return histFail({
              field,
              message: `${field} must be a positive duration.`,
              recommendation: "Provide positive holding period in days.",
              actual: v,
            });
          }
        }
        return histPass();
      },
    },
    {
      id: "hist.holding.early_exit",
      name: "Early Exit Rate",
      description: "Early exit % must stay within configured maximum.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["historical", "holding"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (!hasMinSample(ctx.data, cfg)) return histPass();
        const m = metricsSection(ctx.data);
        const early = readNumber({ ...ctx.data, ...m }, [
          "earlyExitPercent",
          "earlyExitRate",
        ]);
        if (early === undefined) return histPass();
        if (early > cfg.maxEarlyExitRate) {
          return histFail({
            field: "earlyExitPercent",
            message: "Early exit rate exceeds maximum.",
            recommendation: `Improve holding discipline to <= ${cfg.maxEarlyExitRate}%.`,
            expected: `<= ${cfg.maxEarlyExitRate}`,
            actual: early,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.holding.late_exit",
      name: "Late Exit Rate",
      description: "Late exit % must stay within configured maximum.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["historical", "holding"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (!hasMinSample(ctx.data, cfg)) return histPass();
        const m = metricsSection(ctx.data);
        const late = readNumber({ ...ctx.data, ...m }, [
          "lateExitPercent",
          "lateExitRate",
        ]);
        if (late === undefined) return histPass();
        if (late > cfg.maxLateExitRate) {
          return histFail({
            field: "lateExitPercent",
            message: "Late exit rate exceeds maximum.",
            recommendation: `Tighten exit discipline to <= ${cfg.maxLateExitRate}%.`,
            expected: `<= ${cfg.maxLateExitRate}`,
            actual: late,
          });
        }
        return histPass();
      },
    },
  ];
}
