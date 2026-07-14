/**
 * Trade setup stop loss validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  isFiniteNumber,
  isFinitePositive,
  isPlainObject,
  readNumber,
  readSide,
  readTradeLevels,
  section,
  tsFail,
  tsPass,
  type TradeSetupValidationConfig,
} from "./TradeSetupRuleRegistry";

export function createStopLossValidationRules(
  _config: TradeSetupValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ts.stop.exists",
      name: "Stop Loss Exists",
      description: "Every trade setup must include a stop loss.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "stop-loss"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const { stopLoss } = readTradeLevels(ctx.data);
        if (stopLoss === undefined) {
          return tsFail({
            field: "stopLoss",
            message: "Stop loss is missing.",
            recommendation: "Provide stopLoss / stop.",
            actual: null,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.stop.positive",
      name: "Stop Loss Positive",
      description: "Stop loss must be positive.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "stop-loss"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const { stopLoss } = readTradeLevels(ctx.data);
        if (stopLoss === undefined) return tsPass();
        if (!isFinitePositive(stopLoss)) {
          return tsFail({
            field: "stopLoss",
            message: "Stop loss must be positive.",
            recommendation: "Set stopLoss > 0.",
            expected: "> 0",
            actual: stopLoss,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.stop.finite",
      name: "Stop Loss Finite",
      description: "Stop loss must be finite and not NaN.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "stop-loss"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const { stopLoss } = readTradeLevels(ctx.data);
        if (stopLoss === undefined) return tsPass();
        if (!isFiniteNumber(stopLoss) || Number.isNaN(stopLoss)) {
          return tsFail({
            field: "stopLoss",
            message: "Stop loss is non-finite or NaN.",
            recommendation: "Use a finite numeric stop loss.",
            actual: stopLoss,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.stop.side_alignment",
      name: "Stop Loss Side Alignment",
      description:
        "Stop must be below entry for longs and above entry for shorts.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "stop-loss"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const { entry, stopLoss } = readTradeLevels(ctx.data);
        if (entry === undefined || stopLoss === undefined) return tsPass();
        if (side === "LONG" && stopLoss >= entry) {
          return tsFail({
            field: "stopLoss",
            message: "Stop loss must be below entry for long trades.",
            recommendation: "Place stopLoss < entry for LONG.",
            expected: `< ${entry}`,
            actual: stopLoss,
          });
        }
        if (side === "SHORT" && stopLoss <= entry) {
          return tsFail({
            field: "stopLoss",
            message: "Stop loss must be above entry for short trades.",
            recommendation: "Place stopLoss > entry for SHORT.",
            expected: `> ${entry}`,
            actual: stopLoss,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.stop.not_equal_entry",
      name: "Stop Loss Not Equal Entry",
      description: "Stop loss must not equal entry price.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "stop-loss"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const { entry, stopLoss } = readTradeLevels(ctx.data);
        if (entry === undefined || stopLoss === undefined) return tsPass();
        if (entry === stopLoss) {
          return tsFail({
            field: "stopLoss",
            message: "Stop loss equals entry — zero risk distance.",
            recommendation: "Separate stop from entry by a meaningful distance.",
            expected: "stopLoss !== entry",
            actual: { entry, stopLoss },
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.stop.historical_volatility",
      name: "Stop Inside Historical Volatility",
      description: "Stop distance should be coherent with historical volatility.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "stop-loss", "volatility"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const { entry, stopLoss } = readTradeLevels(ctx.data);
        if (entry === undefined || stopLoss === undefined) return tsPass();
        const hv = readNumber(ctx.data, [
          "historicalVolatility",
          "hv",
          "volatility",
        ]);
        if (hv === undefined) return tsPass();
        const stopPct = (Math.abs(entry - stopLoss) / entry) * 100;
        // Daily HV approx from annualized: / sqrt(252)
        const dailyHv = hv / Math.sqrt(252);
        if (stopPct > dailyHv * 5) {
          return tsFail({
            field: "stopLoss",
            message: "Stop distance far outside historical volatility band.",
            recommendation: "Tighten stop or revisit volatility assumptions.",
            expected: `stopPct roughly within 5x daily HV (~${(dailyHv * 5).toFixed(2)}%)`,
            actual: { stopPct, historicalVolatility: hv },
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.stop.not_in_noise",
      name: "Stop Not Inside Market Noise",
      description: "Stop distance must respect ATR-based noise floor/ceiling.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "stop-loss", "atr"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const { entry, stopLoss } = readTradeLevels(ctx.data);
        if (entry === undefined || stopLoss === undefined) return tsPass();
        const atr = readNumber(ctx.data, ["atr", "averageTrueRange"]);
        if (atr === undefined || atr <= 0) return tsPass();
        const distance = Math.abs(entry - stopLoss);
        const multiple = distance / atr;
        if (multiple < cfg.minStopAtrMultiple) {
          return tsFail({
            field: "stopLoss",
            message: "Stop is inside market noise (ATR).",
            recommendation: `Widen stop to at least ${cfg.minStopAtrMultiple}x ATR.`,
            expected: `>= ${cfg.minStopAtrMultiple}x ATR`,
            actual: { distance, atr, multiple },
          });
        }
        if (multiple > cfg.maxStopAtrMultiple) {
          return tsFail({
            field: "stopLoss",
            message: "Stop is excessively wide vs ATR.",
            recommendation: `Tighten stop to at most ${cfg.maxStopAtrMultiple}x ATR.`,
            expected: `<= ${cfg.maxStopAtrMultiple}x ATR`,
            actual: { distance, atr, multiple },
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.stop.support_resistance",
      name: "Stop Respects Support Resistance",
      description: "Long stop should sit below support; short stop above resistance.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "stop-loss", "support-resistance"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const { stopLoss } = readTradeLevels(ctx.data);
        if (stopLoss === undefined) return tsPass();
        const sr = section(ctx.data, ["supportResistance", "levels"]);
        const support = readNumber(
          { ...ctx.data, ...sr },
          ["support", "supportLevel"]
        );
        const resistance = readNumber(
          { ...ctx.data, ...sr },
          ["resistance", "resistanceLevel"]
        );
        if (side === "LONG" && support !== undefined && stopLoss > support) {
          return tsFail({
            field: "stopLoss",
            message: "Long stop is above support — likely noise stop-out.",
            recommendation: "Place stop below support for LONG setups.",
            expected: `stopLoss <= ${support}`,
            actual: stopLoss,
          });
        }
        if (
          side === "SHORT" &&
          resistance !== undefined &&
          stopLoss < resistance
        ) {
          return tsFail({
            field: "stopLoss",
            message: "Short stop is below resistance — likely noise stop-out.",
            recommendation: "Place stop above resistance for SHORT setups.",
            expected: `stopLoss >= ${resistance}`,
            actual: stopLoss,
          });
        }
        return tsPass();
      },
    },
  ];
}
