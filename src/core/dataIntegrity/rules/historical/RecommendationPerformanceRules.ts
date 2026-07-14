/**
 * Recommendation historical performance validation rules.
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

export function createRecommendationPerformanceRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.rec.metrics_present",
      name: "Recommendation Performance Metrics Present",
      description: "Historical recommendation metrics must be present.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["historical", "recommendation"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "AI_OUTPUT", "BACKTEST_DATASET"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) {
          return histFail({
            field: "metrics",
            message: "Historical performance payload must be an object.",
            recommendation: "Provide structured historical metrics.",
            actual: typeof ctx.data,
          });
        }
        const m = metricsSection(ctx.data);
        const success = readNumber({ ...ctx.data, ...m }, [
          "successRate",
          "hitRate",
          "overallHitRate",
        ]);
        if (success === undefined && ctx.data.skipRecMetrics !== true) {
          return histFail({
            field: "successRate",
            message: "Missing recommendation success / hit rate.",
            recommendation: "Provide successRate or hitRate.",
            actual: null,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.rec.success_rate",
      name: "Recommendation Success Rate",
      description: "Success rate must meet configured minimum.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["historical", "recommendation"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "AI_OUTPUT", "BACKTEST_DATASET"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (!hasMinSample(ctx.data, cfg)) return histPass();
        const m = metricsSection(ctx.data);
        const success = readNumber({ ...ctx.data, ...m }, [
          "successRate",
          "hitRate",
        ]);
        if (success === undefined) return histPass();
        if (success < cfg.minSuccessRate) {
          return histFail({
            field: "successRate",
            message: "Recommendation success rate below minimum.",
            recommendation: `Improve to >= ${cfg.minSuccessRate}% or pause module.`,
            expected: `>= ${cfg.minSuccessRate}`,
            actual: success,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.rec.failure_rate",
      name: "Recommendation Failure Rate",
      description: "Failure rate must not exceed configured maximum.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["historical", "recommendation"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "AI_OUTPUT", "BACKTEST_DATASET"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (!hasMinSample(ctx.data, cfg)) return histPass();
        const m = metricsSection(ctx.data);
        const failure = readNumber({ ...ctx.data, ...m }, [
          "failureRate",
          "lossRate",
        ]);
        if (failure === undefined) return histPass();
        if (failure > cfg.maxFailureRate) {
          return histFail({
            field: "failureRate",
            message: "Recommendation failure rate exceeds maximum.",
            recommendation: `Reduce failureRate to <= ${cfg.maxFailureRate}%.`,
            expected: `<= ${cfg.maxFailureRate}`,
            actual: failure,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.rec.returns_coherent",
      name: "Recommendation Returns Coherent",
      description: "Average/median returns and max gain/loss must be coherent.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["historical", "recommendation", "returns"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "AI_OUTPUT", "BACKTEST_DATASET"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        const avg = readNumber(src, ["averageReturn", "avgReturn"]);
        const median = readNumber(src, ["medianReturn"]);
        const maxGain = readNumber(src, ["maximumGain", "maxGain"]);
        const maxLoss = readNumber(src, ["maximumLoss", "maxLoss"]);
        if (
          maxGain !== undefined &&
          maxLoss !== undefined &&
          maxGain < maxLoss
        ) {
          return histFail({
            field: "maximumGain",
            message: "Maximum gain is less than maximum loss (incoherent).",
            recommendation: "Verify return series aggregation.",
            expected: "maxGain >= maxLoss",
            actual: { maxGain, maxLoss },
          });
        }
        if (
          avg !== undefined &&
          maxGain !== undefined &&
          avg > maxGain + 1e-6
        ) {
          return histFail({
            field: "averageReturn",
            message: "Average return exceeds maximum gain.",
            recommendation: "Recalculate return statistics.",
            actual: { avg, maxGain },
          });
        }
        if (
          median !== undefined &&
          maxLoss !== undefined &&
          median < maxLoss - 1e-6 &&
          maxLoss < 0
        ) {
          // median below a more negative maxLoss is impossible
          return histFail({
            field: "medianReturn",
            message: "Median return below maximum loss.",
            recommendation: "Recalculate return statistics.",
            actual: { median, maxLoss },
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.rec.action_coverage",
      name: "Recommendation Action Coverage",
      description: "Track Buy/Sell/Hold/Watch/Expired/Cancelled cohorts when provided.",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["historical", "recommendation"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "AI_OUTPUT", "BACKTEST_DATASET"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (cfg.mode !== "strict") return histPass();
        const m = metricsSection(ctx.data);
        const byAction = isPlainObject(m.byAction)
          ? (m.byAction as Record<string, unknown>)
          : isPlainObject(ctx.data.byAction)
            ? (ctx.data.byAction as Record<string, unknown>)
            : undefined;
        if (!byAction) return histPass();
        const needed = ["BUY", "SELL", "HOLD", "WATCH"];
        const missing = needed.filter((a) => !(a in byAction));
        if (missing.length === needed.length) {
          return histFail({
            field: "byAction",
            message: "Action-cohort performance breakdown empty.",
            recommendation: "Provide byAction metrics for BUY/SELL/HOLD/WATCH.",
            actual: byAction,
          });
        }
        return histPass();
      },
    },
  ];
}
