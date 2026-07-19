/**
 * Swing (11B.3L–11B.3T) and Position (11B.3U–11B.3Y) Strategy catalog.
 * Production execution IDs only — no eligibility-only placeholders.
 */

import type { StrategyId } from "@/src/modules/strategyEligibility";

/** Sprint 11B.3L–11B.3T Swing suite. */
export const SWING_STRATEGY_IDS = [
  "vcp",
  "stage-analysis",
  "darvas",
  "relative-strength-leadership",
  "ema-pullback",
  "cup-and-handle",
  "flat-base",
  "fifty-two-week-high",
  "earnings-momentum",
] as const satisfies readonly StrategyId[];

/** Sprint 11B.3U–11B.3Y Position / long-term suite. */
export const POSITION_STRATEGY_IDS = [
  "buffett",
  "graham",
  "lynch",
  "greenblatt",
  "quality-compounder",
] as const satisfies readonly StrategyId[];

export type SwingStrategyId = (typeof SWING_STRATEGY_IDS)[number];
export type PositionStrategyId = (typeof POSITION_STRATEGY_IDS)[number];

export const SWING_POSITION_STRATEGY_IDS = [
  ...SWING_STRATEGY_IDS,
  ...POSITION_STRATEGY_IDS,
] as const;

export function isSwingStrategyId(id: string): id is SwingStrategyId {
  return (SWING_STRATEGY_IDS as readonly string[]).includes(id);
}

export function isPositionStrategyId(id: string): id is PositionStrategyId {
  return (POSITION_STRATEGY_IDS as readonly string[]).includes(id);
}

export function frameworkLabelForStrategy(id: string): {
  technical: boolean;
  fundamental: boolean;
  valuation: boolean;
  growth: boolean;
} {
  if (isPositionStrategyId(id)) {
    return {
      technical: false,
      fundamental: true,
      valuation: true,
      growth: id === "lynch" || id === "quality-compounder",
    };
  }
  return {
    technical: true,
    fundamental: id === "earnings-momentum",
    valuation: false,
    growth: id === "earnings-momentum" || id === "relative-strength-leadership",
  };
}
