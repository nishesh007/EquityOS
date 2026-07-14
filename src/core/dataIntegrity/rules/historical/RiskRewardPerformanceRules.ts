/**
 * Risk-reward realized performance validation rules.
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

export function createRiskRewardPerformanceRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.rr.average_minimum",
      name: "Average Realized Risk Reward",
      description: "Average realized RR must meet configured minimum.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["historical", "risk-reward"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (!hasMinSample(ctx.data, cfg)) return histPass();
        const m = metricsSection(ctx.data);
        const avg = readNumber({ ...ctx.data, ...m }, [
          "averageRR",
          "avgRiskReward",
          "actualRR",
        ]);
        if (avg === undefined) return histPass();
        if (avg < cfg.minRiskReward) {
          return histFail({
            field: "averageRR",
            message: "Average realized RR below minimum.",
            recommendation: `Improve realized RR to >= ${cfg.minRiskReward}.`,
            expected: `>= ${cfg.minRiskReward}`,
            actual: avg,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.rr.distribution_coherent",
      name: "RR Distribution Coherent",
      description: "Expected/actual/median/best/worst RR must be coherent.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["historical", "risk-reward"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        const best = readNumber(src, ["bestRR", "maxRR"]);
        const worst = readNumber(src, ["worstRR", "minRR"]);
        const median = readNumber(src, ["medianRR"]);
        const avg = readNumber(src, ["averageRR", "avgRiskReward", "actualRR"]);
        if (best !== undefined && worst !== undefined && best < worst) {
          return histFail({
            field: "bestRR",
            message: "Best RR is less than worst RR.",
            recommendation: "Recalculate RR distribution.",
            actual: { best, worst },
          });
        }
        if (
          median !== undefined &&
          best !== undefined &&
          worst !== undefined &&
          (median > best + 1e-6 || median < worst - 1e-6)
        ) {
          return histFail({
            field: "medianRR",
            message: "Median RR outside best/worst bounds.",
            recommendation: "Recalculate RR distribution.",
            actual: { median, best, worst },
          });
        }
        if (
          avg !== undefined &&
          best !== undefined &&
          worst !== undefined &&
          (avg > best + 1e-6 || avg < worst - 1e-6)
        ) {
          return histFail({
            field: "averageRR",
            message: "Average RR outside best/worst bounds.",
            recommendation: "Recalculate RR distribution.",
            actual: { avg, best, worst },
          });
        }
        const expected = readNumber(src, ["expectedRR"]);
        if (
          expected !== undefined &&
          avg !== undefined &&
          expected < 0
        ) {
          return histFail({
            field: "expectedRR",
            message: "Expected RR is negative.",
            recommendation: "Expected RR must be non-negative.",
            actual: expected,
          });
        }
        return histPass();
      },
    },
  ];
}
