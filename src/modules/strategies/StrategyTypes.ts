/**
 * Strategy Framework — type contracts (Sprint 11B.3A).
 * Foundation for all EquityOS trading strategies.
 * Does not implement ORB / VWAP / Liquidity Sweep or trade recommendations.
 */

import type {
  InstitutionalMarketContext,
  RiskMode,
} from "@/src/modules/marketContext";
import type {
  MarketRegime,
  RegimeConfidenceAnalysis,
} from "@/src/modules/marketRegime";
import type {
  EligibleStrategy,
  StrategyCategory,
  StrategyId,
} from "@/src/modules/strategyEligibility";
import type { StrategyFrameworkConfig } from "./StrategyConstants";

export type { StrategyCategory, StrategyId };

export type StrategySignalType = "BUY" | "SELL" | "WATCHLIST" | "IGNORE";

export type StrategyLifecycleState =
  | "Created"
  | "Initialized"
  | "Validated"
  | "Analyzed"
  | "SignalGenerated"
  | "Completed"
  | "Disposed";

/**
 * Canonical strategy signal emitted by the Strategy Engine.
 */
export interface StrategySignal {
  strategyId: string;
  strategyName: string;
  category: StrategyCategory;
  signal: StrategySignalType;
  symbol: string;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  holdingPeriod: string;
  confidence: number;
  riskReward: number;
  quality: number;
  reasons: string[];
  warnings: string[];
  metadata: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Market input supplied to a strategy for a single symbol evaluation.
 */
export interface StrategyMarketInput {
  symbol: string;
  lastPrice: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  atr?: number;
  indicators?: Readonly<Record<string, number>>;
}

/**
 * Full execution context passed through the strategy lifecycle.
 */
export interface StrategyExecutionContext {
  input: StrategyMarketInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  riskMode: RiskMode;
  timestamp?: Date;
  config?: Partial<StrategyFrameworkConfig>;
}

/**
 * Price targets package.
 */
export interface StrategyTargets {
  target1: number;
  target2: number;
  finalTarget: number;
}

/**
 * Strategy-local analysis snapshot (extensible per strategy).
 */
export interface StrategyAnalysisResult {
  bias: "Bullish" | "Bearish" | "Neutral";
  score: number;
  notes: string[];
  metrics: Readonly<Record<string, number>>;
}

export interface StrategyValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
}

export interface StrategyValidationResult {
  valid: boolean;
  issues: StrategyValidationIssue[];
  errors: string[];
  warnings: string[];
}

/**
 * Descriptor stored in the Strategy Registry.
 * Instantiation is delegated to `create` — no switch statements.
 */
export interface StrategyRegistration {
  id: string;
  name: string;
  category: StrategyCategory;
  enabled: boolean;
  /** Optional link to eligibility matrix StrategyId. */
  eligibilityId?: StrategyId;
  version?: string;
  description?: string;
  create: () => import("./BaseStrategy").BaseStrategy;
}

export interface StrategyLifecycleSnapshot {
  strategyId: string;
  state: StrategyLifecycleState;
  history: readonly StrategyLifecycleState[];
  updatedAt: Date;
}

export interface StrategyEngineResult {
  signal: StrategySignal;
  validation: StrategyValidationResult;
  lifecycle: StrategyLifecycleSnapshot;
  executionTimeMs: number;
}

export type StrategyEngineOptions = {
  /** Skip eligibility gate (tests only — production should leave false). */
  skipEligibilityCheck?: boolean;
  config?: Partial<StrategyFrameworkConfig>;
};
