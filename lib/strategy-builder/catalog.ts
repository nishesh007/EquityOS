/**
 * Catalog of building-block options for the Strategy Generator.
 */

import type {
  MarketRegime,
  StrategyBuildingBlocks,
  StrategyUniverse,
} from "./types";

export const TECHNICAL_INDICATOR_OPTIONS = [
  "20/50 EMA",
  "50/200 EMA",
  "RSI(14)",
  "RSI(2)",
  "MACD",
  "ATR(14)",
  "Donchian 20",
  "Bollinger 20",
  "ADX(14)",
  "VWAP",
  "52-week high proximity",
  "60-day realized vol",
] as const;

export const FUNDAMENTAL_FILTER_OPTIONS = [
  "EPS growth > 10%",
  "Revenue CAGR ≥ 15%",
  "ROE ≥ 15%",
  "ROE ≥ 18%",
  "Debt/Equity < 1",
  "Positive FCF",
  "Dividend yield ≥ 2.5%",
  "Payout stable 5y",
  "Gross margin stable",
  "Beta ≤ 0.8",
] as const;

export const VALUATION_FILTER_OPTIONS = [
  "PEG ≤ 1.5",
  "P/E < sector median",
  "P/B < 2",
  "FCF yield ≥ 4%",
  "Yield not top 5% trap",
  "Quality premium acceptable",
] as const;

export const VOLUME_FILTER_OPTIONS = [
  "Relative volume ≥ 1.5×",
  "ADV ≥ ₹10 Cr",
  "ADV ≥ ₹5 Cr",
  "ADV ≥ ₹3 Cr",
  "Climax volume day",
  "Spread ≤ 0.5%",
] as const;

export const MOMENTUM_FILTER_OPTIONS = [
  "Price above 50 EMA",
  "Price above 100 DMA",
  "Price > 200 DMA",
  "6-month RS rank top quartile",
  "3-month RS top decile",
  "ADX ≥ 20",
] as const;

export const RISK_RULE_OPTIONS = [
  "Max risk 1% per trade",
  "ATR stop 1.5×",
  "Hard stop 2%",
  "Max 2 concurrent",
  "Chandelier exit 3× ATR",
  "Portfolio DD cap 12%",
  "Max sector weight 25%",
  "Max DD 10%",
  "Max position 3%",
  "Vol target 10%",
  "DD cap 8%",
] as const;

export const EXIT_RULE_OPTIONS = [
  "Target or stop",
  "Trail 2× ATR",
  "Time stop 15 days",
  "Mean touch",
  "Time stop 5 days",
  "MA cross exit",
  "RS rank < 50",
] as const;

export const POSITION_SIZING_OPTIONS = [
  "Volatility-scaled 1% risk",
  "Equal weight 5 slots",
  "Fixed fractional 0.75% risk",
  "Risk parity 1%",
  "Conviction-weighted max 8%",
  "Equal weight 10 slots",
  "Equal weight income sleeve",
  "Barbell core 6–8%",
  "Liquidity-capped 0.8% risk",
  "Inverse-vol weights",
] as const;

export const HOLDING_PERIOD_OPTIONS = [
  "1–5 trading days",
  "5–15 trading days",
  "10–40 days",
  "20–60 trading days",
  "30–120 trading days",
  "60–180 days",
  "90–250 trading days",
  "120–300 days",
  "120–365 days",
  "180–365 days",
] as const;

export const UNIVERSE_OPTIONS: readonly StrategyUniverse[] = [
  "Nifty 50",
  "Nifty 500",
  "Midcap 150",
  "Smallcap 250",
  "Liquid Universe",
] as const;

export const REGIME_OPTIONS: readonly MarketRegime[] = [
  "Any",
  "Bull",
  "Bear",
  "Sideways",
  "High Volatility",
] as const;

export function createDefaultBuildingBlocks(): StrategyBuildingBlocks {
  return {
    technicalIndicators: ["20/50 EMA", "ATR(14)"],
    fundamentalFilters: [],
    valuationFilters: [],
    volumeFilters: ["Relative volume ≥ 1.5×"],
    momentumFilters: ["Price above 50 EMA"],
    riskRules: ["Max risk 1% per trade"],
    exitRules: ["Target or stop", "Trail 2× ATR"],
    positionSizing: "Volatility-scaled 1% risk",
    holdingPeriod: "5–15 trading days",
    universe: "Nifty 500",
    marketRegime: "Bull",
  };
}

export function toggleListItem(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}
