import type { OptimizationStrategy } from "./types";

export const OPTIMIZATION_STRATEGIES: readonly OptimizationStrategy[] = [
  {
    id: "swing-breakout",
    name: "Swing Breakout",
    description:
      "Captures multi-day breakouts with volatility-adjusted entries and trailing risk.",
    category: "Trend",
    supportedMarket: "Equities",
  },
  {
    id: "momentum",
    name: "Momentum",
    description:
      "Ranks relative strength leaders and rotates into sustained directional moves.",
    category: "Momentum",
    supportedMarket: "Equities",
  },
  {
    id: "value-investing",
    name: "Value Investing",
    description:
      "Systematic value screen with quality filters and multi-quarter holding bias.",
    category: "Value",
    supportedMarket: "Equities",
  },
  {
    id: "mean-reversion",
    name: "Mean Reversion",
    description:
      "Fades stretched moves toward volume-weighted mean with strict stop discipline.",
    category: "Mean Reversion",
    supportedMarket: "Equities",
  },
  {
    id: "vwap-reversal",
    name: "VWAP Reversal",
    description:
      "Intraday reversion around session VWAP with liquidity and spread gates.",
    category: "Intraday",
    supportedMarket: "Equities",
  },
  {
    id: "opening-range-breakout",
    name: "Opening Range Breakout",
    description:
      "Trades confirmed break of the opening range with time-of-day filters.",
    category: "Intraday",
    supportedMarket: "Equities",
  },
  {
    id: "scalping",
    name: "Scalping",
    description:
      "High-frequency microstructure edge with tight risk and rapid inventory turns.",
    category: "Intraday",
    supportedMarket: "ETFs",
  },
  {
    id: "dividend-strategy",
    name: "Dividend Strategy",
    description:
      "Income-focused rotation across dividend aristocrats with drawdown caps.",
    category: "Income",
    supportedMarket: "Equities",
  },
] as const;

export function getStrategyById(
  id: string | null | undefined
): OptimizationStrategy | null {
  if (!id) return null;
  return OPTIMIZATION_STRATEGIES.find((s) => s.id === id) ?? null;
}
