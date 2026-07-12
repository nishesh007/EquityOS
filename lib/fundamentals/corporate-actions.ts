/**
 * Corporate actions engine — dividend, bonus, split, rights, buyback, merger, demerger.
 */

import type { CorporateAction, CorporateActionType } from "@/lib/fundamentals/types";

const ACTION_TEMPLATES: Record<
  CorporateActionType,
  (symbol: string, index: number) => Omit<CorporateAction, "id">
> = {
  Dividend: (symbol, i) => ({
    type: "Dividend",
    date: offsetDate(-30 - i * 45),
    title: "Final dividend announced",
    description: `${symbol} board recommended a final dividend, subject to shareholder approval.`,
    value: `${round(2 + i * 0.5, 1)}% yield`,
  }),
  Bonus: (symbol) => ({
    type: "Bonus",
    date: offsetDate(-120),
    title: "Bonus issue reviewed",
    description: `${symbol} capital allocation committee reviewed shareholder distribution alternatives.`,
    value: "1:1 ratio",
  }),
  Split: (symbol) => ({
    type: "Split",
    date: offsetDate(-180),
    title: "Share split assessment",
    description: `${symbol} board assessed face-value structure and market liquidity.`,
    value: "10:1 split",
  }),
  Rights: (symbol) => ({
    type: "Rights",
    date: offsetDate(-240),
    title: "Rights issue filed",
    description: `${symbol} filed rights issue for expansion capex and working capital.`,
    value: "₹500 Cr",
  }),
  Buyback: (symbol) => ({
    type: "Buyback",
    date: offsetDate(-300),
    title: "Buyback programme approved",
    description: `${symbol} shareholders approved open-market buyback at prevailing prices.`,
    value: "₹2,000 Cr",
  }),
  Merger: (symbol) => ({
    type: "Merger",
    date: offsetDate(-360),
    title: "Merger proposal submitted",
    description: `${symbol} submitted merger proposal to expand capabilities across the value chain.`,
  }),
  Demerger: (symbol) => ({
    type: "Demerger",
    date: offsetDate(-420),
    title: "Demerger under review",
    description: `${symbol} evaluating demerger of non-core business vertical for value unlock.`,
  }),
};

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function generateCorporateActions(
  symbol: string,
  types: CorporateActionType[] = [
    "Dividend",
    "Bonus",
    "Split",
    "Rights",
    "Buyback",
    "Merger",
    "Demerger",
  ]
): CorporateAction[] {
  return types.map((type, index) => ({
    id: `${symbol}-${type.toLowerCase()}-${index}`,
    ...ACTION_TEMPLATES[type](symbol, index),
  }));
}

export function corporateActionToTimelineType(
  type: CorporateActionType
): "Dividend" | "Bonus" | "Split" | "Acquisition" | "Corporate Action" {
  switch (type) {
    case "Dividend":
      return "Dividend";
    case "Bonus":
      return "Bonus";
    case "Split":
      return "Split";
    case "Merger":
    case "Demerger":
      return "Acquisition";
    default:
      return "Corporate Action";
  }
}
