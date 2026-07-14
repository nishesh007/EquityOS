/**
 * Momentum indicator validation (ROC, Momentum, CCI, Williams %R, Stochastic, MFI, UO).
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  isPlainObject,
  readIndicatorNumber,
  techFail,
  techPass,
  type TechnicalValidationConfig,
} from "./TechnicalRuleRegistry";

export function createMomentumValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "momentum.oscillators",
      name: "Momentum Oscillators",
      description:
        "Validate ROC, Momentum, CCI, Williams %R, Stochastic, MFI, Ultimate Oscillator.",
      category: "INDICATOR",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["technical", "momentum"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return techPass();
        const config = configFromContext(ctx);

        const checkFinite = (
          indicator: string,
          keys: string[]
        ): ReturnType<typeof techFail> | null => {
          const present = keys.some((k) => k in (ctx.data as object));
          if (!present) return null;
          const value = readIndicatorNumber(ctx.data, keys);
          if (value === undefined || !Number.isFinite(value)) {
            return techFail({
              indicator,
              message: `${indicator} missing or non-finite.`,
              recommendation: `Recompute ${indicator} from price series.`,
              expected: "finite number",
              actual: value ?? null,
            });
          }
          return null;
        };

        for (const [ind, keys] of [
          ["ROC", ["roc", "ROC"]],
          ["Momentum", ["momentum", "mom", "MOM"]],
          ["UltimateOscillator", ["ultimateOscillator", "uo", "UO"]],
        ] as const) {
          const fail = checkFinite(ind, [...keys]);
          if (fail) return fail;
        }

        const cci = readIndicatorNumber(ctx.data, ["cci", "CCI"]);
        if (cci !== undefined) {
          if (!Number.isFinite(cci)) {
            return techFail({
              indicator: "CCI",
              message: "CCI is non-finite.",
              recommendation: "Recompute CCI.",
              actual: cci,
            });
          }
          if (Math.abs(cci) > config.cciAbsWarn) {
            return techFail({
              indicator: "CCI",
              message: "CCI extreme value flagged.",
              recommendation: "Warn only; confirm price shock.",
              expected: `abs(cci) <= ${config.cciAbsWarn}`,
              actual: cci,
            });
          }
        }

        const williams = readIndicatorNumber(ctx.data, [
          "williams",
          "williamsR",
          "willR",
          "WILLR",
        ]);
        if (williams !== undefined) {
          if (
            !Number.isFinite(williams) ||
            williams < config.williamsMin ||
            williams > config.williamsMax
          ) {
            return techFail({
              indicator: "Williams%R",
              message: "Williams %R outside configured bounds.",
              recommendation: "Williams %R must typically be in [-100, 0].",
              expected: { min: config.williamsMin, max: config.williamsMax },
              actual: williams,
            });
          }
        }

        const stoch = readIndicatorNumber(ctx.data, [
          "stochastic",
          "stochK",
          "stoch",
          "k",
        ]);
        const stochD = readIndicatorNumber(ctx.data, ["stochD", "d", "stochasticD"]);
        for (const [name, value] of [
          ["Stochastic%K", stoch],
          ["Stochastic%D", stochD],
        ] as const) {
          if (value === undefined) continue;
          if (
            !Number.isFinite(value) ||
            value < config.stochasticMin ||
            value > config.stochasticMax
          ) {
            return techFail({
              indicator: name,
              message: `${name} outside 0–100.`,
              recommendation: "Recalculate stochastic oscillator.",
              expected: {
                min: config.stochasticMin,
                max: config.stochasticMax,
              },
              actual: value,
            });
          }
        }

        const mfi = readIndicatorNumber(ctx.data, ["mfi", "MFI"]);
        if (mfi !== undefined) {
          if (
            !Number.isFinite(mfi) ||
            mfi < config.mfiMin ||
            mfi > config.mfiMax
          ) {
            return techFail({
              indicator: "MFI",
              message: "MFI outside 0–100.",
              recommendation: "Recalculate Money Flow Index.",
              expected: { min: config.mfiMin, max: config.mfiMax },
              actual: mfi,
            });
          }
        }

        return techPass();
      },
    },
  ];
}
