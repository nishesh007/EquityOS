/**
 * Strategy Framework utilities — Sprint 11B.3A.
 * Pure helpers for signals, scoring, and config resolution.
 */

import { clamp, round } from "@/lib/engine/utils";
import {
  DEFAULT_STRATEGY_FRAMEWORK_CONFIG,
  type StrategyFrameworkConfig,
} from "./StrategyConstants";
import type {
  StrategyCategory,
  StrategyExecutionContext,
  StrategyMarketInput,
  StrategySignal,
  StrategySignalType,
  StrategyTargets,
  StrategyValidationResult,
} from "./StrategyTypes";

export function resolveStrategyFrameworkConfig(
  partial?: Partial<StrategyFrameworkConfig>
): StrategyFrameworkConfig {
  return {
    ...DEFAULT_STRATEGY_FRAMEWORK_CONFIG,
    ...partial,
    defaultHoldingPeriods: {
      ...DEFAULT_STRATEGY_FRAMEWORK_CONFIG.defaultHoldingPeriods,
      ...partial?.defaultHoldingPeriods,
    },
    qualityWeights: {
      ...DEFAULT_STRATEGY_FRAMEWORK_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
  };
}

export function isFinitePositivePrice(value: number | undefined | null): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isValidMarketInput(input: StrategyMarketInput | null | undefined): boolean {
  if (!input) return false;
  if (!input.symbol || input.symbol.trim().length === 0) return false;
  return isFinitePositivePrice(input.lastPrice);
}

export function defaultHoldingPeriod(
  category: StrategyCategory,
  config: StrategyFrameworkConfig = DEFAULT_STRATEGY_FRAMEWORK_CONFIG
): string {
  return config.defaultHoldingPeriods[category];
}

export function calculateRiskRewardRatio(
  entry: number,
  stopLoss: number,
  target: number,
  config: StrategyFrameworkConfig = DEFAULT_STRATEGY_FRAMEWORK_CONFIG
): number {
  if (
    !isFinitePositivePrice(entry) ||
    !Number.isFinite(stopLoss) ||
    !Number.isFinite(target)
  ) {
    return config.ignoreRiskReward;
  }
  const risk = Math.abs(entry - stopLoss);
  if (risk < config.priceEpsilon) return config.ignoreRiskReward;
  const reward = Math.abs(target - entry);
  return round(reward / risk, 2);
}

export function clampScore(
  value: number,
  config: StrategyFrameworkConfig = DEFAULT_STRATEGY_FRAMEWORK_CONFIG
): number {
  return clamp(round(value, 1), config.scoreFloor, config.scoreCeiling);
}

export function createIgnoreSignal(input: {
  strategyId: string;
  strategyName: string;
  category: StrategyCategory;
  symbol: string;
  reasons: string[];
  warnings?: string[];
  timestamp?: Date;
  metadata?: Record<string, unknown>;
  evidence?: string[];
  tags?: string[];
  marketRegime?: string;
  eligibility?: StrategySignal["eligibility"];
  config?: Partial<StrategyFrameworkConfig>;
}): StrategySignal {
  const config = resolveStrategyFrameworkConfig(input.config);
  return {
    strategyId: input.strategyId,
    strategyName: input.strategyName,
    category: input.category,
    signal: "IGNORE",
    symbol: input.symbol || "UNKNOWN",
    entry: 0,
    stopLoss: 0,
    target1: 0,
    target2: 0,
    finalTarget: 0,
    holdingPeriod: defaultHoldingPeriod(input.category, config),
    confidence: config.ignoreConfidence,
    risk: 0,
    reward: 0,
    riskReward: config.ignoreRiskReward,
    quality: config.ignoreQuality,
    reasons: input.reasons.length > 0 ? input.reasons : ["Strategy returned IGNORE."],
    evidence: input.evidence ?? [],
    tags: input.tags ?? [input.category, "IGNORE"],
    marketRegime: input.marketRegime ?? "Unknown",
    eligibility: input.eligibility ?? {
      eligible: false,
      score: 0,
      reasons: input.reasons,
    },
    warnings: input.warnings ?? [],
    metadata: input.metadata ?? {},
    timestamp: input.timestamp ?? new Date(),
  };
}

export function buildStrategySignal(input: {
  strategyId: string;
  strategyName: string;
  category: StrategyCategory;
  signal: StrategySignalType;
  symbol: string;
  entry: number;
  stopLoss: number;
  targets: StrategyTargets;
  confidence: number;
  riskReward: number;
  quality: number;
  reasons: string[];
  evidence?: string[];
  tags?: string[];
  marketRegime?: string;
  eligibility?: StrategySignal["eligibility"];
  warnings?: string[];
  metadata?: Record<string, unknown>;
  holdingPeriod?: string;
  timestamp?: Date;
  config?: Partial<StrategyFrameworkConfig>;
}): StrategySignal {
  const config = resolveStrategyFrameworkConfig(input.config);
  return {
    strategyId: input.strategyId,
    strategyName: input.strategyName,
    category: input.category,
    signal: input.signal,
    symbol: input.symbol,
    entry: round(input.entry, 4),
    stopLoss: round(input.stopLoss, 4),
    target1: round(input.targets.target1, 4),
    target2: round(input.targets.target2, 4),
    finalTarget: round(input.targets.finalTarget, 4),
    holdingPeriod:
      input.holdingPeriod ?? defaultHoldingPeriod(input.category, config),
    confidence: clampScore(input.confidence, config),
    risk: round(Math.abs(input.entry - input.stopLoss), 4),
    reward: round(Math.abs(input.targets.finalTarget - input.entry), 4),
    riskReward: round(input.riskReward, 2),
    quality: clampScore(input.quality, config),
    reasons: input.reasons,
    evidence: input.evidence ?? [],
    tags: input.tags ?? [input.category, input.signal],
    marketRegime: input.marketRegime ?? "Unknown",
    eligibility: input.eligibility ?? {
      eligible: false,
      score: 0,
      reasons: [],
    },
    warnings: input.warnings ?? [],
    metadata: input.metadata ?? {},
    timestamp: input.timestamp ?? new Date(),
  };
}

export function mergeValidationResults(
  ...results: StrategyValidationResult[]
): StrategyValidationResult {
  const issues = results.flatMap((r) => r.issues);
  const errors = issues
    .filter((i) => i.severity === "error")
    .map((i) => i.message);
  const warnings = issues
    .filter((i) => i.severity === "warning")
    .map((i) => i.message);
  return {
    valid: errors.length === 0,
    issues,
    errors,
    warnings,
  };
}

export function emptyValidationResult(
  valid = true
): StrategyValidationResult {
  return { valid, issues: [], errors: [], warnings: [] };
}

export function isStrategyEligible(
  strategyId: string,
  eligibleStrategies: StrategyExecutionContext["eligibleStrategies"],
  eligibilityId?: string
): boolean {
  const target = eligibilityId ?? strategyId;
  return eligibleStrategies.some(
    (item) => item.strategyId === target && item.eligible
  );
}

export function nowMs(): number {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}
