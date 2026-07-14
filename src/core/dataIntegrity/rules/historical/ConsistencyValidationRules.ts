/**
 * Consistency / rolling performance drift validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  isPlainObject,
  metricsSection,
  readNumber,
  histFail,
  histPass,
  type HistoricalValidationConfig,
} from "./HistoricalRuleRegistry";

export function createConsistencyValidationRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.consistency.no_abnormal_drift",
      name: "No Abnormal Performance Drift",
      description: "Reject abnormal performance drift flags.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["historical", "consistency"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        if (
          ctx.data.performanceDrift === true ||
          ctx.data.abnormalDrift === true
        ) {
          return histFail({
            field: "consistency",
            message: "Abnormal performance drift detected.",
            recommendation: "Investigate regime change and recalibrate models.",
            actual: true,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.consistency.period_comparison",
      name: "Period Comparison Consistency",
      description:
        "Compare current vs previous month/quarter/year and rolling windows.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["historical", "consistency"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        const current = readNumber(src, [
          "currentMonthHitRate",
          "currentHitRate",
          "hitRate",
        ]);
        const previous = readNumber(src, [
          "previousMonthHitRate",
          "previousHitRate",
        ]);
        if (current !== undefined && previous !== undefined) {
          const drop = previous - current;
          if (drop >= cfg.decayHitRateDrop) {
            return histFail({
              field: "hitRate",
              message: "Large hit-rate drop vs previous period.",
              recommendation: "Review rolling performance and model health.",
              expected: `drop < ${cfg.decayHitRateDrop}pp`,
              actual: { current, previous, drop, windowDays: cfg.rollingWindowDays },
            });
          }
        }
        return histPass();
      },
    },
    {
      id: "hist.consistency.rolling_windows",
      name: "Rolling Window Metrics",
      description: "Rolling 3/6/12 month metrics must be in valid ranges.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["historical", "consistency"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        const fields = [
          "rolling3mHitRate",
          "rolling6mHitRate",
          "rolling12mHitRate",
          "previousQuarterHitRate",
          "previousYearHitRate",
          "consistencyScore",
          "consistency",
        ];
        for (const field of fields) {
          const v = readNumber(src, [field]);
          if (v === undefined) continue;
          if (!Number.isFinite(v) || v < 0 || v > 100) {
            return histFail({
              field,
              message: `${field} out of valid 0–100 range.`,
              recommendation: "Use percentage consistency / hit-rate metrics.",
              actual: v,
            });
          }
        }
        return histPass();
      },
    },
  ];
}
