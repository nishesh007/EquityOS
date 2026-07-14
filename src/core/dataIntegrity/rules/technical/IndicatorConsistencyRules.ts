/**
 * Indicator historical consistency / corruption checks.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asSeries,
  configFromContext,
  detectFrozenValues,
  maxJump,
  readNumber,
  techFail,
  techPass,
  type TechnicalValidationConfig,
} from "./TechnicalRuleRegistry";

export function createIndicatorConsistencyRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ind.historical_continuity",
      name: "Indicator Historical Continuity",
      description:
        "Detect impossible jumps, repeated values, and calculation corruption in series.",
      category: "INDICATOR",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["technical", "consistency"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR", "HISTORICAL_DATASET"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const series = asSeries(ctx.data);
        const values = series
          .map((r) => readNumber(r, ["value", "rsi", "close", "ema", "sma"]))
          .filter((v): v is number => v !== undefined);

        if (values.length < 2) return techPass();

        for (const v of values) {
          if (!Number.isFinite(v) || Number.isNaN(v)) {
            return techFail({
              indicator: "Series",
              message: "Historical indicator series contains NaN/Infinity.",
              recommendation: "Purge corrupted points and recompute.",
              actual: v,
            });
          }
        }

        if (detectFrozenValues(values, config.frozenRepeatCount)) {
          return techFail({
            indicator: "Series",
            message: "Indicator series frozen — possible calculation corruption.",
            recommendation: "Recompute indicator from source OHLC.",
            actual: values.slice(-config.frozenRepeatCount),
          });
        }

        // Generic jump heuristic relative to median magnitude
        const abs = values.map((v) => Math.abs(v)).sort((a, b) => a - b);
        const median = abs[Math.floor(abs.length / 2)] || 1;
        const jump = maxJump(values);
        if (jump > median * 20 && jump > 50) {
          return techFail({
            indicator: "Series",
            message: "Impossible jump in indicator history.",
            recommendation: "Inspect source candles around the discontinuity.",
            expected: `jump <= ${median * 20}`,
            actual: jump,
          });
        }

        return techPass();
      },
    },
  ];
}
