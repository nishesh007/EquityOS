/**
 * Stop loss historical performance validation rules.
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

export function createStopLossValidationRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.stoploss.hit_rate",
      name: "Stop Loss Hit Rate",
      description: "SL hit % must be in valid range.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["historical", "stop-loss"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const sl = readNumber({ ...ctx.data, ...m }, [
          "stopLossHitPercent",
          "slHitRate",
          "stopHitPercent",
        ]);
        if (sl === undefined) return histPass();
        if (!Number.isFinite(sl) || sl < 0 || sl > 100) {
          return histFail({
            field: "stopLossHitPercent",
            message: "Stop loss hit % out of range.",
            recommendation: "Use 0–100 percentage.",
            actual: sl,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.stoploss.average_loss",
      name: "Average Loss On Stop",
      description: "Average loss must not exceed configured maximum.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["historical", "stop-loss"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (!hasMinSample(ctx.data, cfg)) return histPass();
        const m = metricsSection(ctx.data);
        const avgLoss = readNumber({ ...ctx.data, ...m }, [
          "averageLoss",
          "avgLoss",
          "averageStopLoss",
        ]);
        if (avgLoss === undefined) return histPass();
        // Accept either positive magnitude or negative return
        const magnitude = Math.abs(avgLoss);
        if (magnitude > cfg.maxAverageLoss) {
          return histFail({
            field: "averageLoss",
            message: "Average loss exceeds maximum acceptable loss.",
            recommendation: `Keep average loss <= ${cfg.maxAverageLoss}%.`,
            expected: `<= ${cfg.maxAverageLoss}`,
            actual: avgLoss,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.stoploss.false_stopouts",
      name: "False Stop-Out Rate",
      description: "False stop-out rate must stay within configured maximum.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["historical", "stop-loss"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (!hasMinSample(ctx.data, cfg)) return histPass();
        const m = metricsSection(ctx.data);
        const rate = readNumber({ ...ctx.data, ...m }, [
          "falseStopOutRate",
          "falseStopouts",
          "falseStopOutPercent",
        ]);
        if (rate === undefined) return histPass();
        if (rate > cfg.maxFalseStopOutRate) {
          return histFail({
            field: "falseStopOutRate",
            message: "False stop-out rate too high.",
            recommendation: `Reduce noise stops; target <= ${cfg.maxFalseStopOutRate}%.`,
            expected: `<= ${cfg.maxFalseStopOutRate}`,
            actual: rate,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.stoploss.trailing_and_drawdown",
      name: "Trailing Stop And Pre-SL Drawdown",
      description: "Trailing stop effectiveness and avg drawdown before SL must be sane.",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["historical", "stop-loss"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        const trailing = readNumber(src, [
          "trailingStopEffectiveness",
          "trailingStopScore",
        ]);
        if (
          trailing !== undefined &&
          (!Number.isFinite(trailing) || trailing < 0 || trailing > 100)
        ) {
          return histFail({
            field: "trailingStopEffectiveness",
            message: "Trailing stop effectiveness out of range.",
            recommendation: "Use 0–100 effectiveness score.",
            actual: trailing,
          });
        }
        const preSlDd = readNumber(src, [
          "averageDrawdownBeforeSL",
          "avgDrawdownBeforeStop",
        ]);
        if (preSlDd !== undefined && (!Number.isFinite(preSlDd) || preSlDd < 0)) {
          return histFail({
            field: "averageDrawdownBeforeSL",
            message: "Average drawdown before SL must be non-negative.",
            recommendation: "Provide absolute drawdown percentage.",
            actual: preSlDd,
          });
        }
        return histPass();
      },
    },
  ];
}
