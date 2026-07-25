/**
 * Trade level packing + Dynamic Trade Construction adapter.
 *
 * Sprint 9F.1 — category fixed-% templates removed.
 * `buildTradeLevels` now delegates to `constructDynamicTrade`.
 */

import type { OpportunityCategory } from "@/lib/opportunity-engine/types";
import {
  constructDynamicTrade,
  type DynamicTradeConstructionResult,
} from "@/lib/opportunity-engine/dynamic-trade-construction";

export interface TradeLevels {
  entryZone: { low: number; high: number };
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskReward: number;
  timeHorizon?: string;
}

export interface BuildTradeLevelsContext {
  metrics?: Record<string, number | string | null> | null;
  strategyId?: string | null;
  strategyName?: string | null;
  conviction?: number | null;
  confidence?: number | null;
}

/**
 * Build stock-specific trade levels.
 * Category selects methodology class only — never fixed return %.
 */
export function buildTradeLevels(
  price: number,
  side: "Long" | "Short",
  category: OpportunityCategory,
  atrValue: number | null = null,
  context: BuildTradeLevelsContext = {}
): TradeLevels {
  const metrics = {
    ...(context.metrics ?? {}),
  } as Record<string, number | string | null>;
  if (atrValue != null && atrValue > 0 && metrics.atr == null) {
    metrics.atr = atrValue;
  }

  const result = constructDynamicTrade({
    price,
    side,
    category,
    metrics,
    strategyId: context.strategyId,
    strategyName: context.strategyName,
    conviction: context.conviction,
    confidence: context.confidence,
  });

  return toTradeLevels(result);
}

/** Full dynamic construction (preferred when metrics / strategy signal available). */
export function buildDynamicTradeLevels(
  price: number,
  side: "Long" | "Short",
  category: OpportunityCategory,
  context: Parameters<typeof constructDynamicTrade>[0] extends infer T
    ? Omit<T, "price" | "side" | "category">
    : never
): DynamicTradeConstructionResult {
  return constructDynamicTrade({
    price,
    side,
    category,
    ...context,
  });
}

function toTradeLevels(result: DynamicTradeConstructionResult): TradeLevels {
  return {
    entryZone: result.entryZone,
    stopLoss: result.stopLoss,
    target1: result.target1,
    target2: result.target2,
    target3: result.target3,
    riskReward: result.riskReward,
    timeHorizon: result.holdingPeriod,
  };
}
