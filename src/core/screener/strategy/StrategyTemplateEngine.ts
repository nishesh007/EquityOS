/**
 * Institutional Strategy Screener — built-in template presets (Sprint 9D.R5).
 */

import {
  createLeafRule,
  createRuleGroup,
  type StrategyLeafRule,
  type StrategyRuleCategory,
  type StrategyRuleNode,
} from "./StrategyRule";
import { saveTemplate, listTemplates } from "./StrategyLibrary";
import type { StrategyDefinition } from "./StrategyDefinition";

export const BUILTIN_TEMPLATE_IDS = [
  "canslim",
  "momentum",
  "swing-breakout",
  "growth",
  "quality-compounder",
  "deep-value",
  "dividend",
  "turnaround",
  "high-conviction",
  "institutional-buy",
  "ai-top-picks",
  "portfolio-cleanup",
  "watchlist-scan",
] as const;

export type BuiltinTemplateId = (typeof BUILTIN_TEMPLATE_IDS)[number];

let builtinsRegistered = false;

function leaf(
  id: string,
  category: StrategyRuleCategory,
  field: string,
  operator: StrategyLeafRule["operator"],
  value: number | string,
  extras?: { valueTo?: number; label?: string }
): StrategyLeafRule {
  return createLeafRule({
    id,
    category,
    field,
    operator,
    value,
    valueTo: extras?.valueTo,
    label: extras?.label ?? `${field} ${operator} ${String(value)}`,
  });
}

function andGroup(
  id: string,
  label: string,
  children: StrategyRuleNode[]
): StrategyRuleNode {
  return createRuleGroup({ id, logic: "and", children, label });
}

interface BuiltinSpec {
  id: BuiltinTemplateId;
  name: string;
  description: string;
  tags: string[];
  root: StrategyRuleNode;
}

