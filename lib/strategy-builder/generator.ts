/**
 * Rule-based AI strategy generation (Sprint 11D).
 * Architecture reserved for future LLM adapters via StrategyGenerationContext.llmHints.
 */

import { createDefaultBuildingBlocks } from "./catalog";
import { getTemplateById } from "./templates";
import type {
  BuiltStrategy,
  StrategyBuildingBlocks,
  StrategyGenerationContext,
  StrategyRules,
} from "./types";
import { createStrategyId, nowIso } from "./utils";
import { evaluateStrategyBundle } from "./evaluate";

function mergeBlocks(
  base: StrategyBuildingBlocks,
  patch?: Partial<StrategyBuildingBlocks>
): StrategyBuildingBlocks {
  if (!patch) return { ...base, technicalIndicators: [...base.technicalIndicators], fundamentalFilters: [...base.fundamentalFilters], valuationFilters: [...base.valuationFilters], volumeFilters: [...base.volumeFilters], momentumFilters: [...base.momentumFilters], riskRules: [...base.riskRules], exitRules: [...base.exitRules] };
  return {
    technicalIndicators: patch.technicalIndicators ?? [...base.technicalIndicators],
    fundamentalFilters: patch.fundamentalFilters ?? [...base.fundamentalFilters],
    valuationFilters: patch.valuationFilters ?? [...base.valuationFilters],
    volumeFilters: patch.volumeFilters ?? [...base.volumeFilters],
    momentumFilters: patch.momentumFilters ?? [...base.momentumFilters],
    riskRules: patch.riskRules ?? [...base.riskRules],
    exitRules: patch.exitRules ?? [...base.exitRules],
    positionSizing: patch.positionSizing ?? base.positionSizing,
    holdingPeriod: patch.holdingPeriod ?? base.holdingPeriod,
    universe: patch.universe ?? base.universe,
    marketRegime: patch.marketRegime ?? base.marketRegime,
  };
}

function parseHolding(period: string): { min: number; max: number } {
  const nums = period.match(/\d+/g)?.map(Number) ?? [5, 15];
  const min = nums[0] ?? 5;
  const max = nums[1] ?? min + 10;
  return { min, max };
}

function inferStopTarget(blocks: StrategyBuildingBlocks): {
  stop: number;
  target: number;
  trail: number | null;
  size: number;
} {
  const isMean = blocks.technicalIndicators.some((t) => /RSI\(2\)|Bollinger|VWAP/i.test(t));
  const isIncome = blocks.fundamentalFilters.some((f) => /Dividend/i.test(f));
  const isSmall = blocks.universe === "Smallcap 250";
  if (isMean) return { stop: 2.5, target: 4.5, trail: null, size: 3 };
  if (isIncome) return { stop: 12, target: 20, trail: null, size: 8 };
  if (isSmall) return { stop: 7, target: 16, trail: 8, size: 3 };
  if (blocks.marketRegime === "High Volatility")
    return { stop: 6, target: 12, trail: 7, size: 3 };
  if (blocks.marketRegime === "Bear") return { stop: 5, target: 8, trail: 5, size: 2.5 };
  return { stop: 4, target: 10, trail: 5, size: 5 };
}

/**
 * Compose complete rule set from building blocks (deterministic, no LLM).
 */
export function generateRulesFromBlocks(
  blocks: StrategyBuildingBlocks,
  base?: StrategyRules
): StrategyRules {
  const hold = parseHolding(blocks.holdingPeriod);
  const st = inferStopTarget(blocks);
  const entry: string[] = [];
  if (blocks.technicalIndicators.length)
    entry.push(`Confirm setup via ${blocks.technicalIndicators.slice(0, 2).join(" + ")}`);
  if (blocks.momentumFilters.length)
    entry.push(...blocks.momentumFilters.slice(0, 2));
  if (blocks.volumeFilters.length) entry.push(blocks.volumeFilters[0]!);
  if (blocks.fundamentalFilters.length)
    entry.push(...blocks.fundamentalFilters.slice(0, 2));
  if (blocks.valuationFilters.length) entry.push(blocks.valuationFilters[0]!);
  if (entry.length === 0) entry.push("Price structure break with volume confirmation");

  const exit = [
    ...(blocks.exitRules.length ? blocks.exitRules : ["Target or stop"]),
    `Max hold ${hold.max} days`,
  ];

  const marketFilters = [
    blocks.marketRegime === "Any"
      ? "No hard regime gate"
      : `Prefer ${blocks.marketRegime} regime`,
  ];
  if (blocks.marketRegime === "Sideways")
    marketFilters.push("Avoid strong trend days");

  const liquidityFilters = blocks.volumeFilters.filter((v) =>
    /ADV|Spread|liquidity/i.test(v)
  );
  if (liquidityFilters.length === 0) liquidityFilters.push("ADV ≥ ₹5 Cr");

  const sectorFilters: string[] = [];
  if (blocks.universe === "Smallcap 250")
    sectorFilters.push("Skip illiquid micro names");
  if (blocks.fundamentalFilters.some((f) => /Dividend/i.test(f)))
    sectorFilters.push("Prefer defensive income sectors");

  return {
    entry: base?.entry?.length ? [...base.entry] : entry,
    exit: base?.exit?.length ? [...base.exit] : exit,
    stopLossPct: base?.stopLossPct ?? st.stop,
    targetPct: base?.targetPct ?? st.target,
    trailingStopPct: base?.trailingStopPct !== undefined ? base.trailingStopPct : st.trail,
    positionSizePct: base?.positionSizePct ?? st.size,
    holdingMinDays: base?.holdingMinDays ?? hold.min,
    holdingMaxDays: base?.holdingMaxDays ?? hold.max,
    riskRules:
      blocks.riskRules.length > 0
        ? [...blocks.riskRules]
        : base?.riskRules ?? ["Risk ≤ 1% equity per idea"],
    marketFilters:
      base?.marketFilters?.length ? [...base.marketFilters] : marketFilters,
    sectorFilters:
      base?.sectorFilters?.length ? [...base.sectorFilters] : sectorFilters,
    liquidityFilters:
      base?.liquidityFilters?.length
        ? [...base.liquidityFilters]
        : liquidityFilters,
  };
}

