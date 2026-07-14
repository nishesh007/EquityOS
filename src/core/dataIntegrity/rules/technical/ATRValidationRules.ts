/**
 * ATR validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asSeries,
  configFromContext,
  readIndicatorNumber,
  readNumber,
  techFail,
  techPass,
  type TechnicalValidationConfig,
} from "./TechnicalRuleRegistry";

export function createATRValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "atr.non_negative_finite",
      name: "ATR Non-Negative Finite",
      description: "ATR must be finite and >= 0.",
      category: "INDICATOR",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["technical", "atr"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const atr = readIndicatorNumber(ctx.data, ["atr", "ATR"]);
        if (atr === undefined) {
          const values = asSeries(ctx.data, "atr")
            .map((r) => readNumber(r, ["atr", "ATR", "value"]))
            .filter((v): v is number => v !== undefined);
          for (const v of values) {
            if (!Number.isFinite(v) || v < config.atrMin) {
              return techFail({
                indicator: "ATR",
                message: "ATR series contains invalid values.",
                recommendation: "Recompute ATR; ensure True Range >= 0.",
                expected: `finite >= ${config.atrMin}`,
                actual: v,
              });
            }
          }
          return techPass();
        }
        if (!Number.isFinite(atr) || atr < config.atrMin) {
          return techFail({
            indicator: "ATR",
            message: "ATR is invalid.",
            recommendation: "Reject negative/non-finite ATR.",
            expected: `finite >= ${config.atrMin}`,
            actual: atr,
          });
        }
        return techPass();
      },
    },
    {
      id: "atr.period_spikes",
      name: "ATR Period And Spikes",
      description: "Validate ATR period and unexpected spikes.",
      category: "INDICATOR",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["technical", "atr"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const period = readIndicatorNumber(ctx.data, [
          "period",
          "length",
          "atrPeriod",
        ]);
        if (period !== undefined && !(period > 0)) {
          return techFail({
            indicator: "ATR",
            message: "ATR calculation period is invalid.",
            recommendation: "Use a positive ATR period.",
            field: "period",
            expected: "> 0",
            actual: period,
          });
        }
        const values = asSeries(ctx.data, "atr")
          .map((r) => readNumber(r, ["atr", "ATR", "value"]))
          .filter((v): v is number => v !== undefined);
        if (values.length >= 5) {
          const avg =
            values.slice(0, -1).reduce((a, b) => a + b, 0) /
            (values.length - 1);
          const last = values[values.length - 1];
          if (avg > 0 && last > avg * config.atrSpikeMultiplier) {
            return techFail({
              indicator: "ATR",
              message: "Unexpected ATR spike detected.",
              recommendation: "Confirm OHLC shock or recompute ATR.",
              expected: `<= ${avg * config.atrSpikeMultiplier}`,
              actual: last,
            });
          }
        }
        return techPass();
      },
    },
  ];
}
