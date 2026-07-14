/**
 * Trade setup volatility validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  isPlainObject,
  readNumber,
  readTradeLevels,
  section,
  tsFail,
  tsPass,
  type TradeSetupValidationConfig,
} from "./TradeSetupRuleRegistry";

function volSource(data: Record<string, unknown>): Record<string, unknown> {
  const nested = section(data, ["volatility", "risk"]);
  return { ...data, ...nested };
}

export function createVolatilityValidationRules(
  _config: TradeSetupValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ts.volatility.atr",
      name: "ATR Volatility Check",
      description: "Flag excessive ATR relative to price.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "volatility", "atr"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const src = volSource(ctx.data);
        const { entry, currentPrice } = readTradeLevels(ctx.data);
        const atr = readNumber(src, ["atr", "averageTrueRange"]);
        const atrPct =
          readNumber(src, ["atrPercent", "atrPct"]) ??
          (atr !== undefined &&
          (entry ?? currentPrice) !== undefined &&
          (entry ?? currentPrice)! > 0
            ? (atr / (entry ?? currentPrice)!) * 100
            : undefined);
        if (atrPct === undefined) return tsPass();
        if (atrPct > cfg.maxAtrPercent) {
          return tsFail({
            field: "atr",
            message: "Excessive ATR volatility.",
            recommendation: `Require ATR% <= ${cfg.maxAtrPercent} or reduce size.`,
            expected: `<= ${cfg.maxAtrPercent}`,
            actual: atrPct,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.volatility.historical",
      name: "Historical Volatility Check",
      description: "Flag excessive historical volatility.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "volatility"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const src = volSource(ctx.data);
        const hv = readNumber(src, [
          "historicalVolatility",
          "hv",
          "volatility",
        ]);
        if (hv === undefined) return tsPass();
        if (hv > cfg.maxHistoricalVolatility) {
          return tsFail({
            field: "historicalVolatility",
            message: "Historical volatility exceeds acceptable maximum.",
            recommendation: `Defer trade or tighten risk when HV > ${cfg.maxHistoricalVolatility}.`,
            expected: `<= ${cfg.maxHistoricalVolatility}`,
            actual: hv,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.volatility.gap_risk",
      name: "Gap Risk Check",
      description: "Flag excessive gap risk relative to entry.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "volatility", "gap"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const src = volSource(ctx.data);
        const gapRisk = readNumber(src, ["gapRisk", "gapRiskPercent", "gapPct"]);
        if (gapRisk === undefined) return tsPass();
        if (gapRisk > cfg.maxGapRiskPercent) {
          return tsFail({
            field: "gapRisk",
            message: "Gap risk is excessive.",
            recommendation: `Require gap risk <= ${cfg.maxGapRiskPercent}%.`,
            expected: `<= ${cfg.maxGapRiskPercent}`,
            actual: gapRisk,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.volatility.beta",
      name: "Beta Volatility Check",
      description: "Flag elevated beta vs market.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "volatility", "beta"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const src = volSource(ctx.data);
        const beta = readNumber(src, ["beta"]);
        if (beta === undefined) return tsPass();
        if (beta > cfg.maxBeta) {
          return tsFail({
            field: "beta",
            message: "Beta exceeds volatility tolerance.",
            recommendation: `Prefer beta <= ${cfg.maxBeta} or reduce size.`,
            expected: `<= ${cfg.maxBeta}`,
            actual: beta,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.volatility.daily_range",
      name: "Daily Range Check",
      description: "Flag excessive daily range relative to price.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "volatility", "range"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const src = volSource(ctx.data);
        const { entry, currentPrice } = readTradeLevels(ctx.data);
        const price = entry ?? currentPrice;
        const dailyRange = readNumber(src, [
          "dailyRange",
          "dayRange",
          "averageDailyRange",
        ]);
        const dailyRangePct =
          readNumber(src, ["dailyRangePercent", "dayRangePct"]) ??
          (dailyRange !== undefined && price !== undefined && price > 0
            ? (dailyRange / price) * 100
            : undefined);
        if (dailyRangePct === undefined) return tsPass();
        if (dailyRangePct > cfg.maxDailyRangePercent) {
          return tsFail({
            field: "dailyRange",
            message: "Daily range indicates excessive volatility.",
            recommendation: `Require daily range% <= ${cfg.maxDailyRangePercent}.`,
            expected: `<= ${cfg.maxDailyRangePercent}`,
            actual: dailyRangePct,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.volatility.excessive_flag",
      name: "Excessive Volatility Flag",
      description: "Aggregate volatility flag when multiple signals are elevated.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "volatility"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        if (
          ctx.data.excessiveVolatility === true ||
          ctx.data.volatilityExcessive === true
        ) {
          return tsFail({
            field: "volatility",
            message: "Setup explicitly flagged for excessive volatility.",
            recommendation: "Do not publish until volatility normalizes.",
            actual: true,
          });
        }
        return tsPass();
      },
    },
  ];
}
