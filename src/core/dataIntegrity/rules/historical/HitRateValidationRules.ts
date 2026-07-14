/**
 * Hit rate validation rules (overall, rolling, sector, strategy, module).
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

export function createHitRateValidationRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.hitrate.overall",
      name: "Overall Hit Rate",
      description: "Overall hit rate must meet configured minimum.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["historical", "hit-rate"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (!hasMinSample(ctx.data, cfg)) return histPass();
        const m = metricsSection(ctx.data);
        const hr = readNumber({ ...ctx.data, ...m }, [
          "hitRate",
          "overallHitRate",
          "successRate",
        ]);
        if (hr === undefined) {
          return histFail({
            field: "hitRate",
            message: "Missing overall hit rate.",
            recommendation: "Provide hitRate / overallHitRate.",
            actual: null,
          });
        }
        if (hr < cfg.minHitRate) {
          return histFail({
            field: "hitRate",
            message: "Overall hit rate below minimum.",
            recommendation: `Improve hit rate to >= ${cfg.minHitRate}%.`,
            expected: `>= ${cfg.minHitRate}`,
            actual: hr,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.hitrate.period_breakdown",
      name: "Period Hit Rate Breakdown",
      description: "Monthly/quarterly hit rates must be in valid range when present.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["historical", "hit-rate"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        for (const field of [
          "monthlyHitRate",
          "quarterlyHitRate",
          "rolling3mHitRate",
          "rolling6mHitRate",
          "rolling12mHitRate",
        ]) {
          const v = readNumber(src, [field]);
          if (v === undefined) continue;
          if (!Number.isFinite(v) || v < 0 || v > 100) {
            return histFail({
              field,
              message: `${field} out of valid range.`,
              recommendation: "Use hit rate percentages in 0–100.",
              expected: "0–100",
              actual: v,
            });
          }
        }
        return histPass();
      },
    },
    {
      id: "hist.hitrate.segment_breakdown",
      name: "Segment Hit Rate Breakdown",
      description: "Sector/strategy/module hit rates must be sane when provided.",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["historical", "hit-rate"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const segments = [
          m.sectorHitRates ?? ctx.data.sectorHitRates,
          m.strategyHitRates ?? ctx.data.strategyHitRates,
          m.moduleHitRates ?? ctx.data.moduleHitRates,
        ];
        for (const seg of segments) {
          if (!isPlainObject(seg)) continue;
          for (const [key, value] of Object.entries(seg)) {
            const n =
              typeof value === "number"
                ? value
                : typeof value === "string"
                  ? Number(value)
                  : NaN;
            if (!Number.isFinite(n) || n < 0 || n > 100) {
              return histFail({
                field: key,
                message: `Segment hit rate invalid for ${key}.`,
                recommendation: "Use 0–100 percentages per segment.",
                actual: value,
              });
            }
          }
        }
        return histPass();
      },
    },
  ];
}
