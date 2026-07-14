/**
 * Volume-based indicator validation (OBV, CMF, A/D, Force Index, VO, EOM).
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  isPlainObject,
  readIndicatorNumber,
  techFail,
  techPass,
  type TechnicalValidationConfig,
} from "./TechnicalRuleRegistry";

export function createVolumeIndicatorValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "volind.finite",
      name: "Volume Indicators Finite",
      description:
        "Validate OBV, CMF, Accumulation/Distribution, Force Index, Volume Oscillator, EOM.",
      category: "VOLUME",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["technical", "volume-indicator"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return techPass();

        const checks: Array<[string, string[]]> = [
          ["OBV", ["obv", "OBV"]],
          ["CMF", ["cmf", "CMF"]],
          ["AD", ["ad", "AD", "accumulationDistribution"]],
          ["ForceIndex", ["forceIndex", "fi", "FI"]],
          ["VolumeOscillator", ["volumeOscillator", "vo", "VO"]],
          ["EOM", ["eom", "EOM", "easeOfMovement"]],
        ];

        for (const [indicator, keys] of checks) {
          const present = keys.some((k) => k in (ctx.data as object));
          if (!present) continue;
          const value = readIndicatorNumber(ctx.data, keys);
          if (value === undefined || !Number.isFinite(value)) {
            return techFail({
              indicator,
              message: `${indicator} is missing or non-finite.`,
              recommendation: `Recompute ${indicator} from price/volume series.`,
              expected: "finite number",
              actual: value ?? null,
            });
          }
        }

        const cmf = readIndicatorNumber(ctx.data, ["cmf", "CMF"]);
        if (cmf !== undefined && (cmf < -1 || cmf > 1)) {
          return techFail({
            indicator: "CMF",
            message: "CMF typically lies within [-1, 1].",
            recommendation: "Verify CMF window and volume inputs.",
            expected: { min: -1, max: 1 },
            actual: cmf,
          });
        }

        return techPass();
      },
    },
  ];
}
