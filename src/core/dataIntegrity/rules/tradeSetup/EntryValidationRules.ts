/**
 * Trade setup entry price validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  hasNonEmptyText,
  isFiniteNumber,
  isFinitePositive,
  isPlainObject,
  readNumber,
  readString,
  readTradeLevels,
  tsFail,
  tsPass,
  type TradeSetupValidationConfig,
} from "./TradeSetupRuleRegistry";

export function createEntryValidationRules(
  _config: TradeSetupValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ts.entry.exists",
      name: "Entry Price Exists",
      description: "Every trade setup must include an entry price.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "entry"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) {
          return tsFail({
            field: "entry",
            message: "Trade setup payload must be an object.",
            recommendation: "Provide a structured trade setup object.",
            actual: typeof ctx.data,
          });
        }
        const { entry } = readTradeLevels(ctx.data);
        if (entry === undefined) {
          return tsFail({
            field: "entry",
            message: "Entry price is missing.",
            recommendation: "Provide entry / entryPrice.",
            actual: null,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.entry.positive",
      name: "Entry Price Positive",
      description: "Entry price must be greater than zero.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "entry"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const { entry } = readTradeLevels(ctx.data);
        if (entry === undefined) return tsPass();
        if (!isFinitePositive(entry)) {
          return tsFail({
            field: "entry",
            message: "Entry price must be positive.",
            recommendation: "Set entry > 0.",
            expected: "> 0",
            actual: entry,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.entry.finite",
      name: "Entry Price Finite",
      description: "Entry price must be finite and not NaN.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "entry"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const { entry } = readTradeLevels(ctx.data);
        if (entry === undefined) return tsPass();
        if (!isFiniteNumber(entry) || Number.isNaN(entry)) {
          return tsFail({
            field: "entry",
            message: "Entry price is non-finite or NaN.",
            recommendation: "Use a finite numeric entry price.",
            actual: entry,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.entry.trading_range",
      name: "Entry Within Trading Range",
      description: "Entry must fall within the provided trading range.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "entry"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const { entry } = readTradeLevels(ctx.data);
        if (entry === undefined) return tsPass();
        const low = readNumber(ctx.data, [
          "tradingRangeLow",
          "dayLow",
          "rangeLow",
          "low",
        ]);
        const high = readNumber(ctx.data, [
          "tradingRangeHigh",
          "dayHigh",
          "rangeHigh",
          "high",
        ]);
        if (low === undefined || high === undefined) return tsPass();
        if (entry < low || entry > high) {
          return tsFail({
            field: "entry",
            message: "Entry is outside the trading range.",
            recommendation: "Place entry between day/range low and high.",
            expected: { low, high },
            actual: entry,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.entry.near_market",
      name: "Entry Near Current Market Price",
      description: "Entry should be near the current market price.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "entry"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const { entry, currentPrice } = readTradeLevels(ctx.data);
        if (entry === undefined || currentPrice === undefined) return tsPass();
        if (!isFinitePositive(currentPrice)) return tsPass();
        const deviation =
          (Math.abs(entry - currentPrice) / currentPrice) * 100;
        if (deviation > cfg.entryNearMarketPercent) {
          return tsFail({
            field: "entry",
            message: "Entry is too far from current market price.",
            recommendation: `Keep entry within ${cfg.entryNearMarketPercent}% of LTP.`,
            expected: `<= ${cfg.entryNearMarketPercent}%`,
            actual: { entry, currentPrice, deviationPct: deviation },
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.entry.circuit_limits",
      name: "Entry Within Circuit Limits",
      description: "Entry must not be outside upper/lower circuit limits.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "entry", "circuit"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const { entry } = readTradeLevels(ctx.data);
        if (entry === undefined) return tsPass();
        const upper = readNumber(ctx.data, [
          "circuitUpper",
          "upperCircuit",
          "uc",
        ]);
        const lower = readNumber(ctx.data, [
          "circuitLower",
          "lowerCircuit",
          "lc",
        ]);
        if (upper !== undefined && entry > upper) {
          return tsFail({
            field: "entry",
            message: "Entry above upper circuit limit.",
            recommendation: "Entry must be <= upper circuit.",
            expected: `<= ${upper}`,
            actual: entry,
          });
        }
        if (lower !== undefined && entry < lower) {
          return tsFail({
            field: "entry",
            message: "Entry below lower circuit limit.",
            recommendation: "Entry must be >= lower circuit.",
            expected: `>= ${lower}`,
            actual: entry,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.entry.timestamp_valid",
      name: "Entry Timestamp Valid",
      description: "Trade setup timestamp must be present and parseable.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "entry", "timestamp"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const ts =
          ctx.data.timestamp ??
          ctx.data.ts ??
          ctx.data.createdAt ??
          ctx.data.entryTimestamp;
        if (ts === undefined || ts === null || ts === "") {
          return tsFail({
            field: "timestamp",
            message: "Trade setup timestamp is missing.",
            recommendation: "Attach ISO timestamp or epoch millis.",
            actual: null,
          });
        }
        if (typeof ts === "number" && !Number.isFinite(ts)) {
          return tsFail({
            field: "timestamp",
            message: "Timestamp is non-finite.",
            recommendation: "Use a valid numeric epoch or ISO string.",
            actual: ts,
          });
        }
        if (typeof ts === "string" && Number.isNaN(Date.parse(ts))) {
          const asNum = Number(ts);
          if (!Number.isFinite(asNum)) {
            return tsFail({
              field: "timestamp",
              message: "Timestamp is not parseable.",
              recommendation: "Use ISO-8601 or epoch millis.",
              actual: ts,
            });
          }
        }
        return tsPass();
      },
    },
    {
      id: "ts.entry.exchange_valid",
      name: "Entry Exchange Valid",
      description: "Trade setup must reference a valid exchange.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "entry", "exchange"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const exchange = readString(ctx.data, [
          "exchange",
          "market",
          "venue",
        ]);
        if (!exchange) {
          return tsFail({
            field: "exchange",
            message: "Exchange is missing.",
            recommendation: "Provide exchange (e.g. NSE, BSE, NYSE, NASDAQ).",
            actual: null,
          });
        }
        const known = [
          "NSE",
          "BSE",
          "NYSE",
          "NASDAQ",
          "AMEX",
          "ARCA",
          "LSE",
          "HKEX",
        ];
        if (!known.includes(exchange.toUpperCase())) {
          return tsFail({
            field: "exchange",
            message: "Unrecognized exchange code.",
            recommendation: `Use a supported exchange: ${known.join(", ")}.`,
            expected: known,
            actual: exchange,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.entry.liquidity_acceptable",
      name: "Entry Liquidity Acceptable",
      description: "Liquidity must meet the configured minimum when provided.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "entry", "liquidity"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const liquidity = readNumber(ctx.data, [
          "liquidity",
          "avgVolume",
          "averageVolume",
          "dollarVolume",
          "turnover",
        ]);
        if (liquidity === undefined) {
          if (cfg.mode === "strict" && !hasNonEmptyText(ctx.data.liquidityNote)) {
            return tsFail({
              field: "liquidity",
              message: "Liquidity not provided in strict mode.",
              recommendation: "Include liquidity / average volume.",
              actual: null,
            });
          }
          return tsPass();
        }
        if (liquidity < cfg.minLiquidity) {
          return tsFail({
            field: "liquidity",
            message: "Liquidity below acceptable threshold.",
            recommendation: `Require liquidity >= ${cfg.minLiquidity}.`,
            expected: `>= ${cfg.minLiquidity}`,
            actual: liquidity,
          });
        }
        return tsPass();
      },
    },
  ];
}
