/**
 * Target achievement historical validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  isPlainObject,
  metricsSection,
  readNumber,
  histFail,
  histPass,
  type HistoricalValidationConfig,
} from "./HistoricalRuleRegistry";

export function createTargetAchievementRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.target.hit_percentages",
      name: "Target Hit Percentages",
      description: "Target 1/2/3 hit % must be valid and ordered sensibly.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["historical", "target"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        const t1 = readNumber(src, ["target1HitPercent", "t1HitRate", "target1Hit"]);
        const t2 = readNumber(src, ["target2HitPercent", "t2HitRate", "target2Hit"]);
        const t3 = readNumber(src, ["target3HitPercent", "t3HitRate", "target3Hit"]);
        for (const [field, v] of [
          ["target1HitPercent", t1],
          ["target2HitPercent", t2],
          ["target3HitPercent", t3],
        ] as const) {
          if (v === undefined) continue;
          if (!Number.isFinite(v) || v < 0 || v > 100) {
            return histFail({
              field,
              message: `${field} out of valid range.`,
              recommendation: "Use percentages in 0–100.",
              expected: "0–100",
              actual: v,
            });
          }
        }
        // Later targets should not exceed earlier targets in typical pyramids
        if (t1 !== undefined && t2 !== undefined && t2 > t1 + 1e-6) {
          return histFail({
            field: "target2HitPercent",
            message: "Target 2 hit % exceeds Target 1 hit %.",
            recommendation: "Verify target achievement accounting.",
            expected: "t2 <= t1",
            actual: { t1, t2 },
          });
        }
        if (t2 !== undefined && t3 !== undefined && t3 > t2 + 1e-6) {
          return histFail({
            field: "target3HitPercent",
            message: "Target 3 hit % exceeds Target 2 hit %.",
            recommendation: "Verify target achievement accounting.",
            expected: "t3 <= t2",
            actual: { t2, t3 },
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.target.average_achievement",
      name: "Average Target Achievement",
      description: "Average target achievement must be in 0–100 when provided.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["historical", "target"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const avg = readNumber({ ...ctx.data, ...m }, [
          "averageTargetAchievement",
          "avgTargetAchievement",
        ]);
        if (avg === undefined) return histPass();
        if (!Number.isFinite(avg) || avg < 0 || avg > 100) {
          return histFail({
            field: "averageTargetAchievement",
            message: "Average target achievement out of range.",
            recommendation: "Use 0–100 percentage.",
            actual: avg,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.target.time_to_target",
      name: "Average Time To Target",
      description: "Average time to target must be positive when provided.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["historical", "target"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const t = readNumber({ ...ctx.data, ...m }, [
          "averageTimeToTarget",
          "avgTimeToTargetDays",
          "timeToTarget",
        ]);
        if (t === undefined) return histPass();
        if (!Number.isFinite(t) || t <= 0) {
          return histFail({
            field: "averageTimeToTarget",
            message: "Average time to target must be positive.",
            recommendation: "Provide positive days/hours to target.",
            actual: t,
          });
        }
        return histPass();
      },
    },
  ];
}