function buildDescription(blocks: StrategyBuildingBlocks, name: string): string {
  const parts = [
    name,
    `universe ${blocks.universe}`,
    `regime ${blocks.marketRegime}`,
    blocks.positionSizing,
    blocks.holdingPeriod,
  ];
  return parts.join(" · ");
}

export function createStrategyFromParts(input: {
  name: string;
  description?: string;
  templateId?: string | null;
  blocks: StrategyBuildingBlocks;
  rules?: StrategyRules;
  tags?: string[];
  source: BuiltStrategy["source"];
  favorite?: boolean;
}): BuiltStrategy {
  const ts = nowIso();
  const rules = input.rules ?? generateRulesFromBlocks(input.blocks);
  const draft: Omit<
    BuiltStrategy,
    "performance" | "scores" | "improvements" | "deployment"
  > = {
    id: createStrategyId(),
    name: input.name.trim() || "Untitled Strategy",
    description: input.description ?? buildDescription(input.blocks, input.name),
    templateId: input.templateId ?? null,
    tags: input.tags ?? [],
    favorite: input.favorite ?? false,
    archived: false,
    createdAt: ts,
    updatedAt: ts,
    blocks: mergeBlocks(input.blocks),
    rules,
    source: input.source,
  };
  return evaluateStrategyBundle(draft);
}

/**
 * Generate one or more complete strategies from context / blocks / template.
 */
export function generateStrategies(
  context: StrategyGenerationContext = {},
  count = 1
): BuiltStrategy[] {
  const template = getTemplateById(context.templateId ?? null);
  const baseBlocks = mergeBlocks(
    template?.blocks ?? createDefaultBuildingBlocks(),
    context.blocks
  );
  const baseRules = template
    ? generateRulesFromBlocks(baseBlocks, template.rules)
    : generateRulesFromBlocks(baseBlocks);

  const n = Math.max(1, Math.min(5, count));
  const out: BuiltStrategy[] = [];
  for (let i = 0; i < n; i += 1) {
    const variantBlocks = mergeBlocks(baseBlocks);
    // Light deterministic variation for multi-generate
    if (i > 0) {
      variantBlocks.riskRules = [
        ...variantBlocks.riskRules,
        i % 2 === 0 ? "Reduce size in high-vol" : "Skip earnings week",
      ];
      if (variantBlocks.volumeFilters.length === 0) {
        variantBlocks.volumeFilters = ["ADV ≥ ₹5 Cr"];
      }
    }
    const nameBase =
      context.nameHint?.trim() ||
      template?.name ||
      "AI Generated Strategy";
    const name = n === 1 ? nameBase : `${nameBase} v${i + 1}`;
    const tags = [
      ...(template?.tags ?? []),
      "ai-generated",
      variantBlocks.marketRegime.toLowerCase().replace(/\s+/g, "-"),
    ];
    out.push(
      createStrategyFromParts({
        name,
        templateId: template?.id ?? null,
        blocks: variantBlocks,
        rules:
          i === 0
            ? baseRules
            : generateRulesFromBlocks(variantBlocks, {
                ...baseRules,
                stopLossPct: roundStop(baseRules.stopLossPct, i),
                targetPct: roundStop(baseRules.targetPct * (1 + i * 0.05), i),
              }),
        tags: Array.from(new Set(tags)),
        source: "generated",
      })
    );
  }
  // Future LLM path: if context.llmHints, adapter can refine rules before evaluate.
  void context.llmHints;
  void context.seed;
  return out;
}

function roundStop(n: number, i: number): number {
  return Math.round((n + i * 0.25) * 100) / 100;
}

export function validateBuildingBlocks(
  blocks: StrategyBuildingBlocks
): { valid: boolean; message?: string } {
  if (!blocks.universe) return { valid: false, message: "Universe is required" };
  if (!blocks.positionSizing.trim())
    return { valid: false, message: "Position sizing is required" };
  if (!blocks.holdingPeriod.trim())
    return { valid: false, message: "Holding period is required" };
  const hasSignal =
    blocks.technicalIndicators.length +
      blocks.fundamentalFilters.length +
      blocks.momentumFilters.length +
      blocks.valuationFilters.length >
    0;
  if (!hasSignal)
    return {
      valid: false,
      message: "Select at least one technical, fundamental, momentum, or valuation filter",
    };
  return { valid: true };
}
