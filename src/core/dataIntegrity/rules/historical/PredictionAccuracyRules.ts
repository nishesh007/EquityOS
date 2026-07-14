/**
 * Prediction accuracy validation rules.
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

export function createPredictionAccuracyRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.prediction.accuracy_threshold",
      name: "Prediction Accuracy Threshold",
      description: "Overall prediction accuracy must meet configured minimum.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["historical", "prediction"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (!hasMinSample(ctx.data, cfg)) return histPass();
        const m = metricsSection(ctx.data);
        const acc = readNumber({ ...ctx.data, ...m }, [
          "predictionAccuracy",
          "accuracy",
          "directionAccuracy",
        ]);
        if (acc === undefined) {
          return histFail({
            field: "predictionAccuracy",
            message: "Missing prediction accuracy.",
            recommendation: "Provide predictionAccuracy / directionAccuracy.",
            actual: null,
          });
        }
        if (acc < cfg.minPredictionAccuracy) {
          return histFail({
            field: "predictionAccuracy",
            message: "Prediction accuracy below minimum.",
            recommendation: `Raise accuracy to >= ${cfg.minPredictionAccuracy}%.`,
            expected: `>= ${cfg.minPredictionAccuracy}`,
            actual: acc,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.prediction.component_accuracies",
      name: "Component Prediction Accuracies",
      description:
        "Direction, price, target, timing, volatility, and trend accuracy must be sane.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["historical", "prediction"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        const fields = [
          "directionAccuracy",
          "priceAccuracy",
          "targetAccuracy",
          "timingAccuracy",
          "volatilityAccuracy",
          "trendAccuracy",
        ];
        for (const field of fields) {
          const v = readNumber(src, [field]);
          if (v === undefined) continue;
          if (!Number.isFinite(v) || v < 0 || v > 100) {
            return histFail({
              field,
              message: `${field} out of valid 0–100 range.`,
              recommendation: "Use percentage accuracy in 0–100.",
              expected: "0–100",
              actual: v,
            });
          }
        }
        return histPass();
      },
    },
    {
      id: "hist.prediction.falling_accuracy_flag",
      name: "Falling Accuracy Flag",
      description: "Reject when falling accuracy is explicitly flagged.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["historical", "prediction", "decay"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        if (
          ctx.data.fallingAccuracy === true ||
          ctx.data.accuracyDegrading === true
        ) {
          return histFail({
            field: "predictionAccuracy",
            message: "Falling prediction accuracy flagged.",
            recommendation: "Retrain / recalibrate or pause publication.",
            actual: true,
          });
        }
        return histPass();
      },
    },
  ];
}
