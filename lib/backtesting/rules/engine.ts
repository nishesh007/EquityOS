/**
 * Sprint 11B.1 — Strategy-independent rule engine.
 */

import type { BacktestRule, BacktestRuleKind } from "@/lib/backtesting/types";

export interface RuleMarketContext {
  symbol: string;
  asOf: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  barIndex?: number;
}

export interface RulePositionContext {
  entryPrice: number;
  entryAt: string;
  shares: number;
  stopLoss?: number | null;
  targets?: readonly number[];
  recommendationAsOf?: string;
  expiresAt?: string;
  maxHoldingMs?: number;
}

export interface RuleEvaluationInput {
  rule: BacktestRule;
  market: RuleMarketContext;
  position?: RulePositionContext;
  recommendation?: {
    action: string;
    entry?: number | null;
    stopLoss?: number | null;
    targets?: readonly number[];
    asOf: string;
  };
}

export interface RuleEvaluationResult {
  ruleId: string;
  kind: BacktestRuleKind;
  triggered: boolean;
  reason: string;
  price?: number;
  targetIndex?: number;
  meta?: Record<string, unknown>;
}

export type RuleEvaluator = (
  input: RuleEvaluationInput
) => RuleEvaluationResult;

function baseResult(
  rule: BacktestRule,
  triggered: boolean,
  reason: string,
  extra?: Partial<RuleEvaluationResult>
): RuleEvaluationResult {
  return {
    ruleId: rule.id,
    kind: rule.kind,
    triggered,
    reason,
    ...extra,
  };
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Entry: price within entry band or at/through configured entry. */
export const evaluateEntryRule: RuleEvaluator = ({ rule, market, recommendation }) => {
  if (rule.enabled === false) {
    return baseResult(rule, false, "Rule disabled");
  }
  const bandBps = num(rule.params.bandBps) ?? 50;
  const entry =
    num(rule.params.entry) ??
    recommendation?.entry ??
    null;
  if (entry == null || entry <= 0) {
    return baseResult(rule, false, "No entry price");
  }
  const tolerance = entry * (bandBps / 10_000);
  const hit =
    market.price >= entry - tolerance && market.price <= entry + tolerance;
  return baseResult(rule, hit, hit ? "Entry band touched" : "Outside entry band", {
    price: market.price,
    meta: { entry, bandBps },
  });
};

/** Exit: generic price >= take-profit or custom exitPrice. */
export const evaluateExitRule: RuleEvaluator = ({ rule, market, position }) => {
  if (rule.enabled === false) {
    return baseResult(rule, false, "Rule disabled");
  }
  const exitPrice = num(rule.params.exitPrice);
  if (exitPrice == null || !position) {
    return baseResult(rule, false, "No exit threshold");
  }
  const hit = market.price >= exitPrice;
  return baseResult(rule, hit, hit ? "Exit price reached" : "Exit not reached", {
    price: market.price,
  });
};

/** Target: first target at or below high/price. */
export const evaluateTargetRule: RuleEvaluator = ({
  rule,
  market,
  position,
  recommendation,
}) => {
  if (rule.enabled === false) {
    return baseResult(rule, false, "Rule disabled");
  }
  const targets =
    (rule.params.targets as number[] | undefined) ??
    position?.targets ??
    recommendation?.targets ??
    [];
  if (!targets.length) {
    return baseResult(rule, false, "No targets configured");
  }
  const ref = market.high ?? market.price;
  const index = targets.findIndex((t) => Number.isFinite(t) && ref >= t);
  const hit = index >= 0;
  return baseResult(rule, hit, hit ? `Target ${index + 1} hit` : "No target hit", {
    price: market.price,
    targetIndex: hit ? index : undefined,
  });
};

/** Stop loss: low/price at or below stop. */
export const evaluateStopLossRule: RuleEvaluator = ({
  rule,
  market,
  position,
  recommendation,
}) => {
  if (rule.enabled === false) {
    return baseResult(rule, false, "Rule disabled");
  }
  const stop =
    num(rule.params.stopLoss) ??
    position?.stopLoss ??
    recommendation?.stopLoss ??
    null;
  if (stop == null) {
    return baseResult(rule, false, "No stop loss configured");
  }
  const ref = market.low ?? market.price;
  const hit = ref <= stop;
  return baseResult(rule, hit, hit ? "Stop loss hit" : "Stop not hit", {
    price: market.price,
    meta: { stop },
  });
};

/** Time exit: holding duration exceeded. */
export const evaluateTimeExitRule: RuleEvaluator = ({ rule, market, position }) => {
  if (rule.enabled === false) {
    return baseResult(rule, false, "Rule disabled");
  }
  if (!position?.entryAt) {
    return baseResult(rule, false, "No open position");
  }
  const maxHoldingMs =
    num(rule.params.maxHoldingMs) ?? position.maxHoldingMs ?? null;
  if (maxHoldingMs == null) {
    return baseResult(rule, false, "No max holding configured");
  }
  const held = new Date(market.asOf).getTime() - new Date(position.entryAt).getTime();
  const hit = Number.isFinite(held) && held >= maxHoldingMs;
  return baseResult(rule, hit, hit ? "Max holding time reached" : "Within holding window", {
    meta: { held, maxHoldingMs },
  });
};

/** Expiry: past recommendation/session expiry timestamp. */
export const evaluateExpiryRule: RuleEvaluator = ({ rule, market, position }) => {
  if (rule.enabled === false) {
    return baseResult(rule, false, "Rule disabled");
  }
  const expiresAt =
    (rule.params.expiresAt as string | undefined) ?? position?.expiresAt;
  if (!expiresAt) {
    return baseResult(rule, false, "No expiry configured");
  }
  const hit = new Date(market.asOf).getTime() >= new Date(expiresAt).getTime();
  return baseResult(rule, hit, hit ? "Expired" : "Not expired", {
    meta: { expiresAt },
  });
};

const EVALUATORS: Record<BacktestRuleKind, RuleEvaluator> = {
  entry: evaluateEntryRule,
  exit: evaluateExitRule,
  target: evaluateTargetRule,
  stop_loss: evaluateStopLossRule,
  time_exit: evaluateTimeExitRule,
  expiry: evaluateExpiryRule,
};

export function evaluateRule(input: RuleEvaluationInput): RuleEvaluationResult {
  const evaluator = EVALUATORS[input.rule.kind];
  return evaluator(input);
}

export function evaluateRules(
  rules: readonly BacktestRule[],
  input: Omit<RuleEvaluationInput, "rule">
): RuleEvaluationResult[] {
  return rules
    .filter((rule) => rule.enabled !== false)
    .map((rule) => evaluateRule({ ...input, rule }));
}

export function firstTriggered(
  results: readonly RuleEvaluationResult[]
): RuleEvaluationResult | null {
  return results.find((result) => result.triggered) ?? null;
}

/** Factory helpers for strategy-independent rule definitions. */
export function createEntryRule(
  id: string,
  params: Record<string, unknown> = {}
): BacktestRule {
  return {
    id,
    kind: "entry",
    name: "Entry Rule",
    description: "Triggers when price enters the configured entry band.",
    params,
    enabled: true,
  };
}

export function createExitRule(
  id: string,
  params: Record<string, unknown> = {}
): BacktestRule {
  return {
    id,
    kind: "exit",
    name: "Exit Rule",
    description: "Triggers when a generic exit price is reached.",
    params,
    enabled: true,
  };
}

export function createTargetRule(
  id: string,
  params: Record<string, unknown> = {}
): BacktestRule {
  return {
    id,
    kind: "target",
    name: "Target Rule",
    description: "Triggers when a profit target is touched.",
    params,
    enabled: true,
  };
}

export function createStopLossRule(
  id: string,
  params: Record<string, unknown> = {}
): BacktestRule {
  return {
    id,
    kind: "stop_loss",
    name: "Stop Loss Rule",
    description: "Triggers when stop loss is breached.",
    params,
    enabled: true,
  };
}

export function createTimeExitRule(
  id: string,
  params: Record<string, unknown> = {}
): BacktestRule {
  return {
    id,
    kind: "time_exit",
    name: "Time Exit Rule",
    description: "Triggers when max holding duration elapses.",
    params,
    enabled: true,
  };
}

export function createExpiryRule(
  id: string,
  params: Record<string, unknown> = {}
): BacktestRule {
  return {
    id,
    kind: "expiry",
    name: "Expiry Rule",
    description: "Triggers when recommendation/session expiry is reached.",
    params,
    enabled: true,
  };
}
