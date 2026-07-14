/**
 * Generic oscillator outlier / multi-timeframe validation.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asSeries,
  configFromContext,
  detectFrozenValues,
  isPlainObject,
  readIndicatorNumber,
  readNumber,
  techFail,
  techPass,
  type TechnicalValidationConfig,
} from "./TechnicalRuleRegistry";

export function createOscillatorValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "osc.outliers_frozen",
      name: "Oscillator Outliers And Frozen Values",
      description:
        "Detect impossible jumps, frozen/repeated values, and constant corrupted outputs.",
      category: "INDICATOR",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["technical", "oscillator", "outlier"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const series = asSeries(ctx.data);
        const values = series
          .map((r) =>
            readNumber(r, [
              "value",
              "rsi",
              "stoch",
              "mfi",
              "cci",
              "adx",
              "atr",
            ])
          )
          .filter((v): v is number => v !== undefined);

        if (values.length >= config.frozenRepeatCount) {
          if (detectFrozenValues(values, config.frozenRepeatCount)) {
            return techFail({
              indicator: "Oscillator",
              message: "Frozen/repeated indicator values detected.",
              recommendation:
                "Treat as calculation corruption; recompute from OHLC.",
              actual: values.slice(-config.frozenRepeatCount),
            });
          }
          const allSame = values.every((v) => v === values[0]);
          if (allSame && values.length >= config.frozenRepeatCount) {
            return techFail({
              indicator: "Oscillator",
              message: "Constant indicator output across series.",
              recommendation: "Verify indicator inputs are not flatlined.",
              actual: values[0],
            });
          }
        }
        return techPass();
      },
    },
    {
      id: "osc.multi_timeframe",
      name: "Multi-Timeframe Continuity",
      description:
        "Ensure indicator continuity across supported timeframes (1m–monthly).",
      category: "INDICATOR",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["technical", "multi-timeframe"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        if (!isPlainObject(ctx.data)) return techPass();

        const timeframe =
          ctx.metadata?.timeframe ??
          ctx.metadata?.interval ??
          (ctx.data as Record<string, unknown>).timeframe ??
          (ctx.data as Record<string, unknown>).interval;

        if (timeframe !== undefined && timeframe !== null) {
          let minutes: number | null = null;
          if (typeof timeframe === "number") minutes = timeframe;
          else if (typeof timeframe === "string") {
            const n = timeframe.trim().toUpperCase();
            if (n === "D" || n === "1D" || n === "DAILY") minutes = 1440;
            else if (n === "W" || n === "1W" || n === "WEEKLY") minutes = 10080;
            else if (n === "M" || n === "1M" || n === "MONTHLY" || n === "1MO") {
              minutes = 43200;
            } else {
              const m = n.match(/^(\d+)/);
              if (m) minutes = Number(m[1]);
            }
          }
          if (
            minutes === null ||
            !config.supportedTimeframesMinutes.includes(minutes)
          ) {
            return techFail({
              indicator: "Timeframe",
              message: "Unsupported indicator timeframe.",
              recommendation:
                "Use 1,3,5,10,15,30,60,120,240,daily,weekly,monthly.",
              field: "timeframe",
              expected: config.supportedTimeframesMinutes,
              actual: timeframe,
            });
          }
        }

        const byTf = (ctx.data as Record<string, unknown>).byTimeframe;
        if (isPlainObject(byTf)) {
          const entries = Object.entries(byTf);
          for (const [tf, payload] of entries) {
            if (!isPlainObject(payload)) {
              return techFail({
                indicator: "Timeframe",
                message: `Malformed indicator payload for timeframe ${tf}.`,
                recommendation: "Each timeframe must map to an indicator object.",
                path: `byTimeframe.${tf}`,
                actual: payload,
              });
            }
            const rsi = readIndicatorNumber(payload, ["rsi", "RSI"]);
            if (rsi !== undefined && (rsi < 0 || rsi > 100)) {
              return techFail({
                indicator: "RSI",
                message: `Multi-timeframe RSI invalid on ${tf}.`,
                recommendation: "Recompute RSI per timeframe independently.",
                path: `byTimeframe.${tf}.rsi`,
                actual: rsi,
              });
            }
          }
        }

        return techPass();
      },
    },
  ];
}
