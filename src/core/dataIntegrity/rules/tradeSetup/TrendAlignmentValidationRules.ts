/**
 * Trade setup trend alignment validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  isPlainObject,
  readNumber,
  readSide,
  scoreDirection,
  section,
  tsFail,
  tsPass,
  type TradeSetupValidationConfig,
} from "./TradeSetupRuleRegistry";

function techSource(data: Record<string, unknown>): Record<string, unknown> {
  const nested = section(data, ["technical", "technicals", "indicators", "trend"]);
  return { ...data, ...nested };
}

function opposing(
  side: "LONG" | "SHORT",
  direction: "bullish" | "bearish" | "neutral" | undefined
): boolean {
  if (!direction || direction === "neutral") return false;
  return (
    (side === "LONG" && direction === "bearish") ||
    (side === "SHORT" && direction === "bullish")
  );
}

export function createTrendAlignmentValidationRules(
  _config: TradeSetupValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ts.trend.moving_averages",
      name: "Moving Average Alignment",
      description: "Reject setups against strong MA trend unless allowed.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "trend", "ma"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        if (cfg.allowCounterTrend) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const tech = techSource(ctx.data);
        const ma = scoreDirection(
          tech.movingAverages ?? tech.ma ?? tech.maTrend
        );
        if (opposing(side, ma)) {
          return tsFail({
            field: "movingAverages",
            message: "Setup conflicts with moving average trend.",
            recommendation: "Align side with MA trend or enable allowCounterTrend.",
            expected: side === "LONG" ? "bullish/neutral MA" : "bearish/neutral MA",
            actual: ma,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.trend.macd",
      name: "MACD Alignment",
      description: "Validate MACD direction vs trade side.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "trend", "macd"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        if (cfg.allowCounterTrend) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const tech = techSource(ctx.data);
        const macd = scoreDirection(tech.macd ?? tech.macdSignal);
        if (opposing(side, macd)) {
          return tsFail({
            field: "macd",
            message: "Setup conflicts with MACD.",
            recommendation: "Wait for MACD alignment with trade side.",
            expected: side === "LONG" ? "bullish MACD" : "bearish MACD",
            actual: macd,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.trend.rsi",
      name: "RSI Alignment",
      description: "Flag RSI extremes opposing the trade side.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "trend", "rsi"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const tech = techSource(ctx.data);
        const rsi = readNumber(tech, ["rsi", "rsiValue"]);
        const rsiDir = scoreDirection(tech.rsiTrend ?? tech.rsiSignal);
        if (rsi !== undefined) {
          if (side === "LONG" && rsi > 75) {
            return tsFail({
              field: "rsi",
              message: "Long setup into overbought RSI.",
              recommendation: "Wait for RSI pullback or reduce conviction.",
              expected: "RSI <= 75 for new longs",
              actual: rsi,
            });
          }
          if (side === "SHORT" && rsi < 25) {
            return tsFail({
              field: "rsi",
              message: "Short setup into oversold RSI.",
              recommendation: "Wait for RSI bounce or reduce conviction.",
              expected: "RSI >= 25 for new shorts",
              actual: rsi,
            });
          }
        }
        if (opposing(side, rsiDir)) {
          return tsFail({
            field: "rsi",
            message: "RSI signal conflicts with trade side.",
            recommendation: "Align with RSI or document override.",
            actual: rsiDir,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.trend.adx",
      name: "ADX Trend Strength",
      description: "Reject counter-trend setups when ADX indicates strong trend.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "trend", "adx"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        if (cfg.allowCounterTrend) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const tech = techSource(ctx.data);
        const adx = readNumber(tech, ["adx", "adxValue"]);
        const adxDir = scoreDirection(
          tech.adxDirection ?? tech.adxTrend ?? tech.adx
        );
        if (
          adx !== undefined &&
          adx >= cfg.strongAdxThreshold &&
          opposing(side, adxDir)
        ) {
          return tsFail({
            field: "adx",
            message: "Counter-trend setup against strong ADX trend.",
            recommendation: "Do not fade strong trends unless allowCounterTrend.",
            expected: `aligned side when ADX >= ${cfg.strongAdxThreshold}`,
            actual: { adx, adxDir, side },
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.trend.supertrend",
      name: "Supertrend Alignment",
      description: "Validate Supertrend vs trade side.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "trend", "supertrend"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        if (cfg.allowCounterTrend) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const tech = techSource(ctx.data);
        const st = scoreDirection(tech.supertrend ?? tech.superTrend);
        if (opposing(side, st)) {
          return tsFail({
            field: "supertrend",
            message: "Setup conflicts with Supertrend.",
            recommendation: "Align with Supertrend direction.",
            actual: st,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.trend.vwap",
      name: "VWAP Alignment",
      description: "Validate VWAP bias vs trade side.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "trend", "vwap"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        if (cfg.allowCounterTrend) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const tech = techSource(ctx.data);
        const vwap = scoreDirection(tech.vwap ?? tech.vwapBias);
        if (opposing(side, vwap)) {
          return tsFail({
            field: "vwap",
            message: "Setup conflicts with VWAP bias.",
            recommendation: "Prefer trades on the correct side of VWAP.",
            actual: vwap,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.trend.ichimoku",
      name: "Ichimoku Alignment",
      description: "Validate Ichimoku cloud bias vs trade side.",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "trend", "ichimoku"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        if (cfg.allowCounterTrend) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const tech = techSource(ctx.data);
        const ichi = scoreDirection(tech.ichimoku ?? tech.ichimokuBias);
        if (opposing(side, ichi)) {
          return tsFail({
            field: "ichimoku",
            message: "Setup conflicts with Ichimoku bias.",
            recommendation: "Align with cloud / Ichimoku signal.",
            actual: ichi,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.trend.market_sector",
      name: "Market And Sector Trend",
      description: "Reject setups against strong market/sector trends.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "trend", "market"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        if (cfg.allowCounterTrend) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const market = scoreDirection(
          ctx.data.marketTrend ??
            techSource(ctx.data).marketTrend ??
            section(ctx.data, ["market"]).trend
        );
        const sector = scoreDirection(
          ctx.data.sectorTrend ??
            techSource(ctx.data).sectorTrend ??
            section(ctx.data, ["market", "sector"]).sectorTrend
        );
        if (opposing(side, market) && opposing(side, sector)) {
          return tsFail({
            field: "marketTrend",
            message: "Setup against both market and sector trends.",
            recommendation: "Do not publish counter-trend dual conflict setups.",
            expected: "aligned market/sector trend",
            actual: { side, market, sector },
          });
        }
        if (opposing(side, market) && cfg.mode === "strict") {
          return tsFail({
            field: "marketTrend",
            message: "Setup against strong market trend (strict mode).",
            recommendation: "Align with market trend or use relaxed mode.",
            actual: { side, market },
          });
        }
        return tsPass();
      },
    },
  ];
}