const BUILTIN_SPECS: BuiltinSpec[] = [
  {
    id: "canslim",
    name: "CANSLIM",
    description: "Growth + earnings acceleration with technical leadership",
    tags: ["growth", "momentum", "canslim"],
    root: andGroup("canslim-root", "CANSLIM", [
      leaf("c-rev", "Growth", "revenue_yoy", "gte", 20, {
        label: "Revenue YoY ≥ 20%",
      }),
      leaf("c-eps", "Growth", "eps_growth", "gte", 25, {
        label: "EPS growth ≥ 25%",
      }),
      leaf("c-rsi", "Momentum", "rsi", "between", 50, {
        valueTo: 70,
        label: "RSI 50–70",
      }),
      leaf("c-ema", "Technical", "price_above_ema200", "eq", 1, {
        label: "Price above EMA200",
      }),
      leaf("c-mom", "Momentum", "momentum", "gte", 60, {
        label: "Momentum ≥ 60",
      }),
    ]),
  },
  {
    id: "momentum",
    name: "Momentum",
    description: "Strong relative strength with confirmed trend",
    tags: ["momentum", "technical"],
    root: andGroup("mom-root", "Momentum", [
      leaf("m-mom", "Momentum", "momentum", "gte", 70),
      leaf("m-rsi", "Momentum", "rsi", "between", 55, {
        valueTo: 75,
        label: "RSI 55–75",
      }),
      leaf("m-ema", "Technical", "price_above_ema200", "eq", 1, {
        label: "Price above EMA200",
      }),
      leaf("m-val", "Validation", "validation_score", "gte", 50),
    ]),
  },
  {
    id: "swing-breakout",
    name: "Swing Breakout",
    description: "Breakout setups with volume and momentum confirmation",
    tags: ["swing", "breakout"],
    root: andGroup("swing-root", "Swing Breakout", [
      leaf("s-brk", "Technical", "breakout_score", "gte", 65),
      leaf("s-vol", "Liquidity", "volume_surge", "gte", 1.5),
      leaf("s-rsi", "Momentum", "rsi", "between", 45, {
        valueTo: 70,
        label: "RSI 45–70",
      }),
      leaf("s-mom", "Momentum", "momentum", "gte", 55),
    ]),
  },
  {
    id: "growth",
    name: "Growth",
    description: "High revenue and earnings growth with quality gate",
    tags: ["growth"],
    root: andGroup("growth-root", "Growth", [
      leaf("g-rev", "Growth", "revenue_yoy", "gte", 15),
      leaf("g-eps", "Growth", "eps_growth", "gte", 18),
      leaf("g-roce", "Quality", "roce", "gte", 15),
      leaf("g-qs", "Quality", "quality_score", "gte", 60),
    ]),
  },
  {
    id: "quality-compounder",
    name: "Quality Compounder",
    description: "High ROCE / quality with trust and validation",
    tags: ["quality", "compounder"],
    root: andGroup("qc-root", "Quality Compounder", [
      leaf("q-roce", "Quality", "roce", "gte", 20),
      leaf("q-qs", "Quality", "quality_score", "gte", 75),
      leaf("q-trust", "Trust", "trust_score", "gte", 70),
      leaf("q-val", "Validation", "validation_score", "gte", 65),
    ]),
  },
  {
    id: "deep-value",
    name: "Deep Value",
    description: "Attractive valuation with basic quality floor",
    tags: ["value"],
    root: andGroup("dv-root", "Deep Value", [
      leaf("d-pe", "Value", "pe", "lte", 15),
      leaf("d-pb", "Value", "pb", "lte", 2),
      leaf("d-qs", "Quality", "quality_score", "gte", 40),
      leaf("d-trust", "Trust", "trust_score", "gte", 45),
    ]),
  },
  {
    id: "dividend",
    name: "Dividend",
    description: "Income-focused names with sustainable yield",
    tags: ["income", "dividend"],
    root: andGroup("div-root", "Dividend", [
      leaf("i-yield", "Income", "dividend_yield", "gte", 2),
      leaf("i-payout", "Income", "payout_ratio", "between", 20, {
        valueTo: 70,
        label: "Payout 20–70%",
      }),
      leaf("i-qs", "Quality", "quality_score", "gte", 50),
      leaf("i-trust", "Trust", "trust_score", "gte", 55),
    ]),
  },
  {
    id: "turnaround",
    name: "Turnaround",
    description: "Improving fundamentals from a depressed base",
    tags: ["turnaround"],
    root: andGroup("ta-root", "Turnaround", [
      leaf("t-rev", "Growth", "revenue_yoy", "gte", 10),
      leaf("t-mom", "Momentum", "momentum", "gte", 45),
      leaf("t-rsi", "Momentum", "rsi", "between", 35, {
        valueTo: 60,
        label: "RSI 35–60",
      }),
      leaf("t-val", "Validation", "validation_score", "gte", 40),
    ]),
  },
  {
    id: "high-conviction",
    name: "High Conviction",
    description: "AI conviction with institutional trust gates",
    tags: ["conviction", "ai"],
    root: andGroup("hc-root", "High Conviction", [
      leaf("h-ai", "AI Conviction", "ai_conviction", "gte", 80),
      leaf("h-trust", "Trust", "trust_score", "gte", 75),
      leaf("h-val", "Validation", "validation_score", "gte", 70),
      leaf("h-qs", "Quality", "quality_score", "gte", 65),
    ]),
  },
  {
    id: "institutional-buy",
    name: "Institutional Buy",
    description: "Institutional-grade score profile for buy candidates",
    tags: ["institutional", "buy"],
    root: andGroup("ib-root", "Institutional Buy", [
      leaf("ib-trust", "Trust", "trust_score", "gte", 85),
      leaf("ib-val", "Validation", "validation_score", "gte", 80),
      leaf("ib-ai", "AI Conviction", "ai_conviction", "gte", 75),
      leaf("ib-opp", "Market", "opportunity_score", "gte", 70),
      leaf("ib-qs", "Quality", "quality_score", "gte", 70),
    ]),
  },
  {
    id: "ai-top-picks",
    name: "AI Top Picks",
    description: "Highest AI conviction shortlist with validation",
    tags: ["ai", "picks"],
    root: andGroup("ai-root", "AI Top Picks", [
      leaf("a-ai", "AI Conviction", "ai_conviction", "gte", 85),
      leaf("a-conf", "AI Conviction", "confidence", "gte", 80),
      leaf("a-val", "Validation", "validation_score", "gte", 60),
      leaf("a-mom", "Momentum", "momentum", "gte", 55),
    ]),
  },
  {
    id: "portfolio-cleanup",
    name: "Portfolio Cleanup",
    description: "Flag weakening holdings for review or exit",
    tags: ["portfolio", "risk"],
    root: andGroup("pc-root", "Portfolio Cleanup", [
      leaf("p-trust", "Trust", "trust_score", "lte", 45, {
        label: "Trust ≤ 45",
      }),
      leaf("p-val", "Validation", "validation_score", "lte", 40, {
        label: "Validation ≤ 40",
      }),
      leaf("p-mom", "Momentum", "momentum", "lte", 40, {
        label: "Momentum ≤ 40",
      }),
    ]),
  },
  {
    id: "watchlist-scan",
    name: "Watchlist Scan",
    description: "Watchlist entry-zone and breakout candidates",
    tags: ["watchlist"],
    root: andGroup("ws-root", "Watchlist Scan", [
      leaf("w-opp", "Market", "opportunity_score", "gte", 60),
      leaf("w-mom", "Momentum", "momentum", "gte", 55),
      leaf("w-rsi", "Momentum", "rsi", "between", 40, {
        valueTo: 65,
        label: "RSI 40–65",
      }),
      leaf("w-trust", "Trust", "trust_score", "gte", 50),
    ]),
  },
];

export function registerBuiltinTemplates(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (builtinsRegistered && !options?.force) {
    return {
      registered: 0,
      skipped: listTemplates({ origin: "built-in" }).length,
      total: listTemplates().length,
    };
  }

  let registered = 0;
  let skipped = 0;
  for (const spec of BUILTIN_SPECS) {
    const result = saveTemplate(
      {
        id: spec.id,
        name: spec.name,
        description: spec.description,
        root: spec.root,
        origin: "built-in",
        version: "1.0.0",
        tags: spec.tags,
      },
      { force: options?.force }
    );
    if (result.saved) registered += 1;
    else skipped += 1;
  }
  builtinsRegistered = true;
  return { registered, skipped, total: listTemplates().length };
}

export function getBuiltinTemplates(): StrategyDefinition[] {
  registerBuiltinTemplates();
  return listTemplates({ origin: "built-in" });
}

export function resetBuiltinTemplateFlag(): void {
  builtinsRegistered = false;
}
