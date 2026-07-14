/**
 * VWAP indicator validation rules.
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

export function createVWAPValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "vwap.indicator_valid",
      name: "VWAP Indicator Valid",
      description: "VWAP exists, finite, positive, and near price when present.",
      category: "INDICATOR",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["technical", "vwap"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR", "STOCK_QUOTE", "INTRADAY_CANDLE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return techPass();
        if (!("vwap" in ctx.data) && !("VWAP" in ctx.data)) return techPass();
        const config = configFromContext(ctx);
        const vwap = readIndicatorNumber(ctx.data, ["vwap", "VWAP"]);
        if (vwap === undefined) {
          return techFail({
            indicator: "VWAP",
            message: "VWAP is missing.",
            recommendation: "Compute VWAP from session volume/price.",
            expected: "finite > 0",
            actual: null,
          });
        }
        if (!Number.isFinite(vwap) || !(vwap > 0)) {
          return techFail({
            indicator: "VWAP",
            message: "VWAP must be finite and positive.",
            recommendation: "Reject invalid VWAP before downstream use.",
            expected: "finite > 0",
            actual: vwap,
          });
        }
        const price = readIndicatorNumber(ctx.data, [
          "price",
          "close",
          "ltp",
          "last",
        ]);
        if (price !== undefined && price > 0) {
          const deviation = (Math.abs(vwap - price) / price) * 100;
          if (deviation > config.vwapMaxDeviationFromPricePct) {
            return techFail({
              indicator: "VWAP",
              message: "VWAP outside reasonable range versus price.",
              recommendation: "Verify session VWAP reset and trade tape.",
              expected: `deviation <= ${config.vwapMaxDeviationFromPricePct}%`,
              actual: deviation,
            });
          }
        }
        return techPass();
      },
    },
  ];
}
